import { describe, expect, it } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { StageId } from '../types';
import {
  applyStageVictoryProgression,
  getClearedChapterIds,
  getClearedStageIds,
  getUnlockedStageIds,
  isChapterCleared,
  isStageUnlocked,
  markStageCleared,
} from './StageProgressionSystem';

describe('StageProgressionSystem', () => {
  it('starts with only stage 1 unlocked', () => {
    const save = cloneDefaultSave();

    expect(getUnlockedStageIds(save)).toEqual(['stage-1']);
    expect(getClearedStageIds(save)).toEqual([]);
    expect(isStageUnlocked(save, 'stage-1')).toBe(true);
    expect(isStageUnlocked(save, 'stage-2')).toBe(false);
    expect(isStageUnlocked(save, 'stage-3')).toBe(false);
    expect(getClearedChapterIds(save)).toEqual([]);
  });

  it('clearing stage 1 unlocks stage 2 exactly once', () => {
    const firstClear = markStageCleared(cloneDefaultSave(), 'stage-1');
    const secondClear = markStageCleared(firstClear.save, 'stage-1');

    expect(firstClear.newlyUnlockedStageId).toBe('stage-2');
    expect(firstClear.save.unlockedStageIds).toEqual(['stage-1', 'stage-2']);
    expect(secondClear.newlyUnlockedStageId).toBeNull();
    expect(secondClear.save.clearedStageIds).toEqual(['stage-1']);
  });

  it('clearing stage 2 unlocks stage 3 exactly once', () => {
    const save = { ...cloneDefaultSave(), unlockedStageIds: ['stage-1', 'stage-2'] satisfies StageId[] };
    const outcome = markStageCleared(save, 'stage-2');

    expect(outcome.newlyUnlockedStageId).toBe('stage-3');
    expect(outcome.save.clearedStageIds).toEqual(['stage-2']);
    expect(outcome.save.unlockedStageIds).toEqual(['stage-1', 'stage-2', 'stage-3']);
  });

  it('grants first-clear stage rewards only once', () => {
    const firstClear = applyStageVictoryProgression(cloneDefaultSave(), 'stage-1');
    const secondClear = applyStageVictoryProgression(firstClear.save, 'stage-1');

    expect(firstClear.firstClearedStageId).toBe('stage-1');
    expect(firstClear.stageRewardCoins).toBe(35);
    expect(secondClear.firstClearedStageId).toBeNull();
    expect(secondClear.stageRewardCoins).toBe(0);
    expect(secondClear.save.coins).toBe(firstClear.save.coins);
  });

  it('marks chapter 1 complete and grants reward after clearing all three stages', () => {
    const stage1 = applyStageVictoryProgression(cloneDefaultSave(), 'stage-1');
    const stage2 = applyStageVictoryProgression(stage1.save, 'stage-2');
    const stage3 = applyStageVictoryProgression(stage2.save, 'stage-3');
    const replay = applyStageVictoryProgression(stage3.save, 'stage-3');

    expect(stage3.completedChapterId).toBe('chapter-1');
    expect(stage3.chapterRewardCoins).toBe(120);
    expect(isChapterCleared(stage3.save, 'chapter-1')).toBe(true);
    expect(replay.completedChapterId).toBeNull();
    expect(replay.chapterRewardCoins).toBe(0);
  });
});
