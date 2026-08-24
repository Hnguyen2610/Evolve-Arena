export type Unsubscribe = () => void;

export interface YouTubePlayablesService {
  initialize(): Promise<void>;
  isPlayablesEnvironment(): boolean;
  signalFirstFrameReady(): void;
  signalGameReady(): void;
  loadData(): Promise<string | null>;
  saveData(data: string): Promise<void>;
  sendScore(score: number): Promise<boolean>;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(callback: (enabled: boolean) => void): Unsubscribe;
  onPause(callback: () => void): Unsubscribe;
  onResume(callback: () => void): Unsubscribe;
  getLanguage(): Promise<string | null>;
  hasSuccessfulLoad(): boolean;
  dispose(): void;
}

export class BrowserYouTubePlayablesService implements YouTubePlayablesService {
  private initialized = false;
  private firstFrameReadySent = false;
  private gameReadySent = false;
  private loadSucceeded = false;
  private readonly unsubscribers = new Set<Unsubscribe>();

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  isPlayablesEnvironment(): boolean {
    return this.getSdk()?.IN_PLAYABLES_ENV === true;
  }

  signalFirstFrameReady(): void {
    if (this.firstFrameReadySent) {
      return;
    }
    this.firstFrameReadySent = true;
    this.safeCall(() => this.getSdk()?.game.firstFrameReady());
  }

  signalGameReady(): void {
    if (this.gameReadySent) {
      return;
    }
    this.signalFirstFrameReady();
    this.gameReadySent = true;
    this.safeCall(() => this.getSdk()?.game.gameReady());
  }

  async loadData(): Promise<string | null> {
    if (!this.isPlayablesEnvironment()) {
      this.loadSucceeded = true;
      return null;
    }

    const sdk = this.getSdk();
    if (!sdk) {
      return null;
    }

    try {
      const data = await sdk.game.loadData();
      this.loadSucceeded = true;
      return data || null;
    } catch {
      this.loadSucceeded = false;
      this.safeCall(() => sdk.health.logWarning());
      return null;
    }
  }

  async saveData(data: string): Promise<void> {
    if (!this.isPlayablesEnvironment()) {
      return;
    }

    const sdk = this.getSdk();
    if (!sdk || !this.loadSucceeded) {
      throw new Error('YouTube Playables saveData blocked before successful loadData');
    }

    await sdk.game.saveData(data);
  }

  async sendScore(score: number): Promise<boolean> {
    if (!this.isPlayablesEnvironment()) {
      return false;
    }

    const sdk = this.getSdk();
    if (!sdk) {
      return false;
    }

    try {
      await sdk.engagement.sendScore({ value: Math.max(0, Math.floor(score)) });
      return true;
    } catch {
      this.safeCall(() => sdk.health.logWarning());
      return false;
    }
  }

  isAudioEnabled(): boolean {
    if (!this.isPlayablesEnvironment()) {
      return true;
    }

    return this.getSdk()?.system.isAudioEnabled() ?? false;
  }

  onAudioEnabledChange(callback: (enabled: boolean) => void): Unsubscribe {
    const sdk = this.getSdk();
    if (!this.isPlayablesEnvironment() || !sdk) {
      return noop;
    }

    const unsubscribe = sdk.system.onAudioEnabledChange(callback);
    this.unsubscribers.add(unsubscribe);
    return () => this.unsubscribe(unsubscribe);
  }

  onPause(callback: () => void): Unsubscribe {
    const sdk = this.getSdk();
    if (!this.isPlayablesEnvironment() || !sdk) {
      return noop;
    }

    const unsubscribe = sdk.system.onPause(callback);
    this.unsubscribers.add(unsubscribe);
    return () => this.unsubscribe(unsubscribe);
  }

  onResume(callback: () => void): Unsubscribe {
    const sdk = this.getSdk();
    if (!this.isPlayablesEnvironment() || !sdk) {
      return noop;
    }

    const unsubscribe = sdk.system.onResume(callback);
    this.unsubscribers.add(unsubscribe);
    return () => this.unsubscribe(unsubscribe);
  }

  async getLanguage(): Promise<string | null> {
    const sdk = this.getSdk();
    if (!this.isPlayablesEnvironment() || !sdk) {
      return null;
    }

    try {
      return await sdk.system.getLanguage();
    } catch {
      this.safeCall(() => sdk.health.logWarning());
      return null;
    }
  }

  hasSuccessfulLoad(): boolean {
    return this.loadSucceeded;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.clear();
  }

  private unsubscribe(unsubscribe: Unsubscribe): void {
    unsubscribe();
    this.unsubscribers.delete(unsubscribe);
  }

  private getSdk(): typeof ytgame | null {
    return typeof ytgame === 'undefined' ? null : ytgame;
  }

  private safeCall(callback: () => void): void {
    try {
      callback();
    } catch {
      this.safeLogWarning();
    }
  }

  private safeLogWarning(): void {
    try {
      this.getSdk()?.health.logWarning();
    } catch {
      // Health logging is best-effort only.
    }
  }
}

function noop(): void {
  return;
}

export const youtubePlayables = new BrowserYouTubePlayablesService();
