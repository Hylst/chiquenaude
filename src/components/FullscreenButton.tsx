import { useFullscreen } from '../hooks/useFullscreen';

interface Props {
  floating?: boolean;
}

export default function FullscreenButton({ floating = false }: Props) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const baseClass = "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 border-2 border-stone-700 hover:border-amber-500/60 text-stone-200 hover:text-amber-300 font-black text-sm shadow-xl transition-all duration-300 active:scale-95 backdrop-blur";
  const floatingClass = floating ? "fixed top-4 right-4 z-40" : "";

  return (
    <button
      onClick={toggleFullscreen}
      className={`${baseClass} ${floatingClass}`}
      title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Passer en plein écran'}
    >
      <span className="text-lg transition-transform group-hover:scale-110">
        {isFullscreen ? '⤓' : '⤢'}
      </span>
      <span className="hidden sm:inline tracking-wide text-xs">
        {isFullscreen ? 'Quitter' : 'Plein écran'}
      </span>
      {!isFullscreen && floating && (
        <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
          NEW
        </span>
      )}
    </button>
  );
}
