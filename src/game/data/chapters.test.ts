import { describe, expect, it } from 'vitest';
import { CHAPTER_DEFINITIONS, getChapterForStage } from './chapters';

describe('chapters', () => {
  it('maps Chapter 1 to the first three stages in order', () => {
    expect(CHAPTER_DEFINITIONS['chapter-1'].stageIds).toEqual(['stage-1', 'stage-2', 'stage-3']);
  });

  it('resolves every Chapter 1 stage back to Chapter 1', () => {
    expect(getChapterForStage('stage-1').id).toBe('chapter-1');
    expect(getChapterForStage('stage-2').id).toBe('chapter-1');
    expect(getChapterForStage('stage-3').id).toBe('chapter-1');
  });

  it('defines Chapter 2 as an in-progress Stage 4 foundation', () => {
    expect(CHAPTER_DEFINITIONS['chapter-2'].stageIds).toEqual(['stage-4']);
    expect(CHAPTER_DEFINITIONS['chapter-2'].unlocksAfterChapterId).toBe('chapter-1');
    expect(CHAPTER_DEFINITIONS['chapter-2'].completeWhenAllStagesCleared).toBe(false);
    expect(getChapterForStage('stage-4').id).toBe('chapter-2');
  });
});
