import type { GameSaveData, RunResult } from '../types';

interface ResultPersistenceDependencies {
  save(data: GameSaveData): Promise<boolean>;
  markPendingBestScore(score: number): void;
  synchronizePendingBestScore(): Promise<boolean>;
}

export interface ResultPersistenceOutcome {
  save: GameSaveData;
  newBest: boolean;
  persisted: boolean;
  scoreSubmitted: boolean;
}

export async function persistResultAndMaybeSendScore(
  save: GameSaveData,
  result: RunResult,
  dependencies: ResultPersistenceDependencies,
): Promise<ResultPersistenceOutcome> {
  const newBest = result.score > save.bestScore;
  const nextSave: GameSaveData = {
    ...save,
    bestScore: Math.max(save.bestScore, result.score),
    coins: save.coins + result.coinsEarned,
  };

  if (newBest) {
    dependencies.markPendingBestScore(nextSave.bestScore);
  }
  const persisted = await dependencies.save(nextSave);
  const scoreSubmitted = persisted ? await dependencies.synchronizePendingBestScore() : false;

  return {
    save: nextSave,
    newBest,
    persisted,
    scoreSubmitted,
  };
}
