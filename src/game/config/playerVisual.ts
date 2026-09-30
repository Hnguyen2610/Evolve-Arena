export type PlayerVisualDirection = 'south' | 'east' | 'north' | 'west';

export const PLAYER_VISUAL_DIRECTIONS: readonly PlayerVisualDirection[] = ['south', 'east', 'north', 'west'];

// The character sprite is split into two stacked layers instead of a hand-drawn walk-cycle atlas
// (row 0 = upper body: head/torso/arms/gun, row 1 = legs only, one column per direction). Legs
// are swung procedurally in Player.ts rather than frame-swapped, since independently AI-generated
// alternate-stride frames don't share a registration point and jitter when swapped. See
// scratchpad build-player-parts.js (this session) for exactly how the sheet was built from the
// source renders and where legsPivotYFraction comes from.
export const PLAYER_VISUAL = {
  textureKey: 'player-parts',
  assetPath: 'assets/player-parts.png',
  fallbackTextureKey: 'player',
  frameWidth: 96,
  frameHeight: 96,
  upperRow: 0,
  legsRow: 1,
  renderScale: 0.74,
  collisionRadius: 18,
  // Both x (0.5) and this y are identical across all 4 directions because every source cutout
  // was scaled/centered into its cell with the same transform before the hip cut was made.
  legsPivotXFraction: 0.5,
  legsPivotYFraction: 0.5602,
  legSwingMaxRadians: 0.34,
  legSwingPeriodMs: 260,
} as const;

export interface PlayerVisualVector {
  x: number;
  y: number;
  lengthSq(): number;
}

export function getPlayerVisualFrame(direction: PlayerVisualDirection, row: number): number {
  const column = PLAYER_VISUAL_DIRECTIONS.indexOf(direction);
  return row * PLAYER_VISUAL_DIRECTIONS.length + column;
}

export function getPlayerVisualDirection(
  vector: PlayerVisualVector,
  previous: PlayerVisualDirection,
): PlayerVisualDirection {
  if (vector.lengthSq() <= 0.01) {
    return previous;
  }
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x >= 0 ? 'east' : 'west';
  }
  return vector.y >= 0 ? 'south' : 'north';
}
