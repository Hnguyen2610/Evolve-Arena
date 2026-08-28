import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import {
  ENEMY_VISUAL_ATLAS,
  ENEMY_VISUAL_TYPES,
  ENEMY_VISUALS,
  getEnemyVisualAnimationKey,
  getEnemyVisualConfig,
  getEnemyVisualStartFrame,
  type EnemyVisualType,
} from './enemyVisual';

const BOSS_TYPES = ['boss', 'rift-boss', 'forge-boss', 'grid-boss'];

describe('enemyVisual', () => {
  it('covers every current non-boss enemy and stage objective', () => {
    const nonBossTypes = Object.values(ENEMY_DEFINITIONS)
      .filter((definition) => definition.behavior !== 'boss')
      .map((definition) => definition.type)
      .sort();

    expect([...ENEMY_VISUAL_TYPES].sort()).toEqual(nonBossTypes);
    expect(BOSS_TYPES.map((type) => getEnemyVisualConfig(type as keyof typeof ENEMY_DEFINITIONS))).toEqual([null, null, null, null]);
  });

  it('keeps animation keys and atlas rows unique', () => {
    const keys = ENEMY_VISUAL_TYPES.map((enemyType) => getEnemyVisualAnimationKey(enemyType));
    const rows = ENEMY_VISUAL_TYPES.map((enemyType) => ENEMY_VISUALS[enemyType].row);

    expect(new Set(keys).size).toBe(ENEMY_VISUAL_TYPES.length);
    expect(new Set(rows).size).toBe(ENEMY_VISUAL_TYPES.length);
    ENEMY_VISUAL_TYPES.forEach((enemyType) => {
      const config = ENEMY_VISUALS[enemyType];
      expect(config.enemyType).toBe(enemyType);
      expect(getEnemyVisualStartFrame(config)).toBe(config.row * ENEMY_VISUAL_ATLAS.framesPerEnemy);
    });
  });

  it('uses a local compact atlas asset', () => {
    const assetPath = `public/${ENEMY_VISUAL_ATLAS.assetPath}`;

    expect(existsSync(assetPath)).toBe(true);
    expect(statSync(assetPath).size).toBeLessThan(500_000);
  });

  it('keeps enemy visual scale separate from gameplay radii', () => {
    ENEMY_VISUAL_TYPES.forEach((enemyType: EnemyVisualType) => {
      expect(ENEMY_DEFINITIONS[enemyType].radius).toBeGreaterThan(0);
      expect(ENEMY_VISUALS[enemyType].scale).toBeGreaterThan(0);
      expect(ENEMY_VISUALS[enemyType].scale).toBeLessThan(1);
    });
  });
});
