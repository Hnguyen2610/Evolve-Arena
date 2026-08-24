import { XP_BALANCE } from '../config/balance';

export function getRequiredXp(level: number): number {
  return Math.floor(XP_BALANCE.baseXp * Math.pow(Math.max(1, level), XP_BALANCE.growthFactor));
}

export function addXp(
  currentXp: number,
  level: number,
  gainedXp: number,
): { xp: number; level: number; leveled: boolean; levelsGained: number } {
  let xp = currentXp + gainedXp;
  let nextLevel = level;
  let levelsGained = 0;

  while (xp >= getRequiredXp(nextLevel)) {
    xp -= getRequiredXp(nextLevel);
    nextLevel += 1;
    levelsGained += 1;
  }

  return { xp, level: nextLevel, leveled: levelsGained > 0, levelsGained };
}
