import type { ChapterId, GameSaveData, RunResult, StageId } from '../types';
import { applyStageVictoryProgression } from './StageProgressionSystem';

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
  newlyUnlockedStageId: StageId | null;
  firstClearedStageId: StageId | null;
  stageRewardCoins: number;
  completedChapterId: ChapterId | null;
  chapterRewardCoins: number;
}

export async function persistResultAndMaybeSendScore(
  save: GameSaveData,
  result: RunResult,
  dependencies: ResultPersistenceDependencies,
): Promise<ResultPersistenceOutcome> {
  const newBest = result.score > save.bestScore;
  const scoredSave: GameSaveData = {
    ...save,
    bestScore: Math.max(save.bestScore, result.score),
    coins: save.coins + result.coinsEarned,
  };
  const stageProgression = result.victory
    ? applyStageVictoryProgression(scoredSave, result.stageId)
    : {
      save: scoredSave,
      newlyUnlockedStageId: null,
      firstClearedStageId: null,
      stageRewardCoins: 0,
      completedChapterId: null,
      chapterRewardCoins: 0,
    };
  const nextSave = stageProgression.save;

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
    newlyUnlockedStageId: stageProgression.newlyUnlockedStageId,
    firstClearedStageId: stageProgression.firstClearedStageId,
    stageRewardCoins: stageProgression.stageRewardCoins,
    completedChapterId: stageProgression.completedChapterId,
    chapterRewardCoins: stageProgression.chapterRewardCoins,
  };
}
