import type { GameSaveData } from '../types';
import { type GameStorage, saveBestEffort } from './StorageService';

let latestSave: GameSaveData | null = null;

export function setLatestSaveSnapshot(save: GameSaveData): void {
  latestSave = {
    ...save,
    permanentUpgrades: { ...save.permanentUpgrades },
  };
}

export function getLatestSaveSnapshot(): GameSaveData | null {
  return latestSave
    ? {
        ...latestSave,
        permanentUpgrades: { ...latestSave.permanentUpgrades },
      }
    : null;
}

export async function saveLatestSnapshotBestEffort(storage: GameStorage): Promise<boolean> {
  if (!latestSave) {
    return false;
  }
  return saveBestEffort(storage, latestSave);
}

export function clearLatestSaveSnapshot(): void {
  latestSave = null;
}
