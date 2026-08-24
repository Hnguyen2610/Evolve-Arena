import type { GameSaveData } from '../types';

interface StartupSequenceDependencies {
  signalFirstFrameReady(): void;
  initializePlatform(): Promise<void>;
  loadSave(): Promise<GameSaveData>;
}

export async function loadStartupSaveAfterFirstFrame(
  dependencies: StartupSequenceDependencies,
): Promise<GameSaveData> {
  dependencies.signalFirstFrameReady();
  await dependencies.initializePlatform();
  return dependencies.loadSave();
}
