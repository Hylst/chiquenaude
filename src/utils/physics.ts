import { Disc } from '../types/carrom';
import { audioEngine } from './audio';

export const FRICTION = 0.985;
export const MIN_VELOCITY = 0.08;
export const BOARD_SIZE = 600;
export const BOARD_PADDING = 52; // inner playable area offset
export const POCKET_RADIUS = 24;
export const DISC_RADIUS = 14;
export const STRIKER_RADIUS = 17;
export const QUEEN_RADIUS = 14;

export const POCKETS = [
  { x: BOARD_PADDING, y: BOARD_PADDING },
  { x: BOARD_SIZE - BOARD_PADDING, y: BOARD_PADDING },
  { x: BOARD_PADDING, y: BOARD_SIZE - BOARD_PADDING },
  { x: BOARD_SIZE - BOARD_PADDING, y: BOARD_SIZE - BOARD_PADDING },
];

export function applyFriction(disc: Disc): Disc {
  return {
    ...disc,
    vx: disc.vx * FRICTION,
    vy: disc.vy * FRICTION,
  };
}

export function updatePosition(disc: Disc): Disc {
  const speed = Math.sqrt(disc.vx * disc.vx + disc.vy * disc.vy);
  if (speed < MIN_VELOCITY) {
    return { ...disc, vx: 0, vy: 0 };
  }
  return {
    ...disc,
    x: disc.x + disc.vx,
    y: disc.y + disc.vy,
  };
}

export function resolveWallCollision(disc: Disc, playSound = false): Disc {
  const inner = BOARD_PADDING;
  const outer = BOARD_SIZE - BOARD_PADDING;
  let { x, y, vx, vy, radius } = disc;
  let bounced = false;
  let impact = 0;

  if (x - radius < inner) {
    impact = Math.abs(vx);
    x = inner + radius;
    vx = Math.abs(vx) * 0.85;
    bounced = true;
  } else if (x + radius > outer) {
    impact = Math.abs(vx);
    x = outer - radius;
    vx = -Math.abs(vx) * 0.85;
    bounced = true;
  }

  if (y - radius < inner) {
    impact = Math.max(impact, Math.abs(vy));
    y = inner + radius;
    vy = Math.abs(vy) * 0.85;
    bounced = true;
  } else if (y + radius > outer) {
    impact = Math.max(impact, Math.abs(vy));
    y = outer - radius;
    vy = -Math.abs(vy) * 0.85;
    bounced = true;
  }

  if (bounced && playSound && impact > 0.5) {
    audioEngine.playWallBounce(impact);
  }

  return { ...disc, x, y, vx, vy };
}

export function resolveDiscCollision(a: Disc, b: Disc, playSound = false): [Disc, Disc] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return [a, b];

  // Normal vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Separate discs
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  const aMoveRatio = b.mass / totalMass;
  const bMoveRatio = a.mass / totalMass;

  const newA: Disc = {
    ...a,
    x: a.x - nx * overlap * aMoveRatio,
    y: a.y - ny * overlap * aMoveRatio,
  };
  const newB: Disc = {
    ...b,
    x: b.x + nx * overlap * bMoveRatio,
    y: b.y + ny * overlap * bMoveRatio,
  };

  // Relative velocity
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const dvDotN = dvx * nx + dvy * ny;

  if (dvDotN > 0) return [newA, newB];

  // Elastic collision impulse
  const restitution = 0.88;
  const impulse = (-(1 + restitution) * dvDotN) / (1 / a.mass + 1 / b.mass);

  const impact = Math.abs(dvDotN);
  if (playSound && impact > 0.5) {
    audioEngine.playCollision(impact);
  }

  return [
    {
      ...newA,
      vx: newA.vx + (impulse / a.mass) * nx,
      vy: newA.vy + (impulse / a.mass) * ny,
    },
    {
      ...newB,
      vx: newB.vx - (impulse / b.mass) * nx,
      vy: newB.vy - (impulse / b.mass) * ny,
    },
  ];
}

export function checkPocket(disc: Disc): boolean {
  for (const pocket of POCKETS) {
    const dx = disc.x - pocket.x;
    const dy = disc.y - pocket.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < POCKET_RADIUS - disc.radius * 0.5) {
      return true;
    }
  }
  return false;
}

export function isMoving(discs: Disc[]): boolean {
  return discs.some(
    (d) =>
      !d.pocketed &&
      (Math.abs(d.vx) > MIN_VELOCITY || Math.abs(d.vy) > MIN_VELOCITY)
  );
}
