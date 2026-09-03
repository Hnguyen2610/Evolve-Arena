import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import {
  BOSS_VISUAL_ATLAS,
  BOSS_VISUAL_TYPES,
  BOSS_VISUALS,
  getBossVisualAnimationKey,
  getBossVisualConfig,
  getBossVisualStartFrame,
  type BossVisualState,
} from './bossVisual';

const NON_BOSS_TYPES = Object.values(ENEMY_DEFINITIONS)
  .filter((definition) => definition.behavior !== 'boss')
  .map((definition) => definition.type);

describe('bossVisual', () => {
  it('covers exactly the current boss definitions', () => {
    const bossTypes = Object.values(ENEMY_DEFINITIONS)
      .filter((definition) => definition.behavior === 'boss')
      .map((definition) => definition.type)
      .sort();

    expect([...BOSS_VISUAL_TYPES].sort()).toEqual(bossTypes);
    expect(NON_BOSS_TYPES.every((type) => getBossVisualConfig(type) === null)).toBe(true);
  });

  it('keeps boss rows and animation keys unique', () => {
    const rows = BOSS_VISUAL_TYPES.map((bossType) => BOSS_VISUALS[bossType].row);
    const states: BossVisualState[] = ['move', 'attack'];
    const keys = BOSS_VISUAL_TYPES.flatMap((bossType) => states.map((state) => getBossVisualAnimationKey(bossType, state)));

    expect(new Set(rows).size).toBe(BOSS_VISUAL_TYPES.length);
    expect(new Set(keys).size).toBe(keys.length);
    BOSS_VISUAL_TYPES.forEach((bossType) => {
      const config = BOSS_VISUALS[bossType];
      expect(config.bossType).toBe(bossType);
      expect(getBossVisualStartFrame(config)).toBe(config.row * BOSS_VISUAL_ATLAS.framesPerBoss);
    });
  });

  it('uses a local compact boss atlas asset', () => {
    const assetPath = `public/${BOSS_VISUAL_ATLAS.assetPath}`;

    expect(existsSync(assetPath)).toBe(true);
    expect(statSync(assetPath).size).toBeLessThan(750_000);
  });

  it('keeps boss visual scale separate from collision radius', () => {
    BOSS_VISUAL_TYPES.forEach((bossType) => {
      expect(ENEMY_DEFINITIONS[bossType].radius).toBeGreaterThanOrEqual(54);
      expect(BOSS_VISUALS[bossType].scale).toBeGreaterThan(0);
      expect(BOSS_VISUALS[bossType].scale).toBeLessThanOrEqual(1.2);
    });
  });
});
