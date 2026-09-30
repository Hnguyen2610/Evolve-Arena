import { describe, expect, it, vi } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { RunResult, StageId } from '../types';
import { persistResultAndMaybeSendScore } from './ResultPersistenceSystem';

const baseResult: RunResult = {
  stageId: 'stage-1',
  chapterId: 'chapter-1',
  victory: false,
  score: 1000,
  kills: 20,
  eliteKills: 2,
  bossDefeated: false,
  survivalSeconds: 75,
  coinsEarned: 12,
  playerLevel: 5,
  damageTaken: 200,
  energyNodesDestroyed: 0,
  energyNodePressureHits: 0,
  arenaShifts: 0,
  overloadEvents: 0,
  overloadHits: 0,
  overloadDamageTaken: 0,
  conductorBossStaggeredByPulse: 0,
};

describe('persistResultAndMaybeSendScore', () => {
  it('sends a new best score only after the save succeeds', async () => {
    const markPendingBestScore = vi.fn();
    const synchronizePendingBestScore = vi.fn(async () => true);
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => true),
      markPendingBestScore,
      synchronizePendingBestScore,
    });

    expect(outcome.newBest).toBe(true);
    expect(outcome.persisted).toBe(true);
    expect(outcome.scoreSubmitted).toBe(true);
    expect(markPendingBestScore).toHaveBeenCalledWith(1000);
    expect(synchronizePendingBestScore).toHaveBeenCalledTimes(1);
  });

  it('skips score submission when saving the new best fails', async () => {
    const synchronizePendingBestScore = vi.fn(async () => true);
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => false),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore,
    });

    expect(outcome.newBest).toBe(true);
    expect(outcome.persisted).toBe(false);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(synchronizePendingBestScore).not.toHaveBeenCalled();
  });

  it('does not submit score when the run is not a new best', async () => {
    const save = { ...cloneDefaultSave(), bestScore: 2500 };
    const markPendingBestScore = vi.fn();
    const outcome = await persistResultAndMaybeSendScore(save, baseResult, {
      save: vi.fn(async () => true),
      markPendingBestScore,
      synchronizePendingBestScore: vi.fn(async () => false),
    });

    expect(outcome.newBest).toBe(false);
    expect(outcome.save.bestScore).toBe(2500);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(markPendingBestScore).not.toHaveBeenCalled();
  });

  it('keeps the result screen nonfatal when score submission fails after save', async () => {
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => false),
    });

    expect(outcome.persisted).toBe(true);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(outcome.save.coins).toBe(baseResult.coinsEarned);
  });

  it('unlocks stage 2 after a stage 1 victory', async () => {
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), { ...baseResult, victory: true, bossDefeated: true }, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });

    expect(outcome.newlyUnlockedStageId).toBe('stage-2');
    expect(outcome.firstClearedStageId).toBe('stage-1');
    expect(outcome.stageRewardCoins).toBe(35);
    expect(outcome.save.clearedStageIds).toEqual(['stage-1']);
    expect(outcome.save.unlockedStageIds).toEqual(['stage-1', 'stage-2']);
    expect(outcome.save.coins).toBe(baseResult.coinsEarned + 35);
  });

  it('does not unlock another stage after a defeat', async () => {
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });

    expect(outcome.newlyUnlockedStageId).toBeNull();
    expect(outcome.save.clearedStageIds).toEqual([]);
    expect(outcome.save.unlockedStageIds).toEqual(['stage-1']);
    expect(outcome.stageRewardCoins).toBe(0);
  });

  it('unlocks stage 3 and grants the stage 2 first-clear reward once', async () => {
    const save = { ...cloneDefaultSave(), unlockedStageIds: ['stage-1', 'stage-2'] satisfies StageId[] };
    const result = { ...baseResult, stageId: 'stage-2' as const, victory: true, bossDefeated: true };
    const outcome = await persistResultAndMaybeSendScore(save, result, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });
    const replay = await persistResultAndMaybeSendScore(outcome.save, result, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });

    expect(outcome.newlyUnlockedStageId).toBe('stage-3');
    expect(outcome.stageRewardCoins).toBe(55);
    expect(replay.stageRewardCoins).toBe(0);
    expect(replay.newlyUnlockedStageId).toBeNull();
  });

  it('grants the chapter completion reward once after a stage 3 victory', async () => {
    const save = {
      ...cloneDefaultSave(),
      coins: 10,
      unlockedStageIds: ['stage-1', 'stage-2', 'stage-3'] satisfies StageId[],
      clearedStageIds: ['stage-1', 'stage-2'] satisfies StageId[],
    };
    const result = { ...baseResult, stageId: 'stage-3' as const, victory: true, bossDefeated: true, coinsEarned: 20 };
    const outcome = await persistResultAndMaybeSendScore(save, result, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });
    const replay = await persistResultAndMaybeSendScore(outcome.save, result, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });

    expect(outcome.completedChapterId).toBe('chapter-1');
    expect(outcome.stageRewardCoins).toBe(80);
    expect(outcome.chapterRewardCoins).toBe(120);
    expect(outcome.save.coins).toBe(230);
    expect(replay.completedChapterId).toBeNull();
    expect(replay.chapterRewardCoins).toBe(0);
  });

  it('persists stage mastery and records without changing global best score semantics', async () => {
    const save = { ...cloneDefaultSave(), bestScore: 3000 };
    const result = {
      ...baseResult,
      victory: true,
      bossDefeated: true,
      score: 2200,
      survivalSeconds: 100,
      damageTaken: 120,
    };
    const markPendingBestScore = vi.fn();
    const outcome = await persistResultAndMaybeSendScore(save, result, {
      save: vi.fn(async () => true),
      markPendingBestScore,
      synchronizePendingBestScore: vi.fn(async () => false),
    });

    expect(outcome.newBest).toBe(false);
    expect(markPendingBestScore).not.toHaveBeenCalled();
    expect(outcome.currentMastery).toBe(3);
    expect(outcome.masteryImproved).toBe(true);
    expect(outcome.newStageBestScore).toBe(true);
    expect(outcome.newBestClearTime).toBe(true);
    expect(outcome.save.bestScore).toBe(3000);
    expect(outcome.save.stageRecords['stage-1']).toEqual({ bestScore: 2200, bestClearTimeSeconds: 100 });
  });

  it('does not downgrade mastery or clear time on a worse replay', async () => {
    const first = await persistResultAndMaybeSendScore(cloneDefaultSave(), {
      ...baseResult,
      victory: true,
      bossDefeated: true,
      score: 2200,
      survivalSeconds: 100,
      damageTaken: 120,
    }, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });
    const replay = await persistResultAndMaybeSendScore(first.save, {
      ...baseResult,
      victory: true,
      bossDefeated: true,
      score: 1800,
      survivalSeconds: 130,
      damageTaken: 260,
    }, {
      save: vi.fn(async () => true),
      markPendingBestScore: vi.fn(),
      synchronizePendingBestScore: vi.fn(async () => true),
    });

    expect(replay.earnedMastery).toBe(1);
    expect(replay.currentMastery).toBe(3);
    expect(replay.masteryImproved).toBe(false);
    expect(replay.newStageBestScore).toBe(false);
    expect(replay.newBestClearTime).toBe(false);
    expect(replay.save.stageRecords['stage-1']).toEqual({ bestScore: 2200, bestClearTimeSeconds: 100 });
  });
});
