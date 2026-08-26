import { DEFAULT_STAGE_ID, STAGE_IDS } from '../data/stages';
import type { GameSaveData, StageId } from '../types';

export function getUnlockedStageIds(save: GameSaveData): StageId[] {
  return normalizeStageIds(save.unlockedStageIds, [DEFAULT_STAGE_ID]);
}

export function getClearedStageIds(save: GameSaveData): StageId[] {
  return normalizeStageIds(save.clearedStageIds, []);
}

export function isStageUnlocked(save: GameSaveData, stageId: StageId): boolean {
  return getUnlockedStageIds(save).includes(stageId);
}

export function markStageCleared(save: GameSaveData, stageId: StageId): {
  save: GameSaveData;
  newlyUnlockedStageId: StageId | null;
} {
  const clearedStageIds = addStageId(getClearedStageIds(save), stageId);
  const unlockedStageIds = getUnlockedStageIds(save);
  const nextStageId = stageId === 'stage-1' ? 'stage-2' : null;
  const newlyUnlockedStageId = nextStageId && !unlockedStageIds.includes(nextStageId) ? nextStageId : null;

  return {
    save: {
      ...save,
      clearedStageIds,
      unlockedStageIds: newlyUnlockedStageId ? addStageId(unlockedStageIds, newlyUnlockedStageId) : unlockedStageIds,
    },
    newlyUnlockedStageId,
  };
}

function normalizeStageIds(value: unknown, fallback: StageId[]): StageId[] {
  const ids = Array.isArray(value) ? value : fallback;
  return STAGE_IDS.filter((stageId) => ids.includes(stageId));
}

function addStageId(stageIds: StageId[], stageId: StageId): StageId[] {
  return STAGE_IDS.filter((candidate) => candidate === stageId || stageIds.includes(candidate));
}
