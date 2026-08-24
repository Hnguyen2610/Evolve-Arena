import { afterEach, describe, expect, it } from 'vitest';
import { BrowserAudioService } from './AudioService';

type GlobalWithAudioContext = typeof globalThis & {
  AudioContext?: new () => FakeAudioContext;
};

class FakeAudioContext {
  static oscillatorStarts = 0;
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  createOscillator(): OscillatorNode {
    return {
      type: 'triangle',
      frequency: { value: 0 },
      connect: () => undefined,
      start: () => {
        FakeAudioContext.oscillatorStarts += 1;
      },
      stop: () => undefined,
    } as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return {
      gain: {
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
    } as unknown as GainNode;
  }
}

describe('BrowserAudioService', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis as GlobalWithAudioContext, 'AudioContext');
    FakeAudioContext.oscillatorStarts = 0;
  });

  it('requires both local unlock and platform audio to play sounds', async () => {
    Object.defineProperty(globalThis, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
    });
    const audio = new BrowserAudioService();

    audio.play('shot');
    await Promise.resolve();
    expect(FakeAudioContext.oscillatorStarts).toBe(0);

    audio.setMuted(false);
    audio.setPlatformAudioEnabled(false);
    audio.play('shot');
    await Promise.resolve();
    expect(FakeAudioContext.oscillatorStarts).toBe(0);

    audio.setPlatformAudioEnabled(true);
    audio.play('shot');
    await Promise.resolve();
    expect(FakeAudioContext.oscillatorStarts).toBe(1);
  });

  it('stays silent while gameplay is platform-paused', async () => {
    Object.defineProperty(globalThis, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
    });
    const audio = new BrowserAudioService();

    audio.setMuted(false);
    audio.pause();
    audio.play('xp');
    await Promise.resolve();

    expect(FakeAudioContext.oscillatorStarts).toBe(0);
  });
});
