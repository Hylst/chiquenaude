import { useState, useEffect } from 'react';
import CarromBoard from './components/CarromBoard';
import ScorePanel from './components/ScorePanel';
import MessageBar from './components/MessageBar';
import FullscreenButton from './components/FullscreenButton';
import { useFullscreen } from './hooks/useFullscreen';
import { useCarromGame } from './hooks/useCarromGame';

export default function App() {
  const {
    gameState,
    flick,
    setStrikerPosition,
    setAimAngle,
    setStrikerPower,
    setGameMode,
    resetGame,
    giveHint,
  } = useCarromGame();

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Keyboard shortcuts for accessibility & quick play
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showRulesModal) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          toggleFullscreen();
          break;
        case 'r':
          resetGame();
          break;
        case 'h':
          giveHint();
          break;
        case 'arrowleft':
          setAimAngle(gameState.strikerAngle - 0.05);
          break;
        case 'arrowright':
          setAimAngle(gameState.strikerAngle + 0.05);
          break;
        case 'arrowup':
          setStrikerPower(Math.min(1, gameState.strikerPower + 0.05));
          break;
        case 'arrowdown':
          setStrikerPower(Math.max(0.1, gameState.strikerPower - 0.05));
          break;
        case ' ':
        case 'enter':
          e.preventDefault();
          if (gameState.phase === 'aiming' && !(gameState.currentPlayer === 2 && gameState.gameMode !== '1v1')) {
            flick(gameState.strikerAngle, gameState.strikerPower);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    showRulesModal, toggleFullscreen, resetGame, giveHint, flick,
    setAimAngle, setStrikerPower, gameState,
  ]);

  // Immersive Fullscreen Layout: board takes full height, side panel slides as an overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center p-4 gap-3 overflow-hidden">
        {/* Top Bar */}
        <div className="w-full max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg text-stone-950 text-xl font-black">
              🎯
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
              Chiquenaude
            </h1>
            <span className="text-stone-600 text-xs hidden md:inline">• Hylst - Geoffroy</span>
          </div>
          <FullscreenButton floating={false} />
        </div>

        {/* Main Arena */}
        <div className="flex-1 w-full max-w-7xl flex items-center justify-center gap-4 min-h-0">
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0 h-full">
            <div className="w-full">
              <MessageBar gameState={gameState} onReset={resetGame} onHint={giveHint} />
            </div>
            <div className="flex-1 flex items-center justify-center w-full min-h-0" style={{ aspectRatio: '1' }}>
              <div style={{ maxWidth: 'min(100%, calc(100vh - 220px))', width: '100%' }}>
                <CarromBoard
                  gameState={gameState}
                  onFlick={flick}
                  onSetStrikerPos={setStrikerPosition}
                  onSetAimAngle={setAimAngle}
                  onSetPower={setStrikerPower}
                  isFullscreen
                />
              </div>
            </div>
          </div>

          {/* Compact Side Panel in Fullscreen */}
          <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col gap-3 h-full overflow-y-auto pr-1">
            <ScorePanel
              gameState={gameState}
              onReset={resetGame}
              onSetGameMode={setGameMode}
            />
          </aside>
        </div>
      </div>
    );
  }

  // Standard Responsive Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center p-3 sm:p-5 gap-4 sm:gap-6 overflow-x-hidden text-stone-100 font-sans">
      {/* Premium Header */}
      <header className="w-full max-w-6xl flex items-center justify-between gap-4 py-2 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20 text-stone-950 text-2xl font-black">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                Chiquenaude
              </h1>
              <span className="hidden md:inline-flex bg-amber-500/10 text-amber-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-500/20">
                IA Intégrée
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium tracking-wide">
              Le Jeu de Billard Indien • Physique Améliorée v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowRulesModal(true)}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-amber-300 hover:text-amber-200 font-black text-xs uppercase tracking-wider transition-all shadow active:scale-95 flex items-center gap-1.5"
          >
            <span>📖</span> <span className="hidden sm:inline">Règles</span>
          </button>
          <FullscreenButton />
        </div>
      </header>

      {/* Main Playable Arena Layout */}
      <main className="flex flex-col xl:flex-row gap-6 items-start justify-center w-full max-w-6xl flex-1">
        <div className="flex flex-col items-center gap-4 w-full xl:flex-1 min-w-0">
          <MessageBar gameState={gameState} onReset={resetGame} onHint={giveHint} />

          <div className="w-full relative flex items-center justify-center" style={{ maxWidth: '600px', aspectRatio: '1/1' }}>
            <CarromBoard
              gameState={gameState}
              onFlick={flick}
              onSetStrikerPos={setStrikerPosition}
              onSetAimAngle={setAimAngle}
              onSetPower={setStrikerPower}
            />
          </div>
        </div>

        <aside className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4">
          <ScorePanel
            gameState={gameState}
            onReset={resetGame}
            onSetGameMode={setGameMode}
          />
        </aside>
      </main>

      {/* Footer Signature */}
      <footer className="w-full max-w-6xl py-4 border-t border-stone-800/80 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span>Développé par</span>
          <span className="font-black text-stone-300 tracking-tight">Hylst - Geoffroy</span>
          <span>avec l&apos;aide d&apos;une</span>
          <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            IA
          </span>
        </div>
        <p className="text-center sm:text-right">
          © 2026 Carrom App • Graphismes & Audio HD • Propulsé par React & Canvas
        </p>
      </footer>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 p-6 sm:p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h2 className="text-2xl font-black text-amber-400 flex items-center gap-2.5">
                <span>📖</span> Règles et Fonctions du Carrom
              </h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-10 h-10 rounded-2xl bg-stone-800 hover:bg-stone-700 font-black text-stone-200 text-lg flex items-center justify-center transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
              <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800">
                <h3 className="font-black text-amber-300 mb-1 text-base">🎯 Le But du Jeu</h3>
                <p>
                  Le Joueur 1 (Pions Noirs) et le Joueur 2 (Pions Blancs) s&apos;affrontent pour empocher tous les pions de leur couleur. Ne validez pas la fin de manche sans avoir capturé et confirmé la Reine Rouge !
                </p>
              </div>

              <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800">
                <h3 className="font-black text-rose-400 mb-1 text-base">♛ Capture de la Reine</h3>
                <p>
                  La Reine rapporte <strong>3 points de bonus</strong>. Pour qu&apos;elle soit confirmée, vous devez impérativement empocher un de vos pions dans le même tour (ou le coup suivant). Sinon, elle sera remise au centre du plateau !
                </p>
              </div>

              <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800">
                <h3 className="font-black text-purple-400 mb-1 text-base">⚠️ Fautes & Pénalités</h3>
                <p>
                  Si vous empochez par erreur le Palet de tir (Striker), vous subissez une <strong>pénalité</strong> : l&apos;un de vos pions déjà validés est remis en jeu sur le plateau. Si vous empochez le pion d&apos;un adversaire, il est remis en jeu (faute).
                </p>
              </div>

              <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800">
                <h3 className="font-black text-emerald-400 mb-1 text-base">💡 Nouveautés v2.0</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Mode Plein Écran</strong> immersif pour jouer en grand !</li>
                  <li><strong>Effets de particules</strong> spectaculaires lors de l&apos;empochage</li>
                  <li><strong>Ligne de visée rebondissante</strong> qui prédit les trajectoires</li>
                  <li><strong>Traînées de mouvement</strong> sur les pions rapides</li>
                  <li><strong>Bouton Conseil 💡</strong> pour suggérer un bon coup</li>
                  <li><strong>Confettis</strong> lors des victoires !</li>
                </ul>
              </div>

              <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800">
                <h3 className="font-black text-sky-400 mb-2 text-base">⌨️ Raccourcis Clavier</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">←</kbd>
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">→</kbd>
                    <span>Ajuster l&apos;angle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">↑</kbd>
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">↓</kbd>
                    <span>Ajuster la puissance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">Espace</kbd>
                    <span>Lancer le palet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">F</kbd>
                    <span>Plein écran</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">H</kbd>
                    <span>Conseil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 font-mono">R</kbd>
                    <span>Recommencer</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black tracking-wider uppercase transition-all shadow-xl mt-2 active:scale-95"
            >
              Compris, C&apos;est Parti ! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
