import { useState, useEffect } from 'react';
import { GameState, GameMode } from '../types/carrom';
import { audioEngine } from '../utils/audio';

interface Props {
  gameState: GameState;
  onReset: () => void;
  onSetGameMode: (mode: GameMode) => void;
}

export default function ScorePanel({ gameState, onReset, onSetGameMode }: Props) {
  const {
    currentPlayer,
    score,
    queenPocketed,
    queenCovered,
    queenOwner,
    discs,
    player1Color,
    player2Color,
    gameMode,
    stats,
  } = gameState;

  const [isMusicOn, setIsMusicOn] = useState(audioEngine.getMusicPlaying());
  const [isMuted, setIsMuted] = useState(audioEngine.getMuted());

  useEffect(() => {
    const handleFirstTouch = () => {
      // If music not started yet, maybe don't force, but let user toggle
    };
    window.addEventListener('click', handleFirstTouch, { once: true });
    return () => window.removeEventListener('click', handleFirstTouch);
  }, []);

  const toggleMusic = () => {
    const playing = audioEngine.toggleMusic();
    setIsMusicOn(playing);
  };

  const toggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const p1Remaining = discs.filter((d) => !d.pocketed && d.color === player1Color).length;
  const p2Remaining = discs.filter((d) => !d.pocketed && d.color === player2Color).length;
  const p1Pocketed = gameState.pocketed[1].length;
  const p2Pocketed = gameState.pocketed[2].length;

  const isP1Turn = currentPlayer === 1 && gameState.phase === 'aiming';
  const isP2Turn = currentPlayer === 2 && gameState.phase === 'aiming';

  return (
    <div className="flex flex-col gap-3 w-full text-stone-200 select-none">
      {/* App Creator High-Impact Premium Badge */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-900/80 border-2 border-amber-500/40 p-3.5 shadow-xl transition-all hover:border-amber-400">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-stone-950 shadow-lg font-black text-xl flex-shrink-0">
            HG
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-black">
              Créateur de l&apos;App
            </div>
            <div className="text-sm font-black tracking-tight text-white truncate">
              Hylst - Geoffroy
            </div>
            <div className="text-[11px] text-amber-200/80 font-medium truncate">
              Développé avec l&apos;aide d&apos;une IA
            </div>
          </div>
        </div>
      </div>

      {/* Game Mode Selector Tabs */}
      <div className="rounded-2xl bg-stone-900/80 backdrop-blur border border-stone-700/80 p-2 shadow-lg flex flex-col gap-2">
        <div className="text-xs font-black text-stone-400 uppercase tracking-wider px-2 pt-1 flex items-center justify-between">
          <span>🎮 Mode de Jeu</span>
          <span className="text-amber-400 font-bold">{gameMode === '1v1' ? '2 Joueurs (Local)' : gameMode === 'ai_easy' ? 'Solo vs IA (Facile)' : 'Solo vs IA (Difficile)'}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onSetGameMode('1v1')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === '1v1'
                ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/25 scale-102 font-black'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            👥 1 vs 1
          </button>
          <button
            onClick={() => onSetGameMode('ai_easy')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === 'ai_easy'
                ? 'bg-purple-500 text-stone-950 shadow-lg shadow-purple-500/25 scale-102 font-black'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            🤖 IA Facile
          </button>
          <button
            onClick={() => onSetGameMode('ai_hard')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === 'ai_hard'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 scale-102 font-black'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            🔥 IA Hard
          </button>
        </div>
      </div>

      {/* Interactive Sound & Ambient Music Premium Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleMusic}
          className={`py-2.5 px-3 rounded-2xl border flex items-center justify-center gap-2 font-black text-xs transition-all ${
            isMusicOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'bg-stone-900/60 text-stone-400 border-stone-700/80 hover:bg-stone-800'
          }`}
        >
          <span className="text-base">{isMusicOn ? '🎵' : '🔇'}</span>
          <span>Musique {isMusicOn ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={toggleMute}
          className={`py-2.5 px-3 rounded-2xl border flex items-center justify-center gap-2 font-black text-xs transition-all ${
            !isMuted
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'bg-stone-900/60 text-stone-400 border-stone-700/80 hover:bg-stone-800'
          }`}
        >
          <span className="text-base">{!isMuted ? '🔊' : '🔈'}</span>
          <span>Effets {!isMuted ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Players Current Match Scorecards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Joueur 1 (Noir) */}
        <div
          className={`relative rounded-2xl p-3.5 border-2 transition-all duration-300 flex flex-col justify-between ${
            currentPlayer === 1
              ? 'border-amber-400 bg-gradient-to-b from-amber-950/50 to-stone-900 shadow-xl shadow-amber-500/15'
              : 'border-stone-800 bg-stone-900/40 opacity-75'
          }`}
        >
          {isP1Turn && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow animate-pulse">
              À VOTRE TOUR
            </div>
          )}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-black text-amber-300 text-sm truncate">Joueur 1</span>
            <div className="w-4 h-4 rounded-full bg-stone-950 border-2 border-stone-400 shadow flex-shrink-0" title="Pions Noirs" />
          </div>

          <div className="flex items-baseline justify-between my-2">
            <span className="text-4xl font-black tracking-tight text-white">{score[1]}</span>
            <span className="text-xs font-bold text-amber-200/80">pts</span>
          </div>

          <div className="border-t border-stone-800/80 pt-2 flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1"><span className="text-emerald-400">●</span> Validés :</span>
              <span className="font-bold">{p1Pocketed}</span>
            </div>
            <div className="flex items-center justify-between text-stone-400">
              <span className="flex items-center gap-1"><span className="text-amber-500">○</span> Restants :</span>
              <span className="font-bold">{p1Remaining}</span>
            </div>
            {stats.currentCombo[1] > 1 && (
              <div className="text-amber-400 font-black text-center animate-bounce mt-1 bg-amber-500/20 rounded py-0.5">
                🔥 COMBO x{stats.currentCombo[1]} !
              </div>
            )}
          </div>
        </div>

        {/* Joueur 2 (Blanc / IA) */}
        <div
          className={`relative rounded-2xl p-3.5 border-2 transition-all duration-300 flex flex-col justify-between ${
            currentPlayer === 2
              ? 'border-purple-400 bg-gradient-to-b from-purple-950/50 to-stone-900 shadow-xl shadow-purple-500/15'
              : 'border-stone-800 bg-stone-900/40 opacity-75'
          }`}
        >
          {isP2Turn && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-400 text-stone-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow animate-pulse">
              {gameMode === '1v1' ? 'À VOTRE TOUR' : 'TOUR DE L&apos;IA'}
            </div>
          )}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-black text-purple-300 text-sm truncate">
              {gameMode === '1v1' ? 'Joueur 2' : gameMode === 'ai_easy' ? 'IA (Facile)' : 'IA (Hard)'}
            </span>
            <div className="w-4 h-4 rounded-full bg-stone-100 border-2 border-stone-300 shadow flex-shrink-0" title="Pions Blancs" />
          </div>

          <div className="flex items-baseline justify-between my-2">
            <span className="text-4xl font-black tracking-tight text-white">{score[2]}</span>
            <span className="text-xs font-bold text-purple-200/80">pts</span>
          </div>

          <div className="border-t border-stone-800/80 pt-2 flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1"><span className="text-emerald-400">●</span> Validés :</span>
              <span className="font-bold">{p2Pocketed}</span>
            </div>
            <div className="flex items-center justify-between text-stone-400">
              <span className="flex items-center gap-1"><span className="text-purple-400">○</span> Restants :</span>
              <span className="font-bold">{p2Remaining}</span>
            </div>
            {stats.currentCombo[2] > 1 && (
              <div className="text-purple-400 font-black text-center animate-bounce mt-1 bg-purple-500/20 rounded py-0.5">
                🔥 COMBO x{stats.currentCombo[2]} !
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queen Interactive Status Banner */}
      <div className="rounded-2xl bg-stone-900/90 border border-stone-700/80 p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-500 text-xl font-black">♛</span>
          <span className="text-sm font-black text-stone-200 uppercase tracking-wide">Statut de la Reine</span>
        </div>
        {!queenPocketed && (
          <p className="text-xs text-stone-400 leading-relaxed">
            Présente sur le plateau. Empochez-la, puis validez-la immédiatement avec l&apos;un de vos pions !
          </p>
        )}
        {queenPocketed && !queenCovered && (
          <div className="rounded-xl bg-yellow-500/15 border border-yellow-500/40 p-2 mt-1 animate-pulse">
            <p className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
              <span>⚠️</span> Empochée ! Validez-la au prochain tir ou elle retourne au centre.
            </p>
          </div>
        )}
        {queenCovered && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-2 mt-1">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span>👑</span> Validée par le Joueur {queenOwner} (+3 pts de bonus en fin de manche).
            </p>
          </div>
        )}
      </div>

      {/* Live Match Stats Accordion / Panel */}
      <div className="rounded-2xl bg-stone-900/60 border border-stone-800 p-3 flex flex-col gap-1.5 text-xs">
        <div className="font-black text-stone-400 uppercase tracking-wider mb-1">📊 Statistiques Actuelles</div>
        <div className="flex items-center justify-between text-stone-300">
          <span>Tirs joués (Manche) :</span>
          <span className="font-bold text-amber-400">{stats.turnsPlayed}</span>
        </div>
        <div className="flex items-center justify-between text-stone-300">
          <span>Max Combo P1 / P2 :</span>
          <span className="font-bold text-amber-400">{stats.maxCombo[1]} <span className="text-stone-600">/</span> {stats.maxCombo[2]}</span>
        </div>
      </div>

      {/* How to play succinct summary */}
      <div className="rounded-2xl bg-stone-900/60 border border-stone-800 p-3 text-xs leading-relaxed text-stone-400 space-y-1">
        <div className="font-black text-stone-300 uppercase tracking-wider mb-1 flex items-center gap-1">
          <span>🎯</span> Règles & Commandes
        </div>
        <div>• <strong>Glissez le curseur</strong> pour déplacer le palet sur votre ligne.</div>
        <div>• <strong>Tirez vers l&apos;arrière</strong> depuis le palet pour viser et doser.</div>
        <div>• <strong>Relâchez</strong> pour déclencher la pichenette !</div>
        <div>• Évitez d&apos;empocher le palet (Pénalité de 1 pion).</div>
      </div>

      {/* New Game Button */}
      <button
        onClick={onReset}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm tracking-wide uppercase transition-all duration-200 active:scale-95 shadow-xl shadow-amber-500/20"
      >
        🔄 Nouvelle Manche
      </button>
    </div>
  );
}
