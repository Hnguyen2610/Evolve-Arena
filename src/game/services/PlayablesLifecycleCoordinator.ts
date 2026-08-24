import type { GameAudio } from './AudioService';
import type { Unsubscribe, YouTubePlayablesService } from './YouTubePlayablesService';

export interface LifecycleGame {
  loop: {
    sleep(): void;
    wake(seamless?: boolean): void;
  };
  input?: {
    enabled: boolean;
  };
}

interface PlayablesLifecycleCoordinatorOptions {
  platform: YouTubePlayablesService;
  audio: GameAudio;
  saveOnPause?: () => Promise<boolean> | boolean;
}

export class PlayablesLifecycleCoordinator {
  private game: LifecycleGame | null = null;
  private pausedByPlatform = false;
  private previousInputEnabled: boolean | null = null;
  private unsubscribers: Unsubscribe[] = [];

  constructor(private readonly options: PlayablesLifecycleCoordinatorOptions) {}

  bind(game: LifecycleGame): void {
    this.game = game;
    void this.options.platform.initialize();
    this.options.audio.setPlatformAudioEnabled(this.options.platform.isAudioEnabled());

    if (this.unsubscribers.length > 0) {
      return;
    }

    this.unsubscribers = [
      this.options.platform.onPause(() => this.pause()),
      this.options.platform.onResume(() => this.resume()),
      this.options.platform.onAudioEnabledChange((enabled) => this.options.audio.setPlatformAudioEnabled(enabled)),
    ];
  }

  pause(): void {
    if (this.pausedByPlatform) {
      return;
    }
    this.pausedByPlatform = true;

    if (this.game?.input) {
      this.previousInputEnabled = this.game.input.enabled;
      this.game.input.enabled = false;
    }

    this.options.audio.pause();
    void this.options.saveOnPause?.();
    this.game?.loop.sleep();
  }

  resume(): void {
    if (!this.pausedByPlatform) {
      return;
    }
    this.pausedByPlatform = false;

    if (this.game?.input && this.previousInputEnabled !== null) {
      this.game.input.enabled = this.previousInputEnabled;
    }
    this.previousInputEnabled = null;

    this.options.audio.resume();
    this.game?.loop.wake(true);
  }

  isPaused(): boolean {
    return this.pausedByPlatform;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.game = null;
    this.pausedByPlatform = false;
    this.previousInputEnabled = null;
  }
}
