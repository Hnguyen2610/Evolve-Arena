import type Phaser from 'phaser';
import type { EnemyType } from '../types';

export type BossVisualType = Extract<EnemyType, 'boss' | 'rift-boss' | 'forge-boss' | 'grid-boss' | 'conductor-boss'>;
export type BossVisualState = 'move' | 'attack';

export interface BossVisualConfig {
  bossType: BossVisualType;
  stageIdentity: string;
  concept: string;
  silhouette: string;
  row: number;
  scale: number;
  moveFrameRate: number;
  attackFrameRate: number;
}

export const BOSS_VISUAL_ATLAS = {
  textureKey: 'boss-characters',
  assetPath: 'assets/boss-characters.png',
  frameWidth: 128,
  frameHeight: 128,
  framesPerBoss: 6,
  moveFrames: 4,
} as const;

export const BOSS_VISUAL_TYPES: readonly BossVisualType[] = ['boss', 'rift-boss', 'forge-boss', 'grid-boss', 'conductor-boss'];

export const BOSS_VISUALS: Record<BossVisualType, BossVisualConfig> = {
  boss: {
    bossType: 'boss',
    stageIdentity: 'MOVE',
    concept: 'cybernetic assault beast core',
    silhouette: 'compact aggressive body with four forward blades',
    row: 0,
    scale: 0.98,
    moveFrameRate: 5,
    attackFrameRate: 8,
  },
  'rift-boss': {
    bossType: 'rift-boss',
    stageIdentity: 'POSITION',
    concept: 'hovering crystalline prism warden',
    silhouette: 'vertical prism body with orbiting shard panels',
    row: 1,
    scale: 1.04,
    moveFrameRate: 5,
    attackFrameRate: 7,
  },
  'forge-boss': {
    bossType: 'forge-boss',
    stageIdentity: 'PRIORITIZE',
    concept: 'industrial forge tyrant mech',
    silhouette: 'broad heavy chassis with asymmetrical forge arm',
    row: 2,
    scale: 1.08,
    moveFrameRate: 4,
    attackFrameRate: 7,
  },
  'grid-boss': {
    bossType: 'grid-boss',
    stageIdentity: 'ADAPT',
    concept: 'segmented arena-control sentinel',
    silhouette: 'large diamond command core with radial control nodes',
    row: 3,
    scale: 1.06,
    moveFrameRate: 5,
    attackFrameRate: 8,
  },
  'conductor-boss': {
    bossType: 'conductor-boss',
    stageIdentity: 'SYNC',
    concept: 'cybernetic conductor wielding harmonic resonance baton',
    silhouette: 'tall slender figure with exaggerated upper body and prominent baton headpiece',
    row: 4,
    scale: 1.0,
    moveFrameRate: 4,
    attackFrameRate: 6,
  },
};

export function getBossVisualAnimationKey(bossType: BossVisualType, state: BossVisualState): string {
  return `boss-${state}-${bossType}`;
}

export function getBossVisualConfig(enemyType: EnemyType): BossVisualConfig | null {
  return isBossVisualType(enemyType) ? BOSS_VISUALS[enemyType] : null;
}

export function isBossVisualType(enemyType: EnemyType): enemyType is BossVisualType {
  return BOSS_VISUAL_TYPES.includes(enemyType as BossVisualType);
}

export function getBossVisualStartFrame(config: BossVisualConfig): number {
  return config.row * BOSS_VISUAL_ATLAS.framesPerBoss;
}

export function registerBossVisualAnimations(anims: Phaser.Animations.AnimationManager): void {
  BOSS_VISUAL_TYPES.forEach((bossType) => {
    const config = BOSS_VISUALS[bossType];
    const start = getBossVisualStartFrame(config);
    const moveKey = getBossVisualAnimationKey(bossType, 'move');
    const attackKey = getBossVisualAnimationKey(bossType, 'attack');
    if (!anims.exists(moveKey)) {
      anims.create({
        key: moveKey,
        frames: anims.generateFrameNumbers(BOSS_VISUAL_ATLAS.textureKey, {
          frames: [start, start + 1, start + 2, start + 3],
        }),
        frameRate: config.moveFrameRate,
        repeat: -1,
      });
    }
    if (!anims.exists(attackKey)) {
      anims.create({
        key: attackKey,
        frames: anims.generateFrameNumbers(BOSS_VISUAL_ATLAS.textureKey, {
          frames: [start + 3, start + 4, start + 5],
        }),
        frameRate: config.attackFrameRate,
        repeat: -1,
      });
    }
  });
}
