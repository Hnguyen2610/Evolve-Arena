import type { EnemyType } from '../types';

export interface DifficultySnapshot {
  spawnIntervalMs: number;
  maxEnemies: number;
  enemyTypes: EnemyType[];
  eliteChance: number;
  swarmPackSize: number;
}

export function getDifficulty(elapsedSeconds: number, playerLevel: number): DifficultySnapshot {
  const t = Math.max(0, elapsedSeconds);
  const levelPressure = Math.min(10, playerLevel) * 0.012;

  const enemyTypes: EnemyType[] = ['basic'];
  if (t >= 10) {
    enemyTypes.push('runner');
  }
  if (t >= 25) {
    enemyTypes.push('tank');
  }
  if (t >= 42) {
    enemyTypes.push('ranged');
  }
  if (t >= 58) {
    enemyTypes.push('swarm');
  }

  return {
    spawnIntervalMs: Math.max(260, 940 - t * 7 - playerLevel * 14),
    maxEnemies: Math.min(105, 18 + Math.floor(t / 4) + playerLevel * 2),
    enemyTypes,
    eliteChance: t < 70 ? 0 : Math.min(0.2, 0.04 + (t - 70) * 0.003 + levelPressure),
    swarmPackSize: t >= 58 ? Math.min(8, 3 + Math.floor((t - 58) / 12)) : 1,
  };
}
