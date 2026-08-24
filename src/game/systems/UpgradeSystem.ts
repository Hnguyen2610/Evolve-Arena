import { UPGRADES } from '../data/upgrades';
import type { PlayerStats, UpgradeDefinition, UpgradeState } from '../types';

export function getUpgradeLevel(state: UpgradeState, upgradeId: string): number {
  return state[upgradeId] ?? 0;
}

export function getAvailableUpgrades(state: UpgradeState): UpgradeDefinition[] {
  return UPGRADES.filter((upgrade) => getUpgradeLevel(state, upgrade.id) < upgrade.maxLevel);
}

export function pickUpgradeOptions(state: UpgradeState, count = 3): UpgradeDefinition[] {
  const pool = [...getAvailableUpgrades(state)];
  const options: UpgradeDefinition[] = [];

  while (pool.length > 0 && options.length < count) {
    const totalWeight = pool.reduce((sum, upgrade) => sum + rarityWeight(upgrade), 0);
    let roll = Math.random() * totalWeight;
    const index = pool.findIndex((upgrade) => {
      roll -= rarityWeight(upgrade);
      return roll <= 0;
    });
    const pickedIndex = index >= 0 ? index : pool.length - 1;
    const [picked] = pool.splice(pickedIndex, 1);
    options.push(picked);
  }

  return options;
}

export function applyUpgrade(
  stats: PlayerStats,
  state: UpgradeState,
  upgrade: UpgradeDefinition,
): UpgradeState {
  const nextLevel = getUpgradeLevel(state, upgrade.id) + 1;
  if (nextLevel > upgrade.maxLevel) {
    return state;
  }

  upgrade.apply(stats, nextLevel);
  return { ...state, [upgrade.id]: nextLevel };
}

function rarityWeight(upgrade: UpgradeDefinition): number {
  if (upgrade.rarity === 'common') {
    return 8;
  }
  if (upgrade.rarity === 'rare') {
    return 4;
  }
  return 2;
}
