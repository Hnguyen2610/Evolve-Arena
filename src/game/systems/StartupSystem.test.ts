import { describe, expect, it, vi } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import { loadStartupSaveAfterFirstFrame } from './StartupSystem';

describe('loadStartupSaveAfterFirstFrame', () => {
  it('signals first frame before delayed persistence initialization while splash ownership remains active', async () => {
    const calls: string[] = [];
    let splashActive = true;
    const save = cloneDefaultSave();

    const loaded = await loadStartupSaveAfterFirstFrame({
      signalFirstFrameReady: vi.fn(() => calls.push('firstFrameReady')),
      initializePlatform: vi.fn(async () => {
        calls.push('initializePlatform');
      }),
      loadSave: vi.fn(async () => {
        calls.push(`loadSave:splash:${splashActive}`);
        await Promise.resolve();
        calls.push(`loadSave:end:splash:${splashActive}`);
        return save;
      }),
    });
    splashActive = false;

    expect(loaded).toBe(save);
    expect(calls).toEqual([
      'firstFrameReady',
      'initializePlatform',
      'loadSave:splash:true',
      'loadSave:end:splash:true',
    ]);
  });
});
