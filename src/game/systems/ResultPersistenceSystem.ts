import type { GameSaveData, RunResult } from '../types';

interface ResultPersistenceDependencies {
  save(data: GameSaveData): Promise<boolean>;
  sendScore(score: number): Promise<boolean>;
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

  const persisted = await dependencies.save(nextSave);
  const scoreSubmitted = newBest && persisted ? await dependencies.sendScore(nextSave.bestScore) : false;

  return {
    save: nextSave,
    newBest,
    persisted,
    scoreSubmitted,
  };
}
