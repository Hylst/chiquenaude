import { Disc, GameState, Player, GameMode } from '../types/carrom';
import {
  BOARD_SIZE,
  BOARD_PADDING,
  DISC_RADIUS,
  STRIKER_RADIUS,
  QUEEN_RADIUS,
  POCKETS,
} from './physics';

const CENTER = BOARD_SIZE / 2;

function makeDisc(
  id: string,
  x: number,
  y: number,
  color: Disc['color'],
  radius = DISC_RADIUS
): Disc {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    color,
    pocketed: false,
    mass: color === 'striker' ? 1.4 : 1,
  };
}

export function initGameState(mode: GameMode = '1v1'): GameState {
  const discs: Disc[] = [];

  // Queen at center
  discs.push(makeDisc('queen', CENTER, CENTER, 'queen', QUEEN_RADIUS));

  // Ring of 6 carrom men around queen (alternating black/white)
  const ring1Radius = 40;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const color: Disc['color'] = i % 2 === 0 ? 'black' : 'white';
    discs.push(
      makeDisc(
        `${color}_r1_${i}`,
        CENTER + Math.cos(angle) * ring1Radius,
        CENTER + Math.sin(angle) * ring1Radius,
        color
      )
    );
  }

  // Ring of 12 carrom men (6 black, 6 white)
  const ring2Radius = 80;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12 + Math.PI / 12;
    const color: Disc['color'] = i % 2 === 0 ? 'black' : 'white';
    discs.push(
      makeDisc(
        `${color}_r2_${i}`,
        CENTER + Math.cos(angle) * ring2Radius,
        CENTER + Math.sin(angle) * ring2Radius,
        color
      )
    );
  }

  const strikerY = BOARD_SIZE - BOARD_PADDING - 36;
  const striker = makeDisc('striker', CENTER, strikerY, 'striker', STRIKER_RADIUS);
  striker.mass = 1.4;

  return {
    gameMode: mode,
    discs,
    striker,
    currentPlayer: 1,
    phase: 'aiming',
    player1Color: 'black',
    player2Color: 'white',
    score: { 1: 0, 2: 0 },
    pocketed: { 1: [], 2: [] },
    queenPocketed: false,
    queenCovered: false,
    queenOwner: null,
    message: "Tour du Joueur 1 : visez et lancez le palet !",
    winner: null,
    strikerAngle: -Math.PI / 2,
    strikerPower: 0.5,
    strikerX: CENTER,
    consecutiveTurns: { 1: 0, 2: 0 },
    floatingTexts: [],
    screenShake: 0,
    stats: {
      turnsPlayed: 0,
      flicksCount: { 1: 0, 2: 0 },
      maxCombo: { 1: 0, 2: 0 },
      currentCombo: { 1: 0, 2: 0 },
    },
  };
}

export function getStrikerBaseline(player: Player): number {
  const inner = BOARD_PADDING;
  const outer = BOARD_SIZE - BOARD_PADDING;
  if (player === 1) {
    return outer - 36;
  } else {
    return inner + 36;
  }
}

export function getStrikerXLimits(): { min: number; max: number } {
  const inner = BOARD_PADDING;
  const outer = BOARD_SIZE - BOARD_PADDING;
  return { min: inner + 60, max: outer - 60 };
}

export function getPlayerName(player: Player, mode: GameMode): string {
  if (player === 2 && mode !== '1v1') {
    return mode === 'ai_easy' ? 'IA (Facile)' : 'IA (Difficile)';
  }
  return `Joueur ${player}`;
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function countDiscs(
  discs: Disc[],
  color: 'black' | 'white'
): number {
  return discs.filter((d) => d.color === color && !d.pocketed).length;
}

// --- AI Logic ---

export function computeAITurn(state: GameState): {
  angle: number;
  power: number;
  strikerX: number;
} {
  const aiColor = state.player2Color;
  const baselineY = getStrikerBaseline(2); // Top baseline (around Y = 88)
  const { min: xMin, max: xMax } = getStrikerXLimits();

  // Find candidate targets: AI pieces, or Queen if available
  let targetDiscs = state.discs.filter(
    (d) => !d.pocketed && (d.color === aiColor || (d.color === 'queen' && !state.queenPocketed))
  );

  if (targetDiscs.length === 0) {
    // If no own pieces but game still going, maybe just hit anything or queen
    targetDiscs = state.discs.filter((d) => !d.pocketed);
  }

  if (targetDiscs.length === 0) {
    return { angle: Math.PI / 2, power: 0.5, strikerX: CENTER };
  }

  // We want to find a shot that hits a target disc towards one of the bottom pockets (since P2 is at the top)
  const bottomPockets = POCKETS.filter((p) => p.y > CENTER);

  interface ShotOption {
    target: Disc;
    pocket: { x: number; y: number };
    strikerX: number;
    angle: number;
    score: number;
  }

  const options: ShotOption[] = [];

  for (const target of targetDiscs) {
    for (const pocket of bottomPockets) {
      // Vector from piece to pocket
      const px = pocket.x - target.x;
      const py = pocket.y - target.y;
      const pDist = Math.sqrt(px * px + py * py);

      if (pDist < 1) continue;

      // Desired impact point on the target disc (opposite side of the pocket)
      const hitRadius = target.radius + STRIKER_RADIUS;
      const impactX = target.x - (px / pDist) * hitRadius;
      const impactY = target.y - (py / pDist) * hitRadius;

      // The AI starts at baselineY. Can we draw a straight line from (strikerX, baselineY) to (impactX, impactY)?
      // For P2 (top), impactY must be > baselineY for a direct forward shot.
      if (impactY <= baselineY + 10) continue;

      // Calculate the required strikerX
      
      // Exact vector from (strikerX, baselineY) to (impactX, impactY) must align with the normal or direct hit
      // Let's compute simpler: just line up strikerX directly with the impact point if possible, or raycast
      // Since striker moves horizontally at baselineY:
      // impactX = strikerX + vx*t, impactY = baselineY + vy*t
      // Let's test a few strikerX positions to see which gives the cleanest cut angle
      const steps = 15;
      for (let i = 0; i <= steps; i++) {
        const sX = xMin + (i / steps) * (xMax - xMin);

        const vX = impactX - sX;
        const vY = impactY - baselineY;
        const vDist = Math.sqrt(vX * vX + vY * vY);

        const shotAngle = Math.atan2(vY, vX);

        // Score this shot: favor shorter total distance, more direct hit (small cut angle)
        // Dot product between striker-to-target and target-to-pocket
        const dot = ((vX / vDist) * px + (vY / vDist) * py) / pDist;
        
        if (dot > 0.4) {
          options.push({
            target,
            pocket,
            strikerX: sX,
            angle: shotAngle,
            score: dot * 100 - vDist * 0.1 - pDist * 0.1 + (target.color === 'queen' ? 30 : 0),
          });
        }
      }
    }
  }

  // Sort options by score
  options.sort((a, b) => b.score - a.score);

  let chosen: ShotOption | null = options.length > 0 ? options[0] : null;

  if (!chosen) {
    // Fallback: pick random target piece and aim directly at it
    const t = targetDiscs[Math.floor(Math.random() * targetDiscs.length)];
    const sX = Math.max(xMin, Math.min(xMax, t.x + (Math.random() - 0.5) * 40));
    const angle = Math.atan2(t.y - baselineY, t.x - sX);
    return { angle, power: 0.65, strikerX: sX };
  }

  // Add difficulty-based variation
  let finalAngle = chosen.angle;
  let finalPower = 0.65 + Math.random() * 0.2;

  if (state.gameMode === 'ai_easy') {
    // Introduce an error margin
    finalAngle += (Math.random() - 0.5) * 0.18;
    finalPower = 0.5 + Math.random() * 0.3;
  } else {
    // ai_hard: tiny variation
    finalAngle += (Math.random() - 0.5) * 0.04;
  }

  return {
    angle: finalAngle,
    power: finalPower,
    strikerX: chosen.strikerX,
  };
}
