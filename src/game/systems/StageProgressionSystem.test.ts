import { describe, expect, it } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { StageId } from '../types';
import { getClearedStageIds, getUnlockedStageIds, isStageUnlocked, markStageCleared } from './StageProgressionSystem';

describe('StageProgressionSystem', () => {
  it('starts with only stage 1 unlocked', () => {
    const save = cloneDefaultSave();

    expect(getUnlockedStageIds(save)).toEqual(['stage-1']);
    expect(getClearedStageIds(save)).toEqual([]);
    expect(isStageUnlocked(save, 'stage-1')).toBe(true);
    expect(isStageUnlocked(save, 'stage-2')).toBe(false);
  });

  it('clearing stage 1 unlocks stage 2 exactly once', () => {
    const firstClear = markStageCleared(cloneDefaultSave(), 'stage-1');
    const secondClear = markStageCleared(firstClear.save, 'stage-1');

    expect(firstClear.newlyUnlockedStageId).toBe('stage-2');
    expect(firstClear.save.unlockedStageIds).toEqual(['stage-1', 'stage-2']);
    expect(secondClear.newlyUnlockedStageId).toBeNull();
    expect(secondClear.save.clearedStageIds).toEqual(['stage-1']);
  });

  it('clearing stage 2 records completion without inventing stage 3', () => {
    const save = { ...cloneDefaultSave(), unlockedStageIds: ['stage-1', 'stage-2'] satisfies StageId[] };
    const outcome = markStageCleared(save, 'stage-2');

    expect(outcome.newlyUnlockedStageId).toBeNull();
    expect(outcome.save.clearedStageIds).toEqual(['stage-2']);
    expect(outcome.save.unlockedStageIds).toEqual(['stage-1', 'stage-2']);
  });
});
