import { CHAPTER_DEFINITIONS, CHAPTER_IDS } from '../data/chapters';
import { DEFAULT_STAGE_ID, STAGE_DEFINITIONS, STAGE_IDS } from '../data/stages';
import type { ChapterId, GameSaveData, StageId } from '../types';

export function getUnlockedStageIds(save: GameSaveData): StageId[] {
  return deriveUnlockedStageIds(
    normalizeStageIds(save.unlockedStageIds, [DEFAULT_STAGE_ID]),
    getClearedStageIds(save),
    getClearedChapterIds(save),
  );
}

export function getClearedStageIds(save: GameSaveData): StageId[] {
  return normalizeStageIds(save.clearedStageIds, []);
}

export function getClearedChapterIds(save: GameSaveData): ChapterId[] {
  return normalizeChapterIds(save.clearedChapterIds, []);
}

export function isStageUnlocked(save: GameSaveData, stageId: StageId): boolean {
  return getUnlockedStageIds(save).includes(stageId);
}

export function isChapterCleared(save: GameSaveData, chapterId: ChapterId): boolean {
  return getClearedChapterIds(save).includes(chapterId);
}

export function isChapterAvailable(save: GameSaveData, chapterId: ChapterId): boolean {
  const chapter = CHAPTER_DEFINITIONS[chapterId];
  return !chapter.unlocksAfterChapterId || getClearedChapterIds(save).includes(chapter.unlocksAfterChapterId);
}

export function markStageCleared(save: GameSaveData, stageId: StageId): {
  save: GameSaveData;
  newlyUnlockedStageId: StageId | null;
} {
  const clearedStageIds = addStageId(getClearedStageIds(save), stageId);
  const unlockedStageIds = getUnlockedStageIds(save);
  const nextStageId = STAGE_DEFINITIONS[stageId].unlocksOnClear ?? null;
  const newlyUnlockedStageId = nextStageId && !unlockedStageIds.includes(nextStageId) ? nextStageId : null;

  return {
    save: {
      ...save,
      clearedStageIds,
      unlockedStageIds: newlyUnlockedStageId ? addStageId(unlockedStageIds, newlyUnlockedStageId) : unlockedStageIds,
      clearedChapterIds: getClearedChapterIds(save),
    },
    newlyUnlockedStageId,
  };
}

export function applyStageVictoryProgression(save: GameSaveData, stageId: StageId): {
  save: GameSaveData;
  newlyUnlockedStageId: StageId | null;
  firstClearedStageId: StageId | null;
  stageRewardCoins: number;
  completedChapterId: ChapterId | null;
  chapterRewardCoins: number;
} {
  const wasStageCleared = getClearedStageIds(save).includes(stageId);
  const stageProgression = markStageCleared(save, stageId);
  const nextSave = stageProgression.save;
  const stage = STAGE_DEFINITIONS[stageId];
  const chapter = CHAPTER_DEFINITIONS[stage.chapterId];
  const clearedStageIds = getClearedStageIds(nextSave);
  const clearedChapterIds = getClearedChapterIds(nextSave);
  const chapterCompleted = chapter.completeWhenAllStagesCleared
    && chapter.stageIds.every((chapterStageId) => clearedStageIds.includes(chapterStageId));
  const newlyCompletedChapter = chapterCompleted && !clearedChapterIds.includes(chapter.id);
  const chapterUnlockedStageId = newlyCompletedChapter ? getFirstStageUnlockedByChapter(chapter.id) : null;
  const newlyUnlockedStageId = stageProgression.newlyUnlockedStageId ?? (
    chapterUnlockedStageId && !getUnlockedStageIds(nextSave).includes(chapterUnlockedStageId) ? chapterUnlockedStageId : null
  );
  const stageRewardCoins = wasStageCleared ? 0 : stage.firstClearReward;
  const chapterRewardCoins = newlyCompletedChapter ? chapter.completionReward : 0;

  return {
    save: {
      ...nextSave,
      coins: nextSave.coins + stageRewardCoins + chapterRewardCoins,
      unlockedStageIds: newlyUnlockedStageId ? addStageId(nextSave.unlockedStageIds, newlyUnlockedStageId) : nextSave.unlockedStageIds,
      clearedChapterIds: newlyCompletedChapter ? addChapterId(clearedChapterIds, chapter.id) : clearedChapterIds,
    },
    newlyUnlockedStageId,
    firstClearedStageId: wasStageCleared ? null : stageId,
    stageRewardCoins,
    completedChapterId: newlyCompletedChapter ? chapter.id : null,
    chapterRewardCoins,
  };
}

function normalizeStageIds(value: unknown, fallback: StageId[]): StageId[] {
  const ids = Array.isArray(value) ? value : fallback;
  return STAGE_IDS.filter((stageId) => ids.includes(stageId));
}

function normalizeChapterIds(value: unknown, fallback: ChapterId[]): ChapterId[] {
  const ids = Array.isArray(value) ? value : fallback;
  return CHAPTER_IDS.filter((chapterId) => ids.includes(chapterId));
}

function deriveUnlockedStageIds(
  unlockedStageIds: StageId[],
  clearedStageIds: StageId[],
  clearedChapterIds: ChapterId[],
): StageId[] {
  let derived = [...unlockedStageIds];
  clearedStageIds.forEach((stageId) => {
    const nextStageId = STAGE_DEFINITIONS[stageId].unlocksOnClear;
    if (nextStageId) {
      derived = addStageId(derived, nextStageId);
    }
  });
  CHAPTER_IDS.forEach((chapterId) => {
    const chapter = CHAPTER_DEFINITIONS[chapterId];
    const firstStageId = chapter.stageIds[0];
    if (firstStageId && chapter.unlocksAfterChapterId && clearedChapterIds.includes(chapter.unlocksAfterChapterId)) {
      derived = addStageId(derived, firstStageId);
    }
  });
  return derived;
}

function addStageId(stageIds: StageId[], stageId: StageId): StageId[] {
  return STAGE_IDS.filter((candidate) => candidate === stageId || stageIds.includes(candidate));
}

function addChapterId(chapterIds: ChapterId[], chapterId: ChapterId): ChapterId[] {
  return CHAPTER_IDS.filter((candidate) => candidate === chapterId || chapterIds.includes(candidate));
}

function getFirstStageUnlockedByChapter(chapterId: ChapterId): StageId | null {
  const chapter = CHAPTER_IDS
    .map((candidateId) => CHAPTER_DEFINITIONS[candidateId])
    .find((candidate) => candidate.unlocksAfterChapterId === chapterId);
  return chapter?.stageIds[0] ?? null;
}
