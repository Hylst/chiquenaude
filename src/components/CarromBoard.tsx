import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameState } from '../types/carrom';
import {
  BOARD_SIZE,
  BOARD_PADDING,
  POCKET_RADIUS,
  POCKETS,
} from '../utils/physics';
import { ParticleSystem } from '../utils/particles';

const CENTER = BOARD_SIZE / 2;

interface Props {
  gameState: GameState;
  onFlick: (angle: number, power: number) => void;
  onSetStrikerPos: (x: number) => void;
  onSetAimAngle: (angle: number) => void;
  onSetPower: (power: number) => void;
  isFullscreen?: boolean;
}

export default function CarromBoard({
  gameState,
  onFlick,
  onSetStrikerPos,
  onSetAimAngle,
  onSetPower,
  isFullscreen = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const particleSystemRef = useRef(new ParticleSystem());
  const prevPocketedRef = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number | null>(null);

  const getScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const size = Math.min(container.clientWidth, container.clientHeight);
    return size / BOARD_SIZE;
  }, []);

  const getCanvasPos = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = BOARD_SIZE / rect.width;
      const scaleY = BOARD_SIZE / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Detect newly pocketed discs and spawn particles
  useEffect(() => {
    const pocketedNow = new Set<string>();
    gameState.discs.forEach((d) => {
      if (d.pocketed) {
        pocketedNow.add(d.id);
        if (!prevPocketedRef.current.has(d.id)) {
          // Find closest pocket where it was pocketed
          const pocket = POCKETS.reduce((best, p) => {
            const dist = Math.sqrt((d.x - p.x) ** 2 + (d.y - p.y) ** 2);
            return dist < best.dist ? { pocket: p, dist } : best;
          }, { pocket: POCKETS[0], dist: Infinity }).pocket;

          const color =
            d.color === 'queen' ? '#fbbf24' :
            d.color === 'black' ? '#64748b' :
            d.color === 'white' ? '#f1f5f9' : '#fbbf24';

          particleSystemRef.current.addBurst(pocket.x, pocket.y, color, 25);
          if (d.color === 'queen') {
            particleSystemRef.current.addSparkle(pocket.x, pocket.y, '#fde68a');
          }
        }
      }
    });
    prevPocketedRef.current = pocketedNow;
  }, [gameState.discs]);

  // Main animation loop for rendering (particles + board)
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const scale = getScale();
      const totalScale = scale * dpr;

      if (canvas.width !== BOARD_SIZE * totalScale) {
        canvas.width = BOARD_SIZE * totalScale;
        canvas.height = BOARD_SIZE * totalScale;
        canvas.style.width = `${BOARD_SIZE * scale}px`;
        canvas.style.height = `${BOARD_SIZE * scale}px`;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(totalScale, totalScale);

      // Apply screen shake
      if (gameState.screenShake > 0) {
        const sx = (Math.random() - 0.5) * gameState.screenShake;
        const sy = (Math.random() - 0.5) * gameState.screenShake;
        ctx.translate(sx, sy);
      }

      drawBoard(ctx, gameState, showGuideLine);

      // Update & draw particles
      particleSystemRef.current.update();
      particleSystemRef.current.draw(ctx);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState, getScale, showGuideLine]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = getScale();
      const dpr = window.devicePixelRatio || 1;
      const totalScale = scale * dpr;
      canvas.width = BOARD_SIZE * totalScale;
      canvas.height = BOARD_SIZE * totalScale;
      canvas.style.width = `${BOARD_SIZE * scale}px`;
      canvas.style.height = `${BOARD_SIZE * scale}px`;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getScale]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (gameState.phase !== 'aiming') return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      const pos = getCanvasPos(e.clientX, e.clientY);
      const striker = gameState.striker;
      const dx = pos.x - striker.x;
      const dy = pos.y - striker.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < striker.radius + 40) {
        isDraggingRef.current = true;
      }
    },
    [gameState, getCanvasPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (gameState.phase !== 'aiming') return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      const pos = getCanvasPos(e.clientX, e.clientY);

      if (isDraggingRef.current) {
        const striker = gameState.striker;
        const dx = striker.x - pos.x;
        const dy = striker.y - pos.y;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(1, dist / 130);
        onSetAimAngle(angle);
        onSetPower(power);
      }
    },
    [gameState, getCanvasPos, onSetAimAngle, onSetPower]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (gameState.phase !== 'aiming') return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      const pos = getCanvasPos(e.clientX, e.clientY);

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        const striker = gameState.striker;
        const dx = striker.x - pos.x;
        const dy = striker.y - pos.y;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(1, dist / 130);
        if (power > 0.05) {
          onFlick(angle, power);
        }
      }
    },
    [gameState, getCanvasPos, onFlick]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (gameState.phase !== 'aiming') return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      e.preventDefault();
      const touch = e.touches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      const striker = gameState.striker;
      const dx = pos.x - striker.x;
      const dy = pos.y - striker.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < striker.radius + 50) {
        isDraggingRef.current = true;
      }
    },
    [gameState, getCanvasPos]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (gameState.phase !== 'aiming' || !isDraggingRef.current) return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      e.preventDefault();
      const touch = e.touches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      const striker = gameState.striker;
      const dx = striker.x - pos.x;
      const dy = striker.y - pos.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(1, dist / 130);
      onSetAimAngle(angle);
      onSetPower(power);
    },
    [gameState, getCanvasPos, onSetAimAngle, onSetPower]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (gameState.phase !== 'aiming' || !isDraggingRef.current) return;
      if (gameState.currentPlayer === 2 && gameState.gameMode !== '1v1') return;

      e.preventDefault();
      isDraggingRef.current = false;
      const touch = e.changedTouches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      const striker = gameState.striker;
      const dx = striker.x - pos.x;
      const dy = striker.y - pos.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(1, dist / 130);
      if (power > 0.05) {
        onFlick(angle, power);
      }
    },
    [gameState, getCanvasPos, onFlick]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      onSetStrikerPos(val);
    },
    [onSetStrikerPos]
  );

  const tweakAngle = useCallback(
    (delta: number) => {
      if (gameState.phase !== 'aiming') return;
      onSetAimAngle(gameState.strikerAngle + delta);
    },
    [gameState.phase, gameState.strikerAngle, onSetAimAngle]
  );

  const tweakPower = useCallback(
    (delta: number) => {
      if (gameState.phase !== 'aiming') return;
      onSetPower(Math.max(0.1, Math.min(1, gameState.strikerPower + delta)));
    },
    [gameState.phase, gameState.strikerPower, onSetPower]
  );

  const { min: sliderMin, max: sliderMax } = {
    min: BOARD_PADDING + 60,
    max: BOARD_SIZE - BOARD_PADDING - 60,
  };

  const isHumanTurn =
    gameState.phase === 'aiming' &&
    !(gameState.currentPlayer === 2 && gameState.gameMode !== '1v1');

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center w-full select-none ${
        isFullscreen ? 'h-full justify-center' : 'h-full'
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: isHumanTurn ? 'crosshair' : 'default',
          touchAction: 'none',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.8), 0 0 20px rgba(251, 191, 36, 0.15)',
          maxWidth: '100%',
          maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '100%',
          width: 'auto',
          height: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Precision Controls Overlay */}
      {isHumanTurn && (
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none px-2 z-10">
          <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-900/90 backdrop-blur border border-stone-700/80 p-1.5 rounded-xl shadow-xl">
            <span className="text-[10px] text-amber-300/90 font-bold px-1 hidden sm:inline">
              📐
            </span>
            <button
              onClick={() => tweakAngle(-0.02)}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all shadow"
              title="Pivoter légèrement à gauche"
            >
              ↶
            </button>
            <button
              onClick={() => tweakAngle(0.02)}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all shadow"
              title="Pivoter légèrement à droite"
            >
              ↷
            </button>
            <div className="w-px h-6 bg-stone-700 mx-1" />
            <span className="text-[10px] text-amber-300/90 font-bold px-1 hidden sm:inline">
              💪
            </span>
            <button
              onClick={() => tweakPower(-0.05)}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all shadow"
              title="Réduire la puissance"
            >
              −
            </button>
            <button
              onClick={() => tweakPower(0.05)}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all shadow"
              title="Augmenter la puissance"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setShowGuideLine((prev) => !prev)}
            className={`pointer-events-auto text-xs font-bold px-3 py-2 rounded-xl backdrop-blur border transition-all shadow-xl ${
              showGuideLine
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-stone-900/80 text-stone-400 border-stone-700/80 hover:bg-stone-800'
            }`}
            title="Afficher ou masquer la ligne de visée"
          >
            {showGuideLine ? '👁️ Laser ON' : '👁️ Laser OFF'}
          </button>
        </div>
      )}

      {/* Striker position slider */}
      {isHumanTurn && (
        <div className="mt-4 flex flex-col items-center gap-1.5 w-full max-w-[560px] px-2">
          <div className="flex items-center justify-between w-full text-xs font-bold px-1">
            <span className="text-amber-400/90 flex items-center gap-1">
              <span>←</span> Position
            </span>
            <span className="text-stone-500 font-normal text-[10px]">
              Glissez le curseur ou tirez directement sur le plateau
            </span>
            <span className="text-amber-400/90 flex items-center gap-1">
              Position <span>→</span>
            </span>
          </div>
          <div className="relative w-full flex items-center py-1">
            <div className="absolute inset-x-0 h-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-full border border-stone-700 shadow-inner" />
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              value={gameState.strikerX}
              onChange={handleSliderChange}
              className="relative w-full z-10 appearance-none bg-transparent cursor-pointer h-6 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  showGuideLine: boolean
) {
  const inner = BOARD_PADDING;
  const outer = BOARD_SIZE - BOARD_PADDING;
  const playSize = outer - inner;

  // === Beautiful Rich Wood Border ===
  const borderGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  borderGrad.addColorStop(0, '#5a2a18');
  borderGrad.addColorStop(0.5, '#3b1a0e');
  borderGrad.addColorStop(1, '#241008');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // Border highlight for 3D depth
  ctx.fillStyle = 'rgba(255, 220, 180, 0.04)';
  ctx.fillRect(4, 4, BOARD_SIZE - 8, inner - 12);
  ctx.fillRect(4, outer + 8, BOARD_SIZE - 8, inner - 12);
  ctx.fillRect(4, 4, inner - 12, BOARD_SIZE - 8);
  ctx.fillRect(outer + 8, 4, inner - 12, BOARD_SIZE - 8);

  // Inner frame trim
  ctx.fillStyle = '#110804';
  ctx.fillRect(inner - 6, inner - 6, playSize + 12, playSize + 12);

  // === Polished Teak/Mango Wood Surface ===
  const surfaceGrad = ctx.createRadialGradient(
    CENTER, CENTER, 10,
    CENTER, CENTER, playSize * 0.7
  );
  surfaceGrad.addColorStop(0, '#f5d38a');
  surfaceGrad.addColorStop(0.6, '#e0b055');
  surfaceGrad.addColorStop(1, '#b87d28');
  ctx.fillStyle = surfaceGrad;
  ctx.fillRect(inner, inner, playSize, playSize);

  // Realistic wood grain
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#3d2005';
  ctx.lineWidth = 1.5;
  for (let gx = inner - 100; gx < outer + 100; gx += 14) {
    ctx.beginPath();
    ctx.moveTo(gx, inner);
    ctx.quadraticCurveTo(gx + 30, CENTER, gx - 20, outer);
    ctx.stroke();
  }
  ctx.restore();

  // Gloss reflection
  ctx.save();
  const glossGrad = ctx.createLinearGradient(inner, inner, outer, outer);
  glossGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  glossGrad.addColorStop(0.4, 'rgba(255,255,255,0.02)');
  glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glossGrad;
  ctx.fillRect(inner, inner, playSize, playSize);
  ctx.restore();

  // Decorative Corner Arrows
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 70, 10, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);

  const cornerGuides = [
    { x1: inner, y1: inner, x2: inner + 85, y2: inner + 85 },
    { x1: outer, y1: inner, x2: outer - 85, y2: inner + 85 },
    { x1: inner, y1: outer, x2: inner + 85, y2: outer - 85 },
    { x1: outer, y1: outer, x2: outer - 85, y2: outer - 85 },
  ];
  cornerGuides.forEach(({ x1, y1, x2, y2 }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x2, y2, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 70, 10, 0.3)';
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();

  // === Pockets with premium rendering ===
  const pockets = [
    { x: inner, y: inner },
    { x: outer, y: inner },
    { x: inner, y: outer },
    { x: outer, y: outer },
  ];

  pockets.forEach(({ x, y }) => {
    // Velvet shadow
    ctx.beginPath();
    ctx.arc(x, y, POCKET_RADIUS + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();

    // Deep abyss
    ctx.beginPath();
    ctx.arc(x, y, POCKET_RADIUS, 0, Math.PI * 2);
    const pocketGrad = ctx.createRadialGradient(x, y, 2, x, y, POCKET_RADIUS);
    pocketGrad.addColorStop(0, '#050201');
    pocketGrad.addColorStop(0.7, '#140804');
    pocketGrad.addColorStop(1, '#2e150a');
    ctx.fillStyle = pocketGrad;
    ctx.fill();

    // Metallic gold rim
    const rimGrad = ctx.createLinearGradient(x - POCKET_RADIUS, y - POCKET_RADIUS, x + POCKET_RADIUS, y + POCKET_RADIUS);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.5, '#fbbf24');
    rimGrad.addColorStop(1, '#b45309');
    ctx.beginPath();
    ctx.arc(x, y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // === Center Circles ===
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 52, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160, 50, 10, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(160, 50, 10, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 40, 5, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#b91c1c';
  ctx.fill();

  // === Baselines ===
  const baselineOffset = 80;
  const baselineLeft = inner + baselineOffset;
  const baselineRight = outer - baselineOffset;

  const drawBaseline = (y: number, color: string, active: boolean) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 3 : 2;
    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    ctx.moveTo(baselineLeft, y - 8);
    ctx.lineTo(baselineRight, y - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(baselineLeft, y + 8);
    ctx.lineTo(baselineRight, y + 8);
    ctx.stroke();

    [baselineLeft, baselineRight].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.restore();
  };

  const isP1Active = state.currentPlayer === 1 && state.phase === 'aiming';
  const isP2Active = state.currentPlayer === 2 && state.phase === 'aiming';

  drawBaseline(outer - 36, isP1Active ? '#fbbf24' : 'rgba(160, 50, 10, 0.6)', isP1Active);
  drawBaseline(inner + 36, isP2Active ? '#c084fc' : 'rgba(160, 50, 10, 0.6)', isP2Active);

  // Player zone labels
  ctx.save();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = isP1Active ? '#fbbf24' : 'rgba(100, 30, 0, 0.6)';
  ctx.fillText('JOUEUR 1', CENTER, outer - 6);

  const p2Label = state.gameMode === '1v1' ? 'JOUEUR 2' : state.gameMode === 'ai_easy' ? 'IA (FACILE)' : 'IA (HARD)';
  ctx.fillStyle = isP2Active ? '#c084fc' : 'rgba(100, 30, 0, 0.6)';
  ctx.fillText(p2Label, CENTER, inner + 18);
  ctx.restore();

  // === Draw Discs ===
  const sortedDiscs = [...state.discs].sort((a, b) => {
    if (a.color === 'queen') return 1;
    if (b.color === 'queen') return -1;
    return 0;
  });

  sortedDiscs.forEach((disc) => {
    if (disc.pocketed) return;
    drawRealisticDisc(ctx, disc);
  });

  // === Motion trails for fast-moving discs ===
  if (state.phase === 'sliding') {
    state.discs.forEach((disc) => {
      if (disc.pocketed) return;
      const speed = Math.sqrt(disc.vx ** 2 + disc.vy ** 2);
      if (speed > 3) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, speed / 20);
        const color = disc.color === 'queen' ? '#fbbf24' :
                      disc.color === 'black' ? 'rgba(30,30,30,0.5)' : 'rgba(240,240,240,0.5)';
        ctx.fillStyle = color;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(
            disc.x - disc.vx * i * 0.5,
            disc.y - disc.vy * i * 0.5,
            disc.radius * (1 - i * 0.15),
            0, Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      }
    });
  }

  // === Aim Guide Line ===
  if (state.phase === 'aiming' && showGuideLine) {
    const striker = state.striker;
    const angle = state.strikerAngle;
    const power = state.strikerPower;
    const isAiAiming = state.currentPlayer === 2 && state.gameMode !== '1v1';
    const laserColor = isAiAiming ? '#c084fc' : power < 0.4 ? '#4ade80' : power < 0.75 ? '#fbbf24' : '#ef4444';

    ctx.save();

    // Glowing power indicator
    ctx.beginPath();
    ctx.arc(striker.x, striker.y, striker.radius + 6 + power * 4, 0, Math.PI * 2);
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = laserColor;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Laser ray with prediction bounces
    const rayLen = 80 + power * 280;
    let curX = striker.x;
    let curY = striker.y;
    let curDx = Math.cos(angle);
    let curDy = Math.sin(angle);
    let remaining = rayLen;

    ctx.beginPath();
    ctx.moveTo(curX, curY);

    let bounces = 0;
    while (remaining > 0 && bounces < 2) {
      const stepX = curDx * remaining;
      const stepY = curDy * remaining;
      const nextX = curX + stepX;
      const nextY = curY + stepY;

      // Check if next position hits a wall
      let hitWall = false;
      let hitX = nextX;
      let hitY = nextY;
      let distToWall = remaining;

      if (nextX < inner) {
        const t = (inner - curX) / curDx;
        hitX = inner;
        hitY = curY + curDy * t;
        distToWall = t;
        hitWall = true;
      } else if (nextX > outer) {
        const t = (outer - curX) / curDx;
        hitX = outer;
        hitY = curY + curDy * t;
        distToWall = t;
        hitWall = true;
      }
      if (nextY < inner) {
        const t = (inner - curY) / curDy;
        if (t < distToWall) {
          hitX = curX + curDx * t;
          hitY = inner;
          distToWall = t;
          hitWall = true;
        }
      } else if (nextY > outer) {
        const t = (outer - curY) / curDy;
        if (t < distToWall) {
          hitX = curX + curDx * t;
          hitY = outer;
          distToWall = t;
          hitWall = true;
        }
      }

      if (hitWall) {
        ctx.lineTo(hitX, hitY);
        remaining -= distToWall;
        curX = hitX;
        curY = hitY;
        // Reflect
        if (hitX <= inner || hitX >= outer) curDx = -curDx;
        if (hitY <= inner || hitY >= outer) curDy = -curDy;
        bounces++;
      } else {
        ctx.lineTo(nextX, nextY);
        remaining = 0;
      }
    }

    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Endpoint target
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.arc(curX, curY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(curX, curY, 2, 0, Math.PI * 2);
    ctx.fillStyle = laserColor;
    ctx.fill();

    ctx.restore();
  }

  // === Draw Striker ===
  if (!state.striker.pocketed) {
    drawRealisticStriker(ctx, state.striker, state.currentPlayer);
  }

  // === Power Bar HUD ===
  if (state.phase === 'aiming' && state.strikerPower > 0.05) {
    ctx.save();
    const barW = 180;
    const barH = 12;
    const barX = CENTER - barW / 2;
    const barY = outer - 60;
    const power = state.strikerPower;

    // Glass backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(barX - 4, barY - 4, barW + 8, barH + 8, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const isAi = state.currentPlayer === 2 && state.gameMode !== '1v1';
    const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (isAi) {
      fillGrad.addColorStop(0, '#a855f7');
      fillGrad.addColorStop(1, '#e9d5ff');
    } else {
      fillGrad.addColorStop(0, '#4ade80');
      fillGrad.addColorStop(0.6, '#facc15');
      fillGrad.addColorStop(1, '#ef4444');
    }

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * power, barH, 5);
    ctx.shadowColor = isAi ? '#c084fc' : power > 0.7 ? '#ef4444' : '#facc15';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PUISSANCE : ${Math.round(power * 100)}%`, CENTER, barY - 7);
    ctx.restore();
  }

  // === Floating Animation Text Popups ===
  state.floatingTexts.forEach((ft) => {
    ctx.save();
    ctx.font = 'black 24px sans-serif';
    ctx.textAlign = 'center';

    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(ft.text, ft.x, ft.y);

    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });
}

function drawRealisticDisc(
  ctx: CanvasRenderingContext2D,
  disc: { x: number; y: number; radius: number; color: string }
) {
  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  if (disc.color === 'queen') {
    const baseGrad = ctx.createRadialGradient(
      disc.x - disc.radius * 0.35, disc.y - disc.radius * 0.35, 2,
      disc.x, disc.y, disc.radius
    );
    baseGrad.addColorStop(0, '#ff7a7a');
    baseGrad.addColorStop(0.4, '#dc2626');
    baseGrad.addColorStop(0.85, '#991b1b');
    baseGrad.addColorStop(1, '#450a0a');

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    const goldGrad = ctx.createLinearGradient(
      disc.x - disc.radius, disc.y - disc.radius,
      disc.x + disc.radius, disc.y + disc.radius
    );
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#eab308');
    goldGrad.addColorStop(1, '#854d0e');

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.round(disc.radius * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', disc.x, disc.y + 1);

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius * 0.85, Math.PI * 1.1, Math.PI * 1.8);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    const isBlack = disc.color === 'black';
    const highlight = isBlack ? '#575757' : '#ffffff';
    const mid = isBlack ? '#212121' : '#f3f4f6';
    const shadow = isBlack ? '#0a0a0a' : '#d1d5db';

    const discGrad = ctx.createRadialGradient(
      disc.x - disc.radius * 0.35, disc.y - disc.radius * 0.35, 1,
      disc.x, disc.y, disc.radius
    );
    discGrad.addColorStop(0, highlight);
    discGrad.addColorStop(0.4, mid);
    discGrad.addColorStop(0.85, shadow);
    discGrad.addColorStop(1, isBlack ? '#000000' : '#9ca3af');

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2);
    ctx.fillStyle = discGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = isBlack ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(disc.x, disc.y, disc.radius - 1.5, Math.PI * 1.1, Math.PI * 1.8);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

function drawRealisticStriker(
  ctx: CanvasRenderingContext2D,
  striker: { x: number; y: number; radius: number },
  player: number
) {
  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  const strikerGrad = ctx.createRadialGradient(
    striker.x - striker.radius * 0.35, striker.y - striker.radius * 0.35, 2,
    striker.x, striker.y, striker.radius
  );

  if (player === 1) {
    strikerGrad.addColorStop(0, '#fef08a');
    strikerGrad.addColorStop(0.35, '#f59e0b');
    strikerGrad.addColorStop(0.8, '#b45309');
    strikerGrad.addColorStop(1, '#78350f');
  } else {
    strikerGrad.addColorStop(0, '#f3e8ff');
    strikerGrad.addColorStop(0.35, '#a855f7');
    strikerGrad.addColorStop(0.8, '#7e22ce');
    strikerGrad.addColorStop(1, '#4c1d95');
  }

  ctx.beginPath();
  ctx.arc(striker.x, striker.y, striker.radius, 0, Math.PI * 2);
  ctx.fillStyle = strikerGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.beginPath();
  ctx.arc(striker.x, striker.y, striker.radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = player === 1 ? '#fde68a' : '#e9d5ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(striker.x, striker.y, striker.radius * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `black ${Math.round(striker.radius * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = player === 1 ? '#f59e0b' : '#a855f7';
  ctx.shadowBlur = 6;
  ctx.fillText(`J${player}`, striker.x, striker.y + 1);

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(striker.x, striker.y, striker.radius - 2.5, Math.PI * 1.1, Math.PI * 1.8);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
