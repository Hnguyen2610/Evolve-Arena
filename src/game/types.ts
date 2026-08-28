export type GameMode = 'menu' | 'playing' | 'level-up' | 'paused' | 'game-over' | 'victory';

export type ChapterId = 'chapter-1' | 'chapter-2';

export type StageId = 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4';

export type EnemyType =
  | 'basic'
  | 'runner'
  | 'tank'
  | 'ranged'
  | 'swarm'
  | 'orbiter'
  | 'pulse-caster'
  | 'guardian'
  | 'disruptor'
  | 'anchor'
  | 'interceptor'
  | 'energy-node'
  | 'boss'
  | 'rift-boss'
  | 'forge-boss'
  | 'grid-boss';

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export type PermanentUpgradeId = 'damage' | 'health' | 'speed';

export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  movementSpeed: number;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  projectileSpeed: number;
  projectileCount: number;
  projectileSize: number;
  criticalChance: number;
  criticalDamage: number;
  magnetRange: number;
  armor: number;
  lifesteal: number;
  knockback: number;
  piercing: number;
  explosionOnKill: number;
  chainReaction: number;
  projectileSpread: number;
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  health: number;
  speed: number;
  damage: number;
  xp: number;
  score: number;
  radius: number;
  tint: number;
  behavior: 'chase' | 'runner' | 'tank' | 'ranged' | 'swarm' | 'guardian' | 'disruptor' | 'anchor' | 'interceptor' | 'node' | 'boss';
}

export interface EnemyRuntimeData {
  type: EnemyType;
  elite: boolean;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xp: number;
  score: number;
  radius: number;
  behavior: EnemyDefinition['behavior'];
  nextAttackAt: number;
  contactReadyAt: number;
  chargeUntil: number;
  telegraphUntil: number;
}

export interface ProjectileData {
  owner: 'player' | 'enemy';
  source?: 'enemy' | 'boss' | 'energy-node';
  damage: number;
  critical?: boolean;
  pierceLeft: number;
  expiresAt: number;
  knockback: number;
  size: number;
}

export interface XpOrbData {
  value: number;
  attracted: boolean;
  spawnedAt: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  rarity: UpgradeRarity;
  apply: (stats: PlayerStats, level: number) => void;
}

export interface UpgradeState {
  [upgradeId: string]: number;
}

export interface PermanentUpgradeState {
  damage: number;
  health: number;
  speed: number;
}

export interface StageRecord {
  bestScore: number;
  bestClearTimeSeconds?: number;
}

export type StageMasteryState = Partial<Record<StageId, number>>;

export type StageRecordsState = Partial<Record<StageId, StageRecord>>;

export interface GameSaveData {
  version: number;
  bestScore: number;
  coins: number;
  permanentUpgrades: PermanentUpgradeState;
  unlockedStageIds: StageId[];
  clearedStageIds: StageId[];
  clearedChapterIds: ChapterId[];
  stageMastery: StageMasteryState;
  stageRecords: StageRecordsState;
}

export interface RunResult {
  stageId: StageId;
  chapterId: ChapterId;
  victory: boolean;
  score: number;
  kills: number;
  eliteKills: number;
  bossDefeated: boolean;
  survivalSeconds: number;
  coinsEarned: number;
  playerLevel: number;
  damageTaken: number;
  energyNodesDestroyed: number;
  energyNodePressureHits: number;
  arenaShifts: number;
  overloadEvents: number;
  overloadHits: number;
}

export interface StageVisualTheme {
  backgroundDeep: number;
  arenaBase: number;
  arenaGrid: number;
  arenaAccent: number;
  arenaMark: number;
  phase2: number;
  phase3: number;
  foreground: number;
  boss: number;
  bossShell: number;
  bossDanger: number;
  hazard: number;
}

export interface StageHazardConfig {
  enabled: boolean;
  startSeconds: number;
  baseIntervalMs: number;
  lateIntervalMs: number;
  telegraphMs: number;
  activeMs: number;
  radius: number;
  damage: number;
}

export interface StageEnergyNodeConfig {
  enabled: boolean;
  startSeconds: number;
  baseIntervalMs: number;
  lateIntervalMs: number;
  lateStartSeconds: number;
  telegraphMs: number;
  pulseProjectileCount: number;
  projectileSpeed: number;
  projectileDamage: number;
  maxActiveEarly: number;
  maxActiveLate: number;
}

export interface StageArenaShiftConfig {
  enabled: boolean;
  startSeconds: number;
  stableMs: number;
  warningMs: number;
  overloadMs: number;
  recoveryMs: number;
  sectors: number;
  dangerousSectors: number;
  damage: number;
  damageCooldownMs: number;
}

export interface StageBossConfig {
  type: EnemyType;
  name: string;
  healthMultiplier: number;
  speedMultiplier: number;
  entryHeal: number;
  scoreBonus: number;
}

export interface StageDefinition {
  id: StageId;
  chapterId: ChapterId;
  number: number;
  name: string;
  subtitle: string;
  description: string;
  bossName: string;
  unlocksOnClear?: StageId;
  firstClearReward: number;
  visualTheme: StageVisualTheme;
  bossSpawnSeconds: number;
  spawnIntervalMultiplier: number;
  maxEnemyBonus: number;
  eliteChanceBonus: number;
  enemyUnlocks: Array<{ atSeconds: number; types: EnemyType[] }>;
  boss: StageBossConfig;
  hazard: StageHazardConfig;
  energyNode: StageEnergyNodeConfig;
  arenaShift: StageArenaShiftConfig;
}

export interface ChapterDefinition {
  id: ChapterId;
  number: number;
  name: string;
  subtitle: string;
  stageIds: StageId[];
  unlocksAfterChapterId?: ChapterId;
  completionReward: number;
  completeWhenAllStagesCleared: boolean;
}
