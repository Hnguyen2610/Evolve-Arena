import { afterEach, describe, expect, it, vi } from 'vitest';
import type { YouTubePlayablesService } from './YouTubePlayablesService';
import {
  clearLatestSaveSnapshot,
  clearPendingBestScore,
  getPendingBestScore,
  markPendingBestScore,
  saveLatestSnapshotBestEffort,
  saveSnapshotAndSyncBestScore,
  setLatestSaveSnapshot,
  synchronizePendingBestScore,
} from './PersistenceCoordinator';
import { cloneDefaultSave, type GameStorage } from './StorageService';

function createPlatform(options: { inPlayables?: boolean; scoreResults?: boolean[] } = {}): YouTubePlayablesService {
  const scoreResults = [...(options.scoreResults ?? [true])];
  return {
    initialize: vi.fn(async () => undefined),
    isPlayablesEnvironment: vi.fn(() => options.inPlayables ?? true),
    signalFirstFrameReady: vi.fn(),
    signalGameReady: vi.fn(),
    loadData: vi.fn(async () => null),
    saveData: vi.fn(async () => undefined),
    sendScore: vi.fn(async () => scoreResults.shift() ?? true),
    isAudioEnabled: vi.fn(() => true),
    onAudioEnabledChange: vi.fn(() => () => undefined),
    onPause: vi.fn(() => () => undefined),
    onResume: vi.fn(() => () => undefined),
    getLanguage: vi.fn(async () => 'en-US'),
    hasSuccessfulLoad: vi.fn(() => true),
    dispose: vi.fn(),
  };
}

function createStorage(saveSucceeds: boolean): GameStorage {
  return {
    load: vi.fn(async () => cloneDefaultSave()),
    save: vi.fn(async () => {
      if (!saveSucceeds) {
        throw new Error('save failed');
      }
    }),
  };
}

describe('PersistenceCoordinator pending best score synchronization', () => {
  afterEach(() => {
    clearLatestSaveSnapshot();
    clearPendingBestScore();
  });

  it('clears pending best score when save and sendScore both succeed', async () => {
    const platform = createPlatform();
    markPendingBestScore(2000, platform);

    const saved = await saveSnapshotAndSyncBestScore(createStorage(true), platform, { ...cloneDefaultSave(), bestScore: 2000 });

    expect(saved).toBe(true);
    expect(platform.sendScore).toHaveBeenCalledWith(2000);
    expect(getPendingBestScore()).toBeNull();
  });

  it('retains pending best score and skips sendScore when save fails', async () => {
    const platform = createPlatform();
    markPendingBestScore(2000, platform);

    const saved = await saveSnapshotAndSyncBestScore(createStorage(false), platform, { ...cloneDefaultSave(), bestScore: 2000 });

    expect(saved).toBe(false);
    expect(platform.sendScore).not.toHaveBeenCalled();
    expect(getPendingBestScore()).toBe(2000);
  });

  it('submits retained pending best score after a later successful save checkpoint', async () => {
    const platform = createPlatform();
    markPendingBestScore(2000, platform);
    await saveSnapshotAndSyncBestScore(createStorage(false), platform, { ...cloneDefaultSave(), bestScore: 2000 });

    setLatestSaveSnapshot({ ...cloneDefaultSave(), bestScore: 2000 });
    const saved = await saveLatestSnapshotBestEffort(createStorage(true), platform);

    expect(saved).toBe(true);
    expect(platform.sendScore).toHaveBeenCalledWith(2000);
    expect(getPendingBestScore()).toBeNull();
  });

  it('retains pending best score when sendScore fails after save', async () => {
    const platform = createPlatform({ scoreResults: [false] });
    markPendingBestScore(2000, platform);

    const saved = await saveSnapshotAndSyncBestScore(createStorage(true), platform, { ...cloneDefaultSave(), bestScore: 2000 });

    expect(saved).toBe(true);
    expect(platform.sendScore).toHaveBeenCalledWith(2000);
    expect(getPendingBestScore()).toBe(2000);
  });

  it('clears pending best score when a later sendScore retry succeeds', async () => {
    const platform = createPlatform({ scoreResults: [false, true] });
    markPendingBestScore(2000, platform);

    await synchronizePendingBestScore(platform);
    expect(getPendingBestScore()).toBe(2000);

    await synchronizePendingBestScore(platform);
    expect(getPendingBestScore()).toBeNull();
  });

  it('never downgrades a pending best score from a lower later score', () => {
    const platform = createPlatform();
    markPendingBestScore(5000, platform);
    markPendingBestScore(4000, platform);

    expect(getPendingBestScore()).toBe(5000);
  });

  it('does not create pending YouTube score retries in local mode', () => {
    const platform = createPlatform({ inPlayables: false });

    expect(markPendingBestScore(2000, platform)).toBe(false);
    expect(getPendingBestScore()).toBeNull();
  });
});
