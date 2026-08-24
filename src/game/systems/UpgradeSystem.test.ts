import { describe, expect, it } from 'vitest';
import { BASE_PLAYER_STATS } from '../config/balance';
import { UPGRADES } from '../data/upgrades';
import { applyUpgrade, getAvailableUpgrades, pickUpgradeOptions } from './UpgradeSystem';
import type { UpgradeState } from '../types';

describe('UpgradeSystem', () => {
  it('filters maxed upgrades', () => {
    const state: UpgradeState = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.maxLevel]));
    expect(getAvailableUpgrades(state)).toHaveLength(0);
  });

  it('picks up to three valid upgrades', () => {
    const options = pickUpgradeOptions({}, 3);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
  });

  it('applies an upgrade and increments its level', () => {
    const stats = { ...BASE_PLAYER_STATS };
    const upgrade = UPGRADES.find((candidate) => candidate.id === 'damage');
    expect(upgrade).toBeDefined();
    const next = applyUpgrade(stats, {}, upgrade!);
    expect(next.damage).toBe(1);
    expect(stats.damage).toBeGreaterThan(BASE_PLAYER_STATS.damage);
  });
});
