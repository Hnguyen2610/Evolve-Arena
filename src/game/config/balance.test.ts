import { describe, expect, it } from 'vitest';
import { BASE_PLAYER_STATS, BOSS_BALANCE } from './balance';
import { UPGRADES } from '../data/upgrades';

describe('Pass 7A balance guardrails', () => {
  it('keeps boss entry recovery below a full heal', () => {
    expect(BOSS_BALANCE.entryHeal).toBeGreaterThan(0);
    expect(BOSS_BALANCE.entryHeal).toBeLessThan(BASE_PLAYER_STATS.maxHealth);
    expect(BOSS_BALANCE.entryHeal).toBeLessThanOrEqual(100);
  });

  it('keeps defensive upgrades viable without restoring old extreme scaling', () => {
    const maxHp = UPGRADES.find((upgrade) => upgrade.id === 'max-hp');
    const armor = UPGRADES.find((upgrade) => upgrade.id === 'armor');
    const lifesteal = UPGRADES.find((upgrade) => upgrade.id === 'lifesteal');

    const stats = { ...BASE_PLAYER_STATS };
    maxHp?.apply(stats, 1);
    armor?.apply(stats, 1);
    lifesteal?.apply(stats, 1);

    expect(stats.maxHealth).toBe(BASE_PLAYER_STATS.maxHealth + 28);
    expect(stats.armor).toBe(BASE_PLAYER_STATS.armor + 2);
    expect(stats.lifesteal).toBeCloseTo(0.014);
  });
});

describe('Pass 7B balance guardrails', () => {
  function requireUpgrade(id: string) {
    const upgrade = UPGRADES.find((candidate) => candidate.id === id);
    expect(upgrade).toBeDefined();
    return upgrade!;
  }

  it('keeps attack-speed scaling monotonic without exceeding the previous amplifier curve', () => {
    const attackSpeed = requireUpgrade('attack-speed');
    const stats = { ...BASE_PLAYER_STATS };

    attackSpeed.apply(stats, 1);
    expect(stats.attackSpeed).toBeCloseTo(BASE_PLAYER_STATS.attackSpeed * 1.14);

    attackSpeed.apply(stats, 2);
    expect(stats.attackSpeed).toBeCloseTo(BASE_PLAYER_STATS.attackSpeed * 1.14 * 1.14);
    expect(stats.attackSpeed).toBeLessThan(BASE_PLAYER_STATS.attackSpeed * 1.16 * 1.16);
  });

  it('gives Vital Core a meaningful mistake buffer with immediate capped healing', () => {
    const maxHp = requireUpgrade('max-hp');
    const stats = { ...BASE_PLAYER_STATS, currentHealth: BASE_PLAYER_STATS.currentHealth - 80 };

    maxHp.apply(stats, 1);

    expect(stats.maxHealth).toBe(BASE_PLAYER_STATS.maxHealth + 28);
    expect(stats.currentHealth).toBe(BASE_PLAYER_STATS.currentHealth - 52);
  });

  it('improves Magnet Field utility value without changing base pickup range', () => {
    const magnet = requireUpgrade('magnet');
    const stats = { ...BASE_PLAYER_STATS };

    magnet.apply(stats, 1);
    magnet.apply(stats, 2);

    expect(BASE_PLAYER_STATS.magnetRange).toBe(260);
    expect(stats.magnetRange).toBe(BASE_PLAYER_STATS.magnetRange + 140);
  });
});
