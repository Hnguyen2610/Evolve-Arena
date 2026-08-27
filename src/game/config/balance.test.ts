import { describe, expect, it } from 'vitest';
import {
  BASE_PLAYER_STATS,
  BOSS_BALANCE,
  calculateProjectileVolleyDamageScale,
  calculateProjectileVolleyEffectiveCount,
  createPlayerStats,
  PERMANENT_UPGRADE_BALANCE,
} from './balance';
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

describe('Pass 10.1 permanent progression guardrails', () => {
  it('keeps permanent formulas monotonic with restrained high damage scaling', () => {
    expect(PERMANENT_UPGRADE_BALANCE.damage.effectPerLevel).toBe(0.04);
    expect(PERMANENT_UPGRADE_BALANCE.health.effectPerLevel).toBe(10);
    expect(PERMANENT_UPGRADE_BALANCE.speed.effectPerLevel).toBe(0.025);

    const fresh = createPlayerStats({ damage: 0, health: 0, speed: 0 });
    const low = createPlayerStats({ damage: 2, health: 1, speed: 1 });
    const mid = createPlayerStats({ damage: 4, health: 2, speed: 2 });
    const high = createPlayerStats({ damage: 8, health: 4, speed: 4 });

    expect(fresh.damage).toBeCloseTo(24);
    expect(low.damage).toBeCloseTo(25.92);
    expect(mid.damage).toBeCloseTo(27.84);
    expect(high.damage).toBeCloseTo(31.68);
    expect(high.damage).toBeLessThan(24 * 1.48);

    expect(fresh.maxHealth).toBe(240);
    expect(low.maxHealth).toBe(250);
    expect(mid.maxHealth).toBe(260);
    expect(high.maxHealth).toBe(280);

    expect(fresh.movementSpeed).toBeCloseTo(255);
    expect(low.movementSpeed).toBeCloseTo(261.375);
    expect(mid.movementSpeed).toBeCloseTo(267.75);
    expect(high.movementSpeed).toBeCloseTo(280.5);
  });
});

describe('Pass 10.1.1 in-run projectile guardrails', () => {
  it('keeps Extra Shot visually additive while applying diminishing single-target volley damage', () => {
    expect(calculateProjectileVolleyDamageScale(1)).toBe(1);
    expect(calculateProjectileVolleyEffectiveCount(1)).toBe(1);

    expect(calculateProjectileVolleyEffectiveCount(2)).toBeCloseTo(1.62);
    expect(calculateProjectileVolleyEffectiveCount(3)).toBeCloseTo(2.116);
    expect(calculateProjectileVolleyEffectiveCount(4)).toBeCloseTo(2.5128);
    expect(calculateProjectileVolleyEffectiveCount(5)).toBeCloseTo(2.83024);

    expect(calculateProjectileVolleyDamageScale(2)).toBeCloseTo(0.81);
    expect(calculateProjectileVolleyDamageScale(3)).toBeCloseTo(0.705333);
    expect(calculateProjectileVolleyDamageScale(4)).toBeCloseTo(0.6282);
    expect(calculateProjectileVolleyDamageScale(5)).toBeCloseTo(0.566048);
  });

  it('reduces later Extra Shot marginal single-target value without changing projectile count', () => {
    const firstExtra = calculateProjectileVolleyEffectiveCount(2) - calculateProjectileVolleyEffectiveCount(1);
    const secondExtra = calculateProjectileVolleyEffectiveCount(3) - calculateProjectileVolleyEffectiveCount(2);
    const thirdExtra = calculateProjectileVolleyEffectiveCount(4) - calculateProjectileVolleyEffectiveCount(3);

    expect(firstExtra).toBeGreaterThan(0.6);
    expect(secondExtra).toBeLessThan(firstExtra);
    expect(thirdExtra).toBeLessThan(secondExtra);
  });
});
