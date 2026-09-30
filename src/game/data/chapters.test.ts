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

  it('maps Chapter 2 to stages 4 and 5 (Stage 6 is out of scope for this pass)', () => {
    expect(CHAPTER_DEFINITIONS['chapter-2'].stageIds).toEqual(['stage-4', 'stage-5']);
    expect(CHAPTER_DEFINITIONS['chapter-2'].unlocksAfterChapterId).toBe('chapter-1');
    expect(CHAPTER_DEFINITIONS['chapter-2'].completeWhenAllStagesCleared).toBe(false);
    expect(getChapterForStage('stage-4').id).toBe('chapter-2');
    expect(getChapterForStage('stage-5').id).toBe('chapter-2');
  });
});
