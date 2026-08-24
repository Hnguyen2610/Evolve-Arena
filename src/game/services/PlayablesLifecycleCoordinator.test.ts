import { describe, expect, it, vi } from 'vitest';
import type { GameAudio } from './AudioService';
import { PlayablesLifecycleCoordinator, type LifecycleGame } from './PlayablesLifecycleCoordinator';
import type { Unsubscribe, YouTubePlayablesService } from './YouTubePlayablesService';

interface MockPlatform extends YouTubePlayablesService {
  triggerPause(): void;
  triggerResume(): void;
  triggerAudio(enabled: boolean): void;
  pauseListenerCount(): number;
  resumeListenerCount(): number;
}

function createMockPlatform(): MockPlatform {
  const pauseCallbacks = new Set<() => void>();
  const resumeCallbacks = new Set<() => void>();
  const audioCallbacks = new Set<(enabled: boolean) => void>();

  return {
    initialize: vi.fn(async () => undefined),
    isPlayablesEnvironment: vi.fn(() => true),
    signalFirstFrameReady: vi.fn(),
    signalGameReady: vi.fn(),
    loadData: vi.fn(async () => null),
    saveData: vi.fn(async () => undefined),
    sendScore: vi.fn(async () => true),
    isAudioEnabled: vi.fn(() => true),
    onAudioEnabledChange: vi.fn((callback: (enabled: boolean) => void): Unsubscribe => {
      audioCallbacks.add(callback);
      return () => audioCallbacks.delete(callback);
    }),
    onPause: vi.fn((callback: () => void): Unsubscribe => {
      pauseCallbacks.add(callback);
      return () => pauseCallbacks.delete(callback);
    }),
    onResume: vi.fn((callback: () => void): Unsubscribe => {
      resumeCallbacks.add(callback);
      return () => resumeCallbacks.delete(callback);
    }),
    getLanguage: vi.fn(async () => 'en-US'),
    hasSuccessfulLoad: vi.fn(() => true),
    dispose: vi.fn(),
    triggerPause: () => pauseCallbacks.forEach((callback) => callback()),
    triggerResume: () => resumeCallbacks.forEach((callback) => callback()),
    triggerAudio: (enabled: boolean) => audioCallbacks.forEach((callback) => callback(enabled)),
    pauseListenerCount: () => pauseCallbacks.size,
    resumeListenerCount: () => resumeCallbacks.size,
  };
}

function createMockAudio(): GameAudio {
  return {
    muted: false,
    setMuted: vi.fn(),
    setPlatformAudioEnabled: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    play: vi.fn(),
  };
}

function createMockGame(): LifecycleGame {
  return {
    loop: {
      sleep: vi.fn(),
      wake: vi.fn(),
    },
    input: {
      enabled: true,
    },
  };
}

describe('PlayablesLifecycleCoordinator', () => {
  it('binds one stable set of platform listeners across repeated binds', () => {
    const platform = createMockPlatform();
    const coordinator = new PlayablesLifecycleCoordinator({ platform, audio: createMockAudio() });

    coordinator.bind(createMockGame());
    coordinator.bind(createMockGame());

    expect(platform.onPause).toHaveBeenCalledTimes(1);
    expect(platform.onResume).toHaveBeenCalledTimes(1);
    expect(platform.onAudioEnabledChange).toHaveBeenCalledTimes(1);
    expect(platform.pauseListenerCount()).toBe(1);
    expect(platform.resumeListenerCount()).toBe(1);
  });

  it('pauses and resumes the full game loop idempotently', () => {
    const platform = createMockPlatform();
    const audio = createMockAudio();
    const game = createMockGame();
    const saveOnPause = vi.fn(async () => true);
    const coordinator = new PlayablesLifecycleCoordinator({ platform, audio, saveOnPause });
    coordinator.bind(game);

    platform.triggerPause();
    platform.triggerPause();
    expect(game.input?.enabled).toBe(false);
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(saveOnPause).toHaveBeenCalledTimes(1);

    platform.triggerResume();
    platform.triggerResume();
    expect(game.input?.enabled).toBe(true);
    expect(game.loop.wake).toHaveBeenCalledTimes(1);
    expect(game.loop.wake).toHaveBeenCalledWith(true);
    expect(audio.resume).toHaveBeenCalledTimes(1);
  });

  it.each([
    { activeScene: 'MenuScene', gameMode: 'menu' },
    { activeScene: 'GameScene', gameMode: 'playing' },
    { activeScene: 'GameScene', gameMode: 'level-up' },
    { activeScene: 'ResultScene', gameMode: 'game-over' },
  ])('keeps $activeScene/$gameMode ownership outside lifecycle callbacks', (stateOwner) => {
    const platform = createMockPlatform();
    const game = createMockGame();
    const coordinator = new PlayablesLifecycleCoordinator({ platform, audio: createMockAudio() });
    coordinator.bind(game);
    const before = { ...stateOwner };

    platform.triggerPause();
    platform.triggerResume();

    expect(stateOwner).toEqual(before);
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
    expect(game.loop.wake).toHaveBeenCalledTimes(1);
  });

  it('cleans up platform subscriptions when disposed', () => {
    const platform = createMockPlatform();
    const coordinator = new PlayablesLifecycleCoordinator({ platform, audio: createMockAudio() });
    coordinator.bind(createMockGame());

    coordinator.dispose();

    expect(platform.pauseListenerCount()).toBe(0);
    expect(platform.resumeListenerCount()).toBe(0);
  });

  it('forwards platform audio state changes to the shared audio service', () => {
    const platform = createMockPlatform();
    const audio = createMockAudio();
    const coordinator = new PlayablesLifecycleCoordinator({ platform, audio });
    coordinator.bind(createMockGame());

    platform.triggerAudio(false);

    expect(audio.setPlatformAudioEnabled).toHaveBeenCalledWith(false);
  });
});
