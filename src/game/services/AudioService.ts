type AudioEvent =
  | 'shot'
  | 'hit'
  | 'enemyDeath'
  | 'xp'
  | 'levelUp'
  | 'playerDamage'
  | 'bossSpawn'
  | 'bossAttack'
  | 'gameOver'
  | 'victory';

const AUDIO_EVENT_FREQUENCIES: Record<AudioEvent, number> = {
  shot: 520,
  hit: 180,
  enemyDeath: 260,
  xp: 760,
  levelUp: 940,
  playerDamage: 120,
  bossSpawn: 80,
  bossAttack: 150,
  gameOver: 95,
  victory: 1040,
};

export interface GameAudio {
  muted: boolean;
  setMuted(muted: boolean): void;
  setPlatformAudioEnabled(enabled: boolean): void;
  pause(): void;
  resume(): void;
  play(event: AudioEvent): void;
}

export class BrowserAudioService implements GameAudio {
  muted = true;
  private context: AudioContext | null = null;
  private suspendedByGame = false;
  private platformAudioEnabled = true;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.canOutputAudio()) {
      void this.ensureContext();
    } else if (!this.platformAudioEnabled) {
      void this.context?.suspend();
    }
  }

  setPlatformAudioEnabled(enabled: boolean): void {
    this.platformAudioEnabled = enabled;
    if (!enabled) {
      void this.context?.suspend();
      return;
    }
    if (this.canOutputAudio()) {
      void this.context?.resume();
    }
  }

  pause(): void {
    this.suspendedByGame = true;
    void this.context?.suspend();
  }

  resume(): void {
    this.suspendedByGame = false;
    if (this.canOutputAudio()) {
      void this.context?.resume();
    }
  }

  play(event: AudioEvent): void {
    if (!this.canOutputAudio()) {
      return;
    }

    void this.ensureContext().then((context) => {
      if (!context || context.state !== 'running') {
        return;
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = event === 'bossSpawn' || event === 'gameOver' ? 'sawtooth' : 'triangle';
      oscillator.frequency.value = AUDIO_EVENT_FREQUENCIES[event];
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.085);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
    });
  }

  private canOutputAudio(): boolean {
    return !this.muted && this.platformAudioEnabled && !this.suspendedByGame;
  }

  private async ensureContext(): Promise<AudioContext | null> {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    return this.context;
  }
}
