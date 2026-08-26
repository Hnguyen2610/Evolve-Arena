import { describe, expect, it, vi } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { RunResult } from '../types';
import { persistResultAndMaybeSendScore } from './ResultPersistenceSystem';

const baseResult: RunResult = {
  stageId: 'stage-1',
  victory: false,
  score: 1000,
  kills: 20,
  eliteKills: 2,
  bossDefeated: false,
  survivalSeconds: 75,
  coinsEarned: 12,
  playerLevel: 5,
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
    expect(outcome.save.clearedStageIds).toEqual(['stage-1']);
    expect(outcome.save.unlockedStageIds).toEqual(['stage-1', 'stage-2']);
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
  });
});
