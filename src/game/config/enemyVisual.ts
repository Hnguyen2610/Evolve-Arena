import type Phaser from 'phaser';
import type { EnemyType } from '../types';

export type EnemyVisualType = Exclude<EnemyType, 'boss' | 'rift-boss' | 'forge-boss' | 'grid-boss'>;

export interface EnemyVisualConfig {
  enemyType: EnemyVisualType;
  role: string;
  concept: string;
  silhouette: string;
  row: number;
  scale: number;
  frameRate: number;
}

export const ENEMY_VISUAL_ATLAS = {
  textureKey: 'enemy-characters',
  assetPath: 'assets/enemy-characters.png',
  frameWidth: 80,
  frameHeight: 80,
  framesPerEnemy: 4,
} as const;

export const ENEMY_VISUAL_TYPES: readonly EnemyVisualType[] = [
  'basic',
  'runner',
  'tank',
  'ranged',
  'swarm',
  'orbiter',
  'pulse-caster',
  'guardian',
  'disruptor',
  'anchor',
  'interceptor',
  'energy-node',
];

export const ENEMY_VISUALS: Record<EnemyVisualType, EnemyVisualConfig> = {
  basic: {
    enemyType: 'basic',
    role: 'baseline pressure',
    concept: 'corrupted light arena trooper',
    silhouette: 'medium humanoid with short weapon arm',
    row: 0,
    scale: 0.68,
    frameRate: 6,
  },
  runner: {
    enemyType: 'runner',
    role: 'fast melee pressure',
    concept: 'lean cyber hunter creature',
    silhouette: 'narrow forward body with long limbs',
    row: 1,
    scale: 0.7,
    frameRate: 11,
  },
  tank: {
    enemyType: 'tank',
    role: 'slow durable threat',
    concept: 'heavy armored brute machine',
    silhouette: 'wide shoulders and thick core',
    row: 2,
    scale: 0.88,
    frameRate: 4,
  },
  ranged: {
    enemyType: 'ranged',
    role: 'ranged pressure',
    concept: 'rifle gunner unit',
    silhouette: 'medium body with obvious projecting weapon',
    row: 3,
    scale: 0.72,
    frameRate: 6,
  },
  swarm: {
    enemyType: 'swarm',
    role: 'numerous small unit',
    concept: 'compact skitter drone',
    silhouette: 'tiny round core with four bright legs',
    row: 4,
    scale: 0.56,
    frameRate: 10,
  },
  orbiter: {
    enemyType: 'orbiter',
    role: 'positioning pressure',
    concept: 'floating ring drone',
    silhouette: 'ring body with orbiting pods',
    row: 5,
    scale: 0.72,
    frameRate: 8,
  },
  'pulse-caster': {
    enemyType: 'pulse-caster',
    role: 'energy pulse pressure',
    concept: 'floating caster core',
    silhouette: 'diamond shell with visible energy core',
    row: 6,
    scale: 0.78,
    frameRate: 6,
  },
  guardian: {
    enemyType: 'guardian',
    role: 'node protector',
    concept: 'shield sentinel',
    silhouette: 'central body with two shield plates',
    row: 7,
    scale: 0.82,
    frameRate: 5,
  },
  disruptor: {
    enemyType: 'disruptor',
    role: 'lane pressure',
    concept: 'railgun specialist',
    silhouette: 'narrow unit with long barrel',
    row: 8,
    scale: 0.72,
    frameRate: 6,
  },
  anchor: {
    enemyType: 'anchor',
    role: 'planted overload pressure',
    concept: 'stabilizer machine',
    silhouette: 'low bulky body with four stabilizer legs',
    row: 9,
    scale: 0.86,
    frameRate: 4,
  },
  interceptor: {
    enemyType: 'interceptor',
    role: 'dash interception pressure',
    concept: 'blade sprinter machine',
    silhouette: 'thin aggressive spear shape with side blades',
    row: 10,
    scale: 0.74,
    frameRate: 12,
  },
  'energy-node': {
    enemyType: 'energy-node',
    role: 'stage objective',
    concept: 'anchored energy pylon',
    silhouette: 'round field ring with vertical crystal core',
    row: 11,
    scale: 0.82,
    frameRate: 5,
  },
};

export function getEnemyVisualAnimationKey(enemyType: EnemyVisualType): string {
  return `enemy-move-${enemyType}`;
}

export function getEnemyVisualConfig(enemyType: EnemyType): EnemyVisualConfig | null {
  return isEnemyVisualType(enemyType) ? ENEMY_VISUALS[enemyType] : null;
}

export function isEnemyVisualType(enemyType: EnemyType): enemyType is EnemyVisualType {
  return ENEMY_VISUAL_TYPES.includes(enemyType as EnemyVisualType);
}

export function getEnemyVisualStartFrame(config: EnemyVisualConfig): number {
  return config.row * ENEMY_VISUAL_ATLAS.framesPerEnemy;
}

export function registerEnemyVisualAnimations(anims: Phaser.Animations.AnimationManager): void {
  ENEMY_VISUAL_TYPES.forEach((enemyType) => {
    const config = ENEMY_VISUALS[enemyType];
    const key = getEnemyVisualAnimationKey(enemyType);
    if (anims.exists(key)) {
      return;
    }
    const start = getEnemyVisualStartFrame(config);
    anims.create({
      key,
      frames: anims.generateFrameNumbers(ENEMY_VISUAL_ATLAS.textureKey, {
        frames: [start, start + 1, start + 2, start + 3],
      }),
      frameRate: config.frameRate,
      repeat: -1,
    });
  });
}
