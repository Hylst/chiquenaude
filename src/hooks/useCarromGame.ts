import { useRef, useState, useCallback, useEffect } from 'react';
import { Disc, GameState, Player, FloatingText, GameMode } from '../types/carrom';
import {
  applyFriction,
  updatePosition,
  resolveWallCollision,
  resolveDiscCollision,
  checkPocket,
  isMoving,
  BOARD_SIZE,
} from '../utils/physics';
import {
  initGameState,
  getStrikerBaseline,
  getStrikerXLimits,
  getPlayerName,
  getOpponent,
  computeAITurn,
} from '../utils/gameLogic';
import { audioEngine } from '../utils/audio';

const BOARD_CENTER = BOARD_SIZE / 2;

export function useCarromGame() {
  const [gameState, setGameState] = useState<GameState>(initGameState);
  const animFrameRef = useRef<number | null>(null);
  const aiTurnTimeoutRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const runPhysicsLoop = useCallback(() => {
    const loop = () => {
      setGameState((prev) => {
        if (prev.phase !== 'sliding') return prev;

        let { discs, striker } = prev;
        const activeDiscs = discs.filter((d) => !d.pocketed);
        const allMoving = [striker, ...activeDiscs];

        // Trigger sounds and separate discs on pass 0
        let updatedAll = allMoving.map((d) => resolveWallCollision(updatePosition(applyFriction(d)), true));

        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < updatedAll.length; i++) {
            for (let j = i + 1; j < updatedAll.length; j++) {
              const [ai, bi] = resolveDiscCollision(updatedAll[i], updatedAll[j], pass === 0);
              updatedAll[i] = ai;
              updatedAll[j] = bi;
            }
          }
        }

        const newStrikerData = updatedAll.find((d) => d.id === 'striker')!;
        const newDiscs = discs.map((d) => {
          if (d.pocketed) return d;
          return updatedAll.find((u) => u.id === d.id) || d;
        });

        // Check pockets
        const pocketedThisTurn: string[] = [];
        let strikerPocketed = false;

        let newStriker = newStrikerData;
        if (checkPocket(newStriker)) {
          strikerPocketed = true;
          audioEngine.playPenalty();
          newStriker = { ...newStriker, vx: 0, vy: 0, pocketed: true };
        }

        let finalDiscs = newDiscs.map((d) => {
          if (d.pocketed) return d;
          if (checkPocket(d)) {
            pocketedThisTurn.push(d.id);
            if (d.color === 'queen') {
              audioEngine.playQueenPocketed();
            } else {
              audioEngine.playPocketed();
            }
            return { ...d, vx: 0, vy: 0, pocketed: true };
          }
          return d;
        });

        // Fade floating texts
        const nextFloating = prev.floatingTexts
          .map((ft) => ({ ...ft, y: ft.y - 0.8 }))
          .filter((ft) => ft.y > 0);

        // Screen shake decay
        const nextShake = Math.max(0, prev.screenShake - 0.5);

        const stillMoving = isMoving([newStriker, ...finalDiscs]);

        if (!stillMoving) {
          return resolveTurn(prev, finalDiscs, newStriker, pocketedThisTurn, strikerPocketed);
        }

        return {
          ...prev,
          discs: finalDiscs,
          striker: newStriker,
          floatingTexts: nextFloating,
          screenShake: nextShake,
        };
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (gameState.phase === 'sliding') {
      runPhysicsLoop();
    } else {
      stopLoop();
    }
    return () => stopLoop();
  }, [gameState.phase, runPhysicsLoop, stopLoop]);

  const triggerFlick = useCallback((angle: number, power: number) => {
    audioEngine.playFlick(power);

    setGameState((prev) => {
      if (prev.phase !== 'aiming') return prev;
      const speed = power * 24; // Extra powerful launch option
      const newStriker: Disc = {
        ...prev.striker,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };

      // Calculate shake
      const initialShake = power > 0.8 ? power * 6 : 0;

      // Update stats
      const newStats = {
        ...prev.stats,
        flicksCount: {
          ...prev.stats.flicksCount,
          [prev.currentPlayer]: prev.stats.flicksCount[prev.currentPlayer] + 1,
        },
      };

      return {
        ...prev,
        striker: newStriker,
        phase: 'sliding',
        message: '⚡ Palet lancé !',
        screenShake: initialShake,
        stats: newStats,
      };
    });
  }, []);

  const flick = useCallback(
    (angle: number, power: number) => {
      triggerFlick(angle, power);
    },
    [triggerFlick]
  );

  const setStrikerPosition = useCallback((x: number) => {
    setGameState((prev) => {
      if (prev.phase !== 'aiming') return prev;
      const { min, max } = getStrikerXLimits();
      const clampedX = Math.max(min, Math.min(max, x));
      const baselineY = getStrikerBaseline(prev.currentPlayer);
      return {
        ...prev,
        strikerX: clampedX,
        striker: { ...prev.striker, x: clampedX, y: baselineY },
      };
    });
  }, []);

  const setAimAngle = useCallback((angle: number) => {
    setGameState((prev) => {
      if (prev.phase !== 'aiming') return prev;
      return { ...prev, strikerAngle: angle };
    });
  }, []);

  const setStrikerPower = useCallback((power: number) => {
    setGameState((prev) => {
      if (prev.phase !== 'aiming') return prev;
      return { ...prev, strikerPower: Math.max(0.1, Math.min(1, power)) };
    });
  }, []);

  const setGameMode = useCallback(
    (mode: GameMode) => {
      stopLoop();
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      setGameState(initGameState(mode));
    },
    [stopLoop]
  );

  const resetGame = useCallback(() => {
    stopLoop();
    if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    setGameState((prev) => initGameState(prev.gameMode));
  }, [stopLoop]);

  // Handle AI Opponent Turn Execution
  useEffect(() => {
    if (
      gameState.phase === 'aiming' &&
      gameState.currentPlayer === 2 &&
      gameState.gameMode !== '1v1'
    ) {
      // It's the AI's turn! Wait a short natural pause, then animate aiming and launch
      aiTurnTimeoutRef.current = window.setTimeout(() => {
        const aiMove = computeAITurn(gameState);

        // First step: position striker
        setStrikerPosition(aiMove.strikerX);
        setAimAngle(aiMove.angle);
        setStrikerPower(aiMove.power);

        // Second step: launch after 600ms
        aiTurnTimeoutRef.current = window.setTimeout(() => {
          triggerFlick(aiMove.angle, aiMove.power);
        }, 700);
      }, 800);
    }

    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    };
  }, [
    gameState.phase,
    gameState.currentPlayer,
    gameState.gameMode,
    gameState,
    setStrikerPosition,
    setAimAngle,
    setStrikerPower,
    triggerFlick,
  ]);

  // Give a hint by simulating AI computation for the current player
  const giveHint = useCallback(() => {
    if (gameState.phase !== 'aiming') return;
    if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

    // Simulate the game state from Player 2 perspective (so AI works).
    // computeAITurn cible toujours state.player2Color : pour le joueur 1, il faut aussi
    // faire correspondre ce champ a sa vraie couleur, sinon l'indice suggere un coup sur
    // les palets de l'adversaire (verifie : sans cette ligne, l'indice du joueur 1 visait
    // la couleur adverse a moins de 3px pres, et jamais la sienne).
    const simulatedState = {
      ...gameState,
      currentPlayer: 2 as const,
      gameMode: 'ai_hard' as const,
      player2Color: gameState.currentPlayer === 1 ? gameState.player1Color : gameState.player2Color,
    };
    const aiSuggestion = computeAITurn(simulatedState);

    // For Player 1: the angle from top baseline must be mirrored
    // AI computes angle from top baseline toward bottom. Player 1 is at bottom, aiming up.
    // So for P1, we need to negate the Y component of the aim direction.
    if (gameState.currentPlayer === 1) {
      // Mirror the angle: an angle pointing down-right from top = should point up-right from bottom
      const mirroredAngle = -aiSuggestion.angle;
      setAimAngle(mirroredAngle);
    } else {
      setAimAngle(aiSuggestion.angle);
    }

    setStrikerPosition(aiSuggestion.strikerX);
    setStrikerPower(aiSuggestion.power);

    // Add a visual hint popup
    setGameState((prev) => ({
      ...prev,
      floatingTexts: [
        ...prev.floatingTexts,
        {
          id: `hint_${Date.now()}`,
          text: '💡 Coup Suggéré !',
          x: BOARD_CENTER,
          y: BOARD_CENTER - 100,
          color: '#60a5fa',
        },
      ],
    }));
  }, [gameState, setStrikerPosition, setAimAngle, setStrikerPower]);

  return {
    gameState,
    flick,
    setStrikerPosition,
    setAimAngle,
    setStrikerPower,
    setGameMode,
    resetGame,
    giveHint,
  };
}

function resolveTurn(
  prev: GameState,
  newDiscs: Disc[],
  newStriker: Disc,
  pocketedThisTurn: string[],
  strikerPocketed: boolean
): GameState {
  const currentPlayer = prev.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  const myColor = currentPlayer === 1 ? prev.player1Color : prev.player2Color;
  const oppColor = currentPlayer === 1 ? prev.player2Color : prev.player1Color;

  const myPocketed = pocketedThisTurn.filter((id) => {
    const d = newDiscs.find((x) => x.id === id);
    return d && d.color === myColor;
  });
  const oppPocketed = pocketedThisTurn.filter((id) => {
    const d = newDiscs.find((x) => x.id === id);
    return d && d.color === oppColor;
  });
  const queenPocketedNow = pocketedThisTurn.some((id) => id === 'queen');

  let queenPocketed = prev.queenPocketed;
  let queenCovered = prev.queenCovered;
  let queenOwner = prev.queenOwner;
  let continuesTurn = false;
  const messages: string[] = [];
  const nextFloating: FloatingText[] = [...prev.floatingTexts];

  let workingDiscs = [...newDiscs];

  // Make floating popup helper
  const addPopup = (txt: string, col: string) => {
    nextFloating.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text: txt,
      x: BOARD_CENTER + (Math.random() - 0.5) * 80,
      y: BOARD_CENTER + (Math.random() - 0.5) * 80,
      color: col,
    });
  };

  // Handle queen pocketing
  if (queenPocketedNow && !queenPocketed) {
    if (myPocketed.length > 0) {
      // Auto-covered in same shot
      queenPocketed = true;
      queenCovered = true;
      queenOwner = currentPlayer;
      messages.push('👑 Reine empochée et confirmée !');
      addPopup('👑 Reine Empochée !', '#ffd700');
    } else if (!strikerPocketed) {
      queenPocketed = true;
      queenCovered = false;
      queenOwner = null;
      messages.push('👑 Reine empochée ! Confirmez au tour suivant.');
      addPopup('👑 À Confirmer !', '#facc15');
    } else {
      workingDiscs = workingDiscs.map((d) =>
        d.id === 'queen'
          ? { ...d, pocketed: false, x: BOARD_CENTER, y: BOARD_CENTER, vx: 0, vy: 0 }
          : d
      );
      messages.push('👑 Reine replacée au centre (palet empoché).');
    }
  } else if (queenPocketed && !queenCovered && myPocketed.length > 0) {
    queenCovered = true;
    queenOwner = currentPlayer;
    messages.push('👑 Reine confirmée !');
    addPopup('👑 Reine Confirmée !', '#4ade80');
  }

  // Handle opponent's pieces pocketed (foul, return them)
  if (oppPocketed.length > 0) {
    workingDiscs = workingDiscs.map((d) => {
      if (oppPocketed.includes(d.id)) {
        return {
          ...d,
          pocketed: false,
          x: BOARD_CENTER + (Math.random() - 0.5) * 40,
          y: BOARD_CENTER + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        };
      }
      return d;
    });
    messages.push("Faute ! Pièce adverse replacée.");
    addPopup('⚠️ Faute !', '#f87171');
  }

  // Handle striker sunk (penalty: return one pocketed piece)
  const newPocketed1 = [...prev.pocketed[1]];
  const newPocketed2 = [...prev.pocketed[2]];

  if (currentPlayer === 1) {
    myPocketed.forEach((id) => {
      if (!newPocketed1.includes(id)) newPocketed1.push(id);
    });
  } else {
    myPocketed.forEach((id) => {
      if (!newPocketed2.includes(id)) newPocketed2.push(id);
    });
  }

  if (strikerPocketed) {
    messages.push('⚠️ Palet empoché ! Pénalité.');
    addPopup('⚠️ Pénalité !', '#f87171');
    const playerPocketList = currentPlayer === 1 ? newPocketed1 : newPocketed2;
    if (playerPocketList.length > 0) {
      const returnId = playerPocketList.pop()!;
      workingDiscs = workingDiscs.map((d) =>
        d.id === returnId
          ? {
              ...d,
              pocketed: false,
              x: BOARD_CENTER + (Math.random() - 0.5) * 50,
              y: BOARD_CENTER + (Math.random() - 0.5) * 50,
              vx: 0,
              vy: 0,
            }
          : d
      );
    }
  }

  // Successful hit popup
  if (myPocketed.length > 0) {
    addPopup(`+${myPocketed.length} 🎯`, myColor === 'black' ? '#fbbf24' : '#c084fc');
  }

  // Determine if current player continues
  if (!strikerPocketed && oppPocketed.length === 0) {
    if (myPocketed.length > 0 || (queenPocketedNow && queenCovered && myPocketed.length > 0)) {
      continuesTurn = true;
    }
  }

  // Stats update
  const newTurnsPlayed = prev.stats.turnsPlayed + 1;
  const newCurrentCombo = { ...prev.stats.currentCombo };
  const newMaxCombo = { ...prev.stats.maxCombo };

  if (continuesTurn) {
    newCurrentCombo[currentPlayer] += myPocketed.length;
    if (newCurrentCombo[currentPlayer] > newMaxCombo[currentPlayer]) {
      newMaxCombo[currentPlayer] = newCurrentCombo[currentPlayer];
    }
  } else {
    newCurrentCombo[currentPlayer] = 0;
  }

  // Check win condition
  const myRemainingOnBoard = workingDiscs.filter(
    (d) => !d.pocketed && d.color === myColor
  ).length;

  let winner: Player | null = null;
  if (myRemainingOnBoard === 0 && queenCovered) {
    winner = currentPlayer;
    audioEngine.playWin();
    // Massive confetti burst for victory!
    const emojis = ['🎉', '🏆', '⭐', '✨', '🎊', '🥇', '🎯', '💫'];
    for (let i = 0; i < 20; i++) {
      nextFloating.push({
        id: `confetti_${Date.now()}_${i}`,
        text: emojis[i % emojis.length],
        x: BOARD_CENTER + (Math.random() - 0.5) * 400,
        y: BOARD_CENTER + 100 + Math.random() * 100,
        color: '#fbbf24',
      });
    }
  }

  // Score update
  const newScore = { ...prev.score };
  if (winner !== null) {
    const opponentPiecesLeft = workingDiscs.filter(
      (d) => !d.pocketed && d.color === oppColor
    ).length;
    newScore[winner] += opponentPiecesLeft + (queenOwner === winner ? 3 : 0);
  }

  // Reset striker position
  const nextPlayer = continuesTurn ? currentPlayer : opponent;
  const baselineY = getStrikerBaseline(nextPlayer);
  const newStrikerReset: Disc = {
    ...newStriker,
    pocketed: false,
    x: BOARD_CENTER,
    y: baselineY,
    vx: 0,
    vy: 0,
  };

  // Final message
  let finalMessage = '';
  if (winner) {
    finalMessage = `🏆 ${getPlayerName(winner, prev.gameMode)} remporte la manche !`;
  } else if (messages.length > 0) {
    finalMessage =
      messages.join(' ') +
      `. À ${getPlayerName(nextPlayer, prev.gameMode)} de jouer${continuesTurn ? ' encore' : ''}.`;
  } else {
    finalMessage = continuesTurn
      ? `${getPlayerName(currentPlayer, prev.gameMode)} marque ! Rejouez.`
      : `À ${getPlayerName(nextPlayer, prev.gameMode)} : visez et lancez !`;
  }

  return {
    ...prev,
    discs: workingDiscs,
    striker: newStrikerReset,
    strikerX: BOARD_CENTER,
    strikerAngle: nextPlayer === 1 ? -Math.PI / 2 : Math.PI / 2,
    currentPlayer: nextPlayer,
    phase: winner ? 'game_over' : 'aiming',
    queenPocketed,
    queenCovered,
    queenOwner,
    winner,
    message: finalMessage,
    pocketed: { 1: newPocketed1, 2: newPocketed2 },
    score: newScore,
    floatingTexts: nextFloating,
    stats: {
      ...prev.stats,
      turnsPlayed: newTurnsPlayed,
      currentCombo: newCurrentCombo,
      maxCombo: newMaxCombo,
    },
  };
}
