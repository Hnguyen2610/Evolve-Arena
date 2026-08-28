import { describe, expect, it } from 'vitest';
import { cloneDefaultSave, loadSaveOrDefault, parseSaveData, saveBestEffort, type GameStorage } from './StorageService';

describe('StorageService', () => {
  it('returns defaults for missing or corrupted saves', () => {
    expect(parseSaveData(null).coins).toBe(0);
    expect(parseSaveData('{broken').bestScore).toBe(0);
  });

  it('normalizes partial saves', () => {
    const save = parseSaveData(JSON.stringify({ bestScore: 42, coins: 15, permanentUpgrades: { damage: 2 } }));
    expect(save.bestScore).toBe(42);
    expect(save.coins).toBe(15);
    expect(save.permanentUpgrades.damage).toBe(2);
    expect(save.permanentUpgrades.health).toBe(0);
    expect(save.unlockedStageIds).toEqual(['stage-1']);
    expect(save.clearedStageIds).toEqual([]);
    expect(save.clearedChapterIds).toEqual([]);
    expect(save.stageMastery).toEqual({});
    expect(save.stageRecords).toEqual({});
  });

  it('normalizes persisted stage progress', () => {
    const save = parseSaveData(JSON.stringify({
      unlockedStageIds: ['stage-2', 'missing', 'stage-1'],
      clearedStageIds: ['stage-1', 'stage-2', 'missing'],
      clearedChapterIds: ['chapter-1', 'missing'],
    }));

    expect(save.unlockedStageIds).toEqual(['stage-1', 'stage-2', 'stage-3', 'stage-4']);
    expect(save.clearedStageIds).toEqual(['stage-1', 'stage-2']);
    expect(save.clearedChapterIds).toEqual(['chapter-1']);
  });

  it('migrates old stage 1 and 2 clear saves to unlock stage 3 without clearing chapter 1', () => {
    const save = parseSaveData(JSON.stringify({
      unlockedStageIds: ['stage-1', 'stage-2'],
      clearedStageIds: ['stage-1', 'stage-2'],
    }));

    expect(save.unlockedStageIds).toEqual(['stage-1', 'stage-2', 'stage-3']);
    expect(save.clearedChapterIds).toEqual([]);
    expect(save.stageMastery).toEqual({ 'stage-1': 1, 'stage-2': 1 });
    expect(save.stageRecords).toEqual({});
  });

  it('unlocks stage 4 for saves that already completed chapter 1', () => {
    const save = parseSaveData(JSON.stringify({
      unlockedStageIds: ['stage-1', 'stage-2', 'stage-3'],
      clearedStageIds: ['stage-1', 'stage-2', 'stage-3'],
      clearedChapterIds: ['chapter-1'],
    }));

    expect(save.unlockedStageIds).toEqual(['stage-1', 'stage-2', 'stage-3', 'stage-4']);
    expect(save.clearedChapterIds).toEqual(['chapter-1']);
  });

  it('does not infer chapter 1 completion from old stage-only saves', () => {
    const save = parseSaveData(JSON.stringify({
      unlockedStageIds: ['stage-1', 'stage-2', 'stage-3'],
      clearedStageIds: ['stage-1', 'stage-2', 'stage-3'],
    }));

    expect(save.unlockedStageIds).toEqual(['stage-1', 'stage-2', 'stage-3']);
    expect(save.clearedChapterIds).toEqual([]);
  });

  it('normalizes stage mastery and records without awarding fake full mastery', () => {
    const save = parseSaveData(JSON.stringify({
      clearedStageIds: ['stage-1'],
      stageMastery: {
        'stage-1': 9,
        'stage-2': -3,
        missing: 3,
      },
      stageRecords: {
        'stage-1': { bestScore: 1200, bestClearTimeSeconds: 98.26 },
        'stage-2': { bestScore: -20, bestClearTimeSeconds: -1 },
        missing: { bestScore: 9999 },
      },
    }));

    expect(save.stageMastery).toEqual({ 'stage-1': 3 });
    expect(save.stageRecords).toEqual({ 'stage-1': { bestScore: 1200, bestClearTimeSeconds: 98.3 } });
  });

  it('clones default stage arrays independently', () => {
    const first = cloneDefaultSave();
    const second = cloneDefaultSave();

    first.unlockedStageIds.push('stage-2');
    first.clearedChapterIds.push('chapter-1');

    expect(second.unlockedStageIds).toEqual(['stage-1']);
    expect(second.clearedChapterIds).toEqual([]);
  });

  it('clamps permanent upgrade levels to supported maximums', () => {
    const save = parseSaveData(
      JSON.stringify({
        permanentUpgrades: {
          damage: 999999,
          health: -3,
          speed: 999999,
        },
      }),
    );

    expect(save.permanentUpgrades.damage).toBe(20);
    expect(save.permanentUpgrades.health).toBe(0);
    expect(save.permanentUpgrades.speed).toBe(15);
  });

  it('falls back to defaults when a storage adapter cannot load', async () => {
    const throwingStorage: GameStorage = {
      async load() {
        throw new Error('blocked');
      },
      async save() {
        throw new Error('blocked');
      },
    };

    await expect(loadSaveOrDefault(throwingStorage)).resolves.toEqual(cloneDefaultSave());
  });

  it('reports save failures without throwing', async () => {
    const throwingStorage: GameStorage = {
      async load() {
        return cloneDefaultSave();
      },
      async save() {
        throw new Error('quota');
      },
    };

    await expect(saveBestEffort(throwingStorage, cloneDefaultSave())).resolves.toBe(false);
  });
});
