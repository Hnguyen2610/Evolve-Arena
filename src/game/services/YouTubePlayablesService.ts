import type { GameSaveData } from '../types';

export interface YouTubePlayablesService {
  initialize(): Promise<void>;
  signalFirstFrame(): void;
  signalGameReady(): void;
  load(): Promise<GameSaveData | null>;
  save(data: GameSaveData): Promise<void>;
  sendScore(score: number): void;
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
}

export class LocalYouTubePlayablesService implements YouTubePlayablesService {
  private pauseCallbacks = new Set<() => void>();
  private resumeCallbacks = new Set<() => void>();

  async initialize(): Promise<void> {
    window.addEventListener('blur', this.handlePause);
    window.addEventListener('focus', this.handleResume);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  signalFirstFrame(): void {
    // Local fallback only; official SDK calls should be added behind this adapter.
  }

  signalGameReady(): void {
    // Local fallback only; official SDK calls should be added behind this adapter.
  }

  async load(): Promise<GameSaveData | null> {
    return null;
  }

  async save(_data: GameSaveData): Promise<void> {
    return;
  }

  sendScore(_score: number): void {
    return;
  }

  onPause(callback: () => void): void {
    this.pauseCallbacks.add(callback);
  }

  onResume(callback: () => void): void {
    this.resumeCallbacks.add(callback);
  }

  dispose(): void {
    window.removeEventListener('blur', this.handlePause);
    window.removeEventListener('focus', this.handleResume);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.pauseCallbacks.clear();
    this.resumeCallbacks.clear();
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.handlePause();
    } else {
      this.handleResume();
    }
  };

  private handlePause = (): void => {
    this.pauseCallbacks.forEach((callback) => callback());
  };

  private handleResume = (): void => {
    this.resumeCallbacks.forEach((callback) => callback());
  };
}
