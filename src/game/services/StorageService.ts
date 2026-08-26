import { SAVE_KEY, SAVE_VERSION } from '../config/constants';
import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import { DEFAULT_SAVE_DATA } from '../data/progression';
import { DEFAULT_STAGE_ID, STAGE_IDS } from '../data/stages';
import { youtubePlayables, type YouTubePlayablesService } from './YouTubePlayablesService';
import type { GameSaveData, PermanentUpgradeId, PermanentUpgradeState, StageId } from '../types';

export interface GameStorage {
  load(): Promise<GameSaveData>;
  save(data: GameSaveData): Promise<void>;
}

export class LocalStorageGameStorage implements GameStorage {
  async load(): Promise<GameSaveData> {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return parseSaveData(raw);
    } catch {
      return cloneDefaultSave();
    }
  }

  async save(data: GameSaveData): Promise<void> {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSaveData(data)));
  }
}

export class YouTubeGameStorage implements GameStorage {
  private cloudLoaded = false;

  constructor(private readonly playables: YouTubePlayablesService = youtubePlayables) {}

  async load(): Promise<GameSaveData> {
    const raw = await this.playables.loadData();
    this.cloudLoaded = this.playables.hasSuccessfulLoad();
    return parseSaveData(raw);
  }

  async save(data: GameSaveData): Promise<void> {
    if (!this.cloudLoaded || !this.playables.hasSuccessfulLoad()) {
      throw new Error('YouTube cloud save attempted before successful loadData');
    }
    await this.playables.saveData(serializeSaveData(data));
  }
}

export function createGameStorage(youtube: YouTubePlayablesService = youtubePlayables): GameStorage {
  return youtube.isPlayablesEnvironment() ? new YouTubeGameStorage(youtube) : new LocalStorageGameStorage();
}

export async function loadSaveOrDefault(storage: GameStorage): Promise<GameSaveData> {
  try {
    return await storage.load();
  } catch {
    return cloneDefaultSave();
  }
}

export async function saveBestEffort(storage: GameStorage, data: GameSaveData): Promise<boolean> {
  try {
    await storage.save(data);
    return true;
  } catch {
    return false;
  }
}

export function serializeSaveData(data: GameSaveData): string {
  return JSON.stringify(normalizeSaveData(data));
}

export function getSerializedSaveSizeBytes(data: GameSaveData): number {
  return new TextEncoder().encode(serializeSaveData(data)).length;
}

export function parseSaveData(raw: string | null): GameSaveData {
  if (!raw) {
    return cloneDefaultSave();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizeSaveData(parsed);
  } catch {
    return cloneDefaultSave();
  }
}

export function normalizeSaveData(input: unknown): GameSaveData {
  if (!isRecord(input)) {
    return cloneDefaultSave();
  }

  const permanent = isRecord(input.permanentUpgrades) ? input.permanentUpgrades : {};
  return {
    version: SAVE_VERSION,
    bestScore: safeNonNegativeInt(input.bestScore),
    coins: safeNonNegativeInt(input.coins),
    permanentUpgrades: {
      damage: safeUpgradeLevel('damage', permanent.damage),
      health: safeUpgradeLevel('health', permanent.health),
      speed: safeUpgradeLevel('speed', permanent.speed),
    },
    unlockedStageIds: normalizeStageIds(input.unlockedStageIds, [DEFAULT_STAGE_ID]),
    clearedStageIds: normalizeStageIds(input.clearedStageIds, []),
  };
}

export function cloneDefaultSave(): GameSaveData {
  return {
    ...DEFAULT_SAVE_DATA,
    permanentUpgrades: { ...DEFAULT_SAVE_DATA.permanentUpgrades },
    unlockedStageIds: [...DEFAULT_SAVE_DATA.unlockedStageIds],
    clearedStageIds: [...DEFAULT_SAVE_DATA.clearedStageIds],
  };
}

function safeNonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function safeUpgradeLevel(id: PermanentUpgradeId, value: unknown): PermanentUpgradeState[keyof PermanentUpgradeState] {
  const maxLevel = PERMANENT_UPGRADE_BALANCE[id].maxLevel;
  return typeof value === 'number' && Number.isFinite(value)
    ? clampInt(Math.floor(value), 0, maxLevel)
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStageIds(value: unknown, fallback: StageId[]): StageId[] {
  const source = Array.isArray(value) ? value : fallback;
  return STAGE_IDS.filter((stageId) => source.includes(stageId));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
