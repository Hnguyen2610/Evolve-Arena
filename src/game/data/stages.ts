import { COLORS } from '../config/visual';
import type { StageDefinition, StageId } from '../types';

export const STAGE_DEFINITIONS: Record<StageId, StageDefinition> = {
  'stage-1': {
    id: 'stage-1',
    number: 1,
    name: 'Neon Core',
    subtitle: 'Classic evolution arena',
    description: 'Balanced enemy pressure and the Apex Core.',
    bossName: 'Apex Core',
    unlocksOnClear: 'stage-2',
    visualTheme: {
      backgroundDeep: COLORS.backgroundDeep,
      arenaBase: COLORS.arenaBase,
      arenaGrid: COLORS.arenaGrid,
      arenaAccent: COLORS.arenaAccent,
      arenaMark: COLORS.arenaMark,
      phase2: COLORS.arenaPhase2,
      phase3: COLORS.arenaPhase3,
      foreground: COLORS.arenaForeground,
      boss: COLORS.boss,
      bossShell: COLORS.bossShell,
      bossDanger: COLORS.bossDanger,
      hazard: COLORS.bossDanger,
    },
    bossSpawnSeconds: 85,
    spawnIntervalMultiplier: 1,
    maxEnemyBonus: 0,
    eliteChanceBonus: 0,
    enemyUnlocks: [
      { atSeconds: 0, types: ['basic'] },
      { atSeconds: 10, types: ['runner'] },
      { atSeconds: 25, types: ['tank'] },
      { atSeconds: 42, types: ['ranged'] },
      { atSeconds: 58, types: ['swarm'] },
    ],
    boss: {
      type: 'boss',
      name: 'Apex Core',
      healthMultiplier: 1,
      speedMultiplier: 1,
      entryHeal: 90,
      scoreBonus: 0,
    },
    hazard: {
      enabled: false,
      startSeconds: 999,
      baseIntervalMs: 999999,
      lateIntervalMs: 999999,
      telegraphMs: 0,
      activeMs: 0,
      radius: 0,
      damage: 0,
    },
  },
  'stage-2': {
    id: 'stage-2',
    number: 2,
    name: 'Rift Nexus',
    subtitle: 'Unstable dimensional arena',
    description: 'Spatial rifts, flankers, casters, and a Prism Warden.',
    bossName: 'Prism Warden',
    visualTheme: {
      backgroundDeep: 0x080617,
      arenaBase: 0x18102e,
      arenaGrid: 0x3c2a72,
      arenaAccent: 0x6226b8,
      arenaMark: 0x8f6dff,
      phase2: 0xff4fd8,
      phase3: 0x57d8ff,
      foreground: 0xf2b6ff,
      boss: 0xff68f0,
      bossShell: 0x214a8f,
      bossDanger: 0x8f6dff,
      hazard: 0xff4fd8,
    },
    bossSpawnSeconds: 82,
    spawnIntervalMultiplier: 1.08,
    maxEnemyBonus: 0,
    eliteChanceBonus: 0,
    enemyUnlocks: [
      { atSeconds: 0, types: ['basic'] },
      { atSeconds: 12, types: ['runner'] },
      { atSeconds: 32, types: ['orbiter'] },
      { atSeconds: 42, types: ['ranged', 'tank'] },
      { atSeconds: 65, types: ['pulse-caster'] },
      { atSeconds: 72, types: ['swarm'] },
    ],
    boss: {
      type: 'rift-boss',
      name: 'Prism Warden',
      healthMultiplier: 1.12,
      speedMultiplier: 0.96,
      entryHeal: 80,
      scoreBonus: 140,
    },
    hazard: {
      enabled: true,
      startSeconds: 30,
      baseIntervalMs: 8000,
      lateIntervalMs: 6200,
      telegraphMs: 950,
      activeMs: 780,
      radius: 104,
      damage: 7,
    },
  },
};

export const STAGE_IDS: StageId[] = ['stage-1', 'stage-2'];
export const DEFAULT_STAGE_ID: StageId = 'stage-1';

export function getStageDefinition(stageId: StageId): StageDefinition {
  return STAGE_DEFINITIONS[stageId];
}

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && STAGE_IDS.includes(value as StageId);
}
