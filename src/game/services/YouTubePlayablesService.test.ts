import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSaveData, serializeSaveData, YouTubeGameStorage } from './StorageService';
import { BrowserYouTubePlayablesService } from './YouTubePlayablesService';
import { cloneDefaultSave } from './StorageService';

type GlobalWithSdk = typeof globalThis & { ytgame?: typeof ytgame };

interface MockSdkState {
  calls: string[];
  saves: string[];
  scores: number[];
  failLoad: boolean;
  failSave: boolean;
  failScore: boolean;
  pauseCallback: (() => void) | null;
  resumeCallback: (() => void) | null;
  audioCallback: ((enabled: boolean) => void) | null;
}

function installMockSdk(stateOverrides: Partial<MockSdkState> = {}): MockSdkState {
  const state: MockSdkState = {
    calls: [],
    saves: [],
    scores: [],
    failLoad: false,
    failSave: false,
    failScore: false,
    pauseCallback: null,
    resumeCallback: null,
    audioCallback: null,
    ...stateOverrides,
  };

  const sdk = {
    SDK_VERSION: 'test',
    IN_PLAYABLES_ENV: true,
    SdkErrorType: {
      UNKNOWN: 0,
      API_UNAVAILABLE: 1,
      INVALID_PARAMS: 2,
      SIZE_LIMIT_EXCEEDED: 3,
    },
    SdkError: class extends Error {
      errorType = 0;
    },
    engagement: {
      sendScore: vi.fn(async (score: ytgame.engagement.Score) => {
        state.calls.push('sendScore');
        if (state.failScore) {
          throw new Error('score failed');
        }
        state.scores.push(score.value);
      }),
    },
    game: {
      firstFrameReady: vi.fn(() => state.calls.push('firstFrameReady')),
      gameReady: vi.fn(() => state.calls.push('gameReady')),
      loadData: vi.fn(async () => {
        state.calls.push('loadData');
        if (state.failLoad) {
          throw new Error('load failed');
        }
        return serializeSaveData({ ...cloneDefaultSave(), bestScore: 123 });
      }),
      saveData: vi.fn(async (data: string) => {
        state.calls.push('saveData');
        if (state.failSave) {
          throw new Error('save failed');
        }
        state.saves.push(data);
      }),
    },
    health: {
      logError: vi.fn(() => state.calls.push('logError')),
      logWarning: vi.fn(() => state.calls.push('logWarning')),
    },
    system: {
      isAudioEnabled: vi.fn(() => true),
      onAudioEnabledChange: vi.fn((callback: (enabled: boolean) => void) => {
        state.audioCallback = callback;
        return () => {
          state.audioCallback = null;
        };
      }),
      onPause: vi.fn((callback: () => void) => {
        state.pauseCallback = callback;
        return () => {
          state.pauseCallback = null;
        };
      }),
      onResume: vi.fn((callback: () => void) => {
        state.resumeCallback = callback;
        return () => {
          state.resumeCallback = null;
        };
      }),
      getLanguage: vi.fn(async () => 'en-US'),
    },
  } as unknown as typeof ytgame;

  Object.defineProperty(globalThis, 'ytgame', {
    value: sdk,
    configurable: true,
  });

  return state;
}

describe('BrowserYouTubePlayablesService', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis as GlobalWithSdk, 'ytgame');
    vi.restoreAllMocks();
  });

  it('orders ready signals and keeps them idempotent', () => {
    const state = installMockSdk();
    const service = new BrowserYouTubePlayablesService();

    service.signalGameReady();
    service.signalFirstFrameReady();
    service.signalGameReady();

    expect(state.calls.filter((call) => call === 'firstFrameReady')).toHaveLength(1);
    expect(state.calls.filter((call) => call === 'gameReady')).toHaveLength(1);
    expect(state.calls.slice(0, 2)).toEqual(['firstFrameReady', 'gameReady']);
  });

  it('uses cloud load before saving through YouTubeGameStorage', async () => {
    const state = installMockSdk();
    const service = new BrowserYouTubePlayablesService();
    const storage = new YouTubeGameStorage(service);

    const save = await storage.load();
    expect(save.bestScore).toBe(123);

    await storage.save({ ...save, coins: 77 });

    expect(state.calls).toContain('loadData');
    expect(state.calls).toContain('saveData');
    expect(parseSaveData(state.saves[0]).coins).toBe(77);
  });

  it('blocks cloud save before a successful cloud load', async () => {
    installMockSdk();
    const service = new BrowserYouTubePlayablesService();
    const storage = new YouTubeGameStorage(service);

    await expect(storage.save(cloneDefaultSave())).rejects.toThrow('before successful loadData');
  });

  it('does not overwrite cloud data after load failure', async () => {
    const state = installMockSdk({ failLoad: true });
    const service = new BrowserYouTubePlayablesService();
    const storage = new YouTubeGameStorage(service);

    const save = await storage.load();
    expect(save).toEqual(cloneDefaultSave());
    await expect(storage.save({ ...save, coins: 10 })).rejects.toThrow('before successful loadData');
    expect(state.calls).not.toContain('saveData');
  });

  it('treats score reporting failures as nonfatal', async () => {
    installMockSdk({ failScore: true });
    const service = new BrowserYouTubePlayablesService();

    await expect(service.sendScore(1000)).resolves.toBe(false);
  });
});
