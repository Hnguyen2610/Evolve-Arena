import type { ChapterDefinition, ChapterId, StageId } from '../types';

export const CHAPTER_DEFINITIONS: Record<ChapterId, ChapterDefinition> = {
  'chapter-1': {
    id: 'chapter-1',
    number: 1,
    name: 'Neon Ascension',
    subtitle: 'Three arenas to stabilize the Core Forge.',
    stageIds: ['stage-1', 'stage-2', 'stage-3'],
    completionReward: 120,
    completeWhenAllStagesCleared: true,
  },
  'chapter-2': {
    id: 'chapter-2',
    number: 2,
    name: 'Overdrive Sector',
    subtitle: 'Adaptive grids and unstable combat protocols.',
    stageIds: ['stage-4'],
    unlocksAfterChapterId: 'chapter-1',
    completionReward: 0,
    completeWhenAllStagesCleared: false,
  },
};

export const CHAPTER_IDS: ChapterId[] = ['chapter-1', 'chapter-2'];
export const DEFAULT_CHAPTER_ID: ChapterId = 'chapter-1';

export function getChapterDefinition(chapterId: ChapterId): ChapterDefinition {
  return CHAPTER_DEFINITIONS[chapterId];
}

export function getChapterForStage(stageId: StageId): ChapterDefinition {
  const chapter = CHAPTER_IDS.map((id) => CHAPTER_DEFINITIONS[id]).find((definition) => definition.stageIds.includes(stageId));
  return chapter ?? CHAPTER_DEFINITIONS[DEFAULT_CHAPTER_ID];
}

export function isChapterId(value: unknown): value is ChapterId {
  return typeof value === 'string' && CHAPTER_IDS.includes(value as ChapterId);
}
