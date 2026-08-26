import { getStageDefinition } from '../data/stages';
import type { EnemyType, StageDefinition, StageId } from '../types';

export interface DifficultySnapshot {
  spawnIntervalMs: number;
  maxEnemies: number;
  enemyTypes: EnemyType[];
  eliteChance: number;
  swarmPackSize: number;
}

export function getDifficulty(
  elapsedSeconds: number,
  playerLevel: number,
  stage: StageDefinition | StageId = 'stage-1',
): DifficultySnapshot {
  const definition = typeof stage === 'string' ? getStageDefinition(stage) : stage;
  const t = Math.max(0, elapsedSeconds);
  const levelPressure = Math.min(10, playerLevel) * 0.012;

  const enemyTypes = definition.enemyUnlocks
    .filter((unlock) => t >= unlock.atSeconds)
    .flatMap((unlock) => unlock.types);

  return {
    spawnIntervalMs: Math.max(520, (1650 - t * 3.6 - playerLevel * 5) * definition.spawnIntervalMultiplier),
    maxEnemies: Math.min(56, 7 + Math.floor(t / 8) + playerLevel + definition.maxEnemyBonus),
    enemyTypes: enemyTypes.length > 0 ? enemyTypes : ['basic'],
    eliteChance: t < 70 ? 0 : Math.min(0.24, 0.04 + (t - 70) * 0.003 + levelPressure + definition.eliteChanceBonus),
    swarmPackSize: t >= 58 ? Math.min(8, 3 + Math.floor((t - 58) / 12)) : 1,
  };
}
