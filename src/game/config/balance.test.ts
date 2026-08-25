import { describe, expect, it } from 'vitest';
import { BASE_PLAYER_STATS, BOSS_BALANCE } from './balance';
import { UPGRADES } from '../data/upgrades';

describe('Pass 7A balance guardrails', () => {
  it('keeps boss entry recovery below a full heal', () => {
    expect(BOSS_BALANCE.entryHeal).toBeGreaterThan(0);
    expect(BOSS_BALANCE.entryHeal).toBeLessThan(BASE_PLAYER_STATS.maxHealth);
  });

  it('keeps defensive upgrades viable without restoring old extreme scaling', () => {
    const maxHp = UPGRADES.find((upgrade) => upgrade.id === 'max-hp');
    const armor = UPGRADES.find((upgrade) => upgrade.id === 'armor');
    const lifesteal = UPGRADES.find((upgrade) => upgrade.id === 'lifesteal');

    const stats = { ...BASE_PLAYER_STATS };
    maxHp?.apply(stats, 1);
    armor?.apply(stats, 1);
    lifesteal?.apply(stats, 1);

    expect(stats.maxHealth).toBe(BASE_PLAYER_STATS.maxHealth + 24);
    expect(stats.armor).toBe(BASE_PLAYER_STATS.armor + 2);
    expect(stats.lifesteal).toBeCloseTo(0.014);
  });
});
