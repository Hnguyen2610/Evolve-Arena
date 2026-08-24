import { describe, expect, it, vi } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { RunResult } from '../types';
import { persistResultAndMaybeSendScore } from './ResultPersistenceSystem';

const baseResult: RunResult = {
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
    const sendScore = vi.fn(async () => true);
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => true),
      sendScore,
    });

    expect(outcome.newBest).toBe(true);
    expect(outcome.persisted).toBe(true);
    expect(outcome.scoreSubmitted).toBe(true);
    expect(sendScore).toHaveBeenCalledWith(1000);
  });

  it('skips score submission when saving the new best fails', async () => {
    const sendScore = vi.fn(async () => true);
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => false),
      sendScore,
    });

    expect(outcome.newBest).toBe(true);
    expect(outcome.persisted).toBe(false);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(sendScore).not.toHaveBeenCalled();
  });

  it('does not submit score when the run is not a new best', async () => {
    const save = { ...cloneDefaultSave(), bestScore: 2500 };
    const sendScore = vi.fn(async () => true);
    const outcome = await persistResultAndMaybeSendScore(save, baseResult, {
      save: vi.fn(async () => true),
      sendScore,
    });

    expect(outcome.newBest).toBe(false);
    expect(outcome.save.bestScore).toBe(2500);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(sendScore).not.toHaveBeenCalled();
  });

  it('keeps the result screen nonfatal when score submission fails after save', async () => {
    const outcome = await persistResultAndMaybeSendScore(cloneDefaultSave(), baseResult, {
      save: vi.fn(async () => true),
      sendScore: vi.fn(async () => false),
    });

    expect(outcome.persisted).toBe(true);
    expect(outcome.scoreSubmitted).toBe(false);
    expect(outcome.save.coins).toBe(baseResult.coinsEarned);
  });
});
