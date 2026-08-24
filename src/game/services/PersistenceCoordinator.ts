import type { GameSaveData } from '../types';
import { type GameStorage, saveBestEffort } from './StorageService';
import type { YouTubePlayablesService } from './YouTubePlayablesService';

let latestSave: GameSaveData | null = null;
let pendingBestScore: number | null = null;

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

export function markPendingBestScore(score: number, platform: YouTubePlayablesService): boolean {
  if (!platform.isPlayablesEnvironment()) {
    return false;
  }
  const normalizedScore = Math.max(0, Math.floor(score));
  pendingBestScore = pendingBestScore === null ? normalizedScore : Math.max(pendingBestScore, normalizedScore);
  return true;
}

export function getPendingBestScore(): number | null {
  return pendingBestScore;
}

export async function synchronizePendingBestScore(platform: YouTubePlayablesService): Promise<boolean> {
  if (pendingBestScore === null) {
    return false;
  }

  if (!platform.isPlayablesEnvironment()) {
    pendingBestScore = null;
    return false;
  }

  const scoreToSubmit = pendingBestScore;
  const submitted = await platform.sendScore(scoreToSubmit);
  if (submitted && pendingBestScore === scoreToSubmit) {
    pendingBestScore = null;
  }
  return submitted;
}

export async function saveLatestSnapshotBestEffort(
  storage: GameStorage,
  platform?: YouTubePlayablesService,
): Promise<boolean> {
  if (!latestSave) {
    return false;
  }
  const saved = await saveBestEffort(storage, latestSave);
  if (saved && platform) {
    await synchronizePendingBestScore(platform);
  }
  return saved;
}

export async function saveSnapshotAndSyncBestScore(
  storage: GameStorage,
  platform: YouTubePlayablesService,
  save: GameSaveData,
): Promise<boolean> {
  setLatestSaveSnapshot(save);
  const saved = await saveBestEffort(storage, save);
  if (saved) {
    await synchronizePendingBestScore(platform);
  }
  return saved;
}

export function clearLatestSaveSnapshot(): void {
  latestSave = null;
}

export function clearPendingBestScore(): void {
  pendingBestScore = null;
}
