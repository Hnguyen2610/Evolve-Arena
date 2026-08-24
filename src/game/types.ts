export type GameMode = 'menu' | 'playing' | 'level-up' | 'paused' | 'game-over' | 'victory';

export type EnemyType = 'basic' | 'runner' | 'tank' | 'ranged' | 'swarm' | 'boss';

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
  behavior: 'chase' | 'runner' | 'tank' | 'ranged' | 'swarm' | 'boss';
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
  damage: number;
  pierceLeft: number;
  expiresAt: number;
  knockback: number;
  size: number;
}

export interface XpOrbData {
  value: number;
  attracted: boolean;
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

export interface GameSaveData {
  version: number;
  bestScore: number;
  coins: number;
  permanentUpgrades: PermanentUpgradeState;
}

export interface RunResult {
  victory: boolean;
  score: number;
  kills: number;
  eliteKills: number;
  bossDefeated: boolean;
  survivalSeconds: number;
  coinsEarned: number;
  playerLevel: number;
}
