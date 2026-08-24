import type { PermanentUpgradeState, PlayerStats } from '../types';

export const BASE_PLAYER_STATS: PlayerStats = {
  maxHealth: 120,
  currentHealth: 120,
  movementSpeed: 245,
  damage: 18,
  attackSpeed: 1.35,
  attackRange: 390,
  projectileSpeed: 620,
  projectileCount: 1,
  projectileSize: 1,
  criticalChance: 0.06,
  criticalDamage: 1.8,
  magnetRange: 135,
  armor: 0,
  lifesteal: 0,
  knockback: 80,
  piercing: 0,
  explosionOnKill: 0,
  chainReaction: 0,
  projectileSpread: 12,
};

export const XP_BALANCE = {
  baseXp: 18,
  growthFactor: 1.42,
};

export const COIN_BALANCE = {
  scoreDivisor: 95,
  killDivisor: 8,
  victoryBonus: 45,
};

export const PERMANENT_UPGRADE_BALANCE: Record<keyof PermanentUpgradeState, {
  name: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effectPerLevel: number;
}> = {
  damage: { name: 'Damage', maxLevel: 20, baseCost: 45, costGrowth: 1.34, effectPerLevel: 0.06 },
  health: { name: 'Health', maxLevel: 20, baseCost: 40, costGrowth: 1.32, effectPerLevel: 10 },
  speed: { name: 'Speed', maxLevel: 15, baseCost: 50, costGrowth: 1.38, effectPerLevel: 0.025 },
};

export function createPlayerStats(permanent: PermanentUpgradeState): PlayerStats {
  const stats = { ...BASE_PLAYER_STATS };
  stats.damage *= 1 + permanent.damage * PERMANENT_UPGRADE_BALANCE.damage.effectPerLevel;
  stats.maxHealth += permanent.health * PERMANENT_UPGRADE_BALANCE.health.effectPerLevel;
  stats.currentHealth = stats.maxHealth;
  stats.movementSpeed *= 1 + permanent.speed * PERMANENT_UPGRADE_BALANCE.speed.effectPerLevel;
  return stats;
}
