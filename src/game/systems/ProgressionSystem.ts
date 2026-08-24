import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import type { GameSaveData, PermanentUpgradeId } from '../types';

export function getPermanentUpgradeCost(id: PermanentUpgradeId, level: number): number {
  const balance = PERMANENT_UPGRADE_BALANCE[id];
  return Math.floor(balance.baseCost * Math.pow(balance.costGrowth, level));
}

export function canBuyPermanentUpgrade(save: GameSaveData, id: PermanentUpgradeId): boolean {
  const level = save.permanentUpgrades[id];
  const balance = PERMANENT_UPGRADE_BALANCE[id];
  return level < balance.maxLevel && save.coins >= getPermanentUpgradeCost(id, level);
}

export function buyPermanentUpgrade(save: GameSaveData, id: PermanentUpgradeId): GameSaveData {
  if (!canBuyPermanentUpgrade(save, id)) {
    return save;
  }

  const level = save.permanentUpgrades[id];
  return {
    ...save,
    coins: save.coins - getPermanentUpgradeCost(id, level),
    permanentUpgrades: {
      ...save.permanentUpgrades,
      [id]: level + 1,
    },
  };
}
