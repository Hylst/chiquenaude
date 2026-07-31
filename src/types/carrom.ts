export type DiscColor = 'black' | 'white' | 'queen' | 'striker';

export interface Disc {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: DiscColor;
  pocketed: boolean;
  mass: number;
}

export type Player = 1 | 2;
export type GamePhase =
  | 'aiming'
  | 'sliding'
  | 'pocketed_check'
  | 'game_over';

export type GameMode = '1v1' | 'ai_easy' | 'ai_hard';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface GameState {
  gameMode: GameMode;
  discs: Disc[];
  striker: Disc;
  currentPlayer: Player;
  phase: GamePhase;
  player1Color: 'black' | 'white';
  player2Color: 'black' | 'white';
  score: { 1: number; 2: number };
  pocketed: { 1: string[]; 2: string[] };
  queenPocketed: boolean;
  queenCovered: boolean;
  queenOwner: Player | null;
  message: string;
  winner: Player | null;
  strikerAngle: number;
  strikerPower: number;
  strikerX: number; // position along baseline
  consecutiveTurns: { 1: number; 2: number };
  floatingTexts: FloatingText[];
  screenShake: number;
  stats: {
    turnsPlayed: number;
    flicksCount: { 1: number; 2: number };
    maxCombo: { 1: number; 2: number };
    currentCombo: { 1: number; 2: number };
  };
}
