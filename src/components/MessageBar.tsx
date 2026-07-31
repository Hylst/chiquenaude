import { GameState } from '../types/carrom';
import { getPlayerName } from '../utils/gameLogic';

interface Props {
  gameState: GameState;
  onReset: () => void;
  onHint?: () => void;
}

export default function MessageBar({ gameState, onReset, onHint }: Props) {
  const { message, phase, strikerPower, strikerAngle } = gameState;
  const powerPct = Math.round(strikerPower * 100);
  const angleDeg = Math.round((strikerAngle * 180) / Math.PI);

  if (phase === 'game_over') {
    return (
      <div className="w-full rounded-3xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-4 border-amber-300 p-6 text-center shadow-2xl text-stone-950 select-none animate-bounce">
        <div className="text-3xl sm:text-4xl font-black tracking-tight mb-2 drop-shadow-md">
          {message}
        </div>
        <div className="text-base sm:text-lg font-black tracking-wide opacity-90 mb-4">
          Score Match : {getPlayerName(1, gameState.gameMode)} contre{' '}
          <span className="font-black underline">{gameState.score[1]} pts</span> |{' '}
          {getPlayerName(2, gameState.gameMode)} :{' '}
          <span className="font-black underline">{gameState.score[2]} pts</span>
        </div>
        <button
          onClick={onReset}
          className="px-8 py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-900 text-amber-400 hover:text-amber-300 font-black text-lg uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-xl"
        >
          Rejouer une Manche 🎯
        </button>
      </div>
    );
  }

  const isAi = gameState.currentPlayer === 2 && gameState.gameMode !== '1v1';

  return (
    <div
      className={`w-full rounded-2xl border-2 px-5 py-3.5 flex items-center justify-between gap-4 shadow-xl select-none transition-all ${
        gameState.currentPlayer === 1
          ? 'bg-gradient-to-r from-amber-950/80 via-stone-900 to-stone-900 border-amber-500/50 shadow-amber-500/10'
          : 'bg-gradient-to-r from-purple-950/80 via-stone-900 to-stone-900 border-purple-500/50 shadow-purple-500/10'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-2xl animate-pulse">
          {gameState.currentPlayer === 1 ? '🎯' : isAi ? '🤖' : '🎯'}
        </span>
        <p className="text-base sm:text-lg text-white font-black tracking-tight min-w-0 truncate">
          {message}
        </p>
      </div>

      {phase === 'aiming' && !isAi && onHint && (
        <button
          onClick={onHint}
          className="flex-shrink-0 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-200 font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shadow-lg"
          title="Suggérer un bon coup"
        >
          <span>💡</span> <span className="hidden md:inline">Conseil</span>
        </button>
      )}

      {phase === 'aiming' && !isAi && (
        <div className="flex items-center gap-4 flex-shrink-0 text-xs sm:text-sm font-bold text-stone-400 backdrop-blur bg-stone-950/50 border border-stone-800/80 px-3.5 py-1.5 rounded-xl shadow-inner">
          <span>
            Dose :{' '}
            <span
              className={`font-black ${
                strikerPower < 0.4
                  ? 'text-emerald-400'
                  : strikerPower < 0.75
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {powerPct}%
            </span>
          </span>
          <span className="text-stone-600">|</span>
          <span>
            Angle : <span className="font-black text-white">{angleDeg}°</span>
          </span>
        </div>
      )}

      {phase === 'sliding' && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-amber-400 font-black tracking-wider uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            Palet en Mouvement...
          </span>
        </div>
      )}
    </div>
  );
}
