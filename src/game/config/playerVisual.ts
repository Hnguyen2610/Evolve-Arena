import type Phaser from 'phaser';

export type PlayerVisualDirection = 'south' | 'east' | 'north' | 'west';
export type PlayerVisualMotion = 'idle' | 'run';

export const PLAYER_VISUAL = {
  textureKey: 'player-cyber-survivor',
  assetPath: 'assets/player-cyber-survivor.png',
  fallbackTextureKey: 'player',
  frameWidth: 96,
  frameHeight: 96,
  framesPerDirection: 6,
  frameCount: 24,
  renderScale: 0.74,
  collisionRadius: 18,
} as const;

export const PLAYER_VISUAL_DIRECTIONS: readonly PlayerVisualDirection[] = ['south', 'east', 'north', 'west'];

export interface PlayerVisualVector {
  x: number;
  y: number;
  lengthSq(): number;
}

export function getPlayerVisualAnimationKey(direction: PlayerVisualDirection, motion: PlayerVisualMotion): string {
  return `player-${motion}-${direction}`;
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

export function registerPlayerVisualAnimations(anims: Phaser.Animations.AnimationManager): void {
  PLAYER_VISUAL_DIRECTIONS.forEach((direction, row) => {
    const baseFrame = row * PLAYER_VISUAL.framesPerDirection;
    const idleKey = getPlayerVisualAnimationKey(direction, 'idle');
    const runKey = getPlayerVisualAnimationKey(direction, 'run');

    if (!anims.exists(idleKey)) {
      anims.create({
        key: idleKey,
        frames: anims.generateFrameNumbers(PLAYER_VISUAL.textureKey, { frames: [baseFrame, baseFrame + 1] }),
        frameRate: 3,
        repeat: -1,
      });
    }

    if (!anims.exists(runKey)) {
      anims.create({
        key: runKey,
        frames: anims.generateFrameNumbers(PLAYER_VISUAL.textureKey, {
          frames: [baseFrame + 2, baseFrame + 3, baseFrame + 4, baseFrame + 5],
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  });
}
