import { SAVE_KEY, SAVE_VERSION } from '../config/constants';
import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import { DEFAULT_SAVE_DATA } from '../data/progression';
import type { GameSaveData, PermanentUpgradeId, PermanentUpgradeState } from '../types';

export interface GameStorage {
  load(): Promise<GameSaveData>;
  save(data: GameSaveData): Promise<void>;
}

export class LocalStorageGameStorage implements GameStorage {
  async load(): Promise<GameSaveData> {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return parseSaveData(raw);
  }

  async save(data: GameSaveData): Promise<void> {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSaveData(data)));
  }
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
  };
}

export function cloneDefaultSave(): GameSaveData {
  return {
    ...DEFAULT_SAVE_DATA,
    permanentUpgrades: { ...DEFAULT_SAVE_DATA.permanentUpgrades },
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

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
