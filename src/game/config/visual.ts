import type { UpgradeRarity } from '../types';

export const COLORS = {
  background: 0x0b1020,
  backgroundDeep: 0x070a14,
  arenaBase: 0x111b2c,
  arenaGrid: 0x29445f,
  arenaAccent: 0x203b53,
  arenaMark: 0x58d8ff,
  arenaPhase2: 0x3fe8b0,
  arenaPhase3: 0xff6d8c,
  arenaForeground: 0xb6f6ff,
  player: 0x63e7ff,
  playerCore: 0xf2feff,
  playerGlow: 0x44d8ff,
  playerProjectile: 0xc8fbff,
  playerProjectileCore: 0x65e8ff,
  playerShield: 0x8ff7ff,
  playerLifesteal: 0xff5aa8,
  playerMagnet: 0x85ffb8,
  enemyProjectile: 0xff405d,
  enemyProjectileCore: 0xffd1dc,
  xp: 0x69ff9a,
  xpCore: 0xf4fff6,
  health: 0x5bea83,
  lowHealth: 0xff4f6b,
  xpBar: 0x62d8ff,
  damage: 0xffffff,
  critical: 0xfff06c,
  playerDamage: 0xff91a6,
  warning: 0xff4f65,
  boss: 0xffee58,
  bossShell: 0x4a347d,
  bossDanger: 0xff405d,
  elite: 0xfff06c,
  uiPanel: 0x151b2d,
  uiPanelDark: 0x0a0f1d,
  uiPanelLight: 0x242c45,
  uiPrimary: 0x39d99c,
  uiPrimaryDark: 0x15966f,
  uiMuted: 0x8ea0bc,
  uiText: '#f7fbff',
  uiTextMuted: '#b9c7dc',
  uiTextDark: '#07131a',
  uiCyan: '#9ff7db',
};

export const ENEMY_COLORS = {
  basic: { fill: 0xff5d66, core: 0xffb4bd, stroke: 0x3b1721 },
  runner: { fill: 0xffbe3d, core: 0xfff0a3, stroke: 0x4a2607 },
  tank: { fill: 0x8068ff, core: 0xdcd4ff, stroke: 0x211a4c },
  ranged: { fill: 0x39d2a2, core: 0xd6fff4, stroke: 0x123d34 },
  swarm: { fill: 0xff75ca, core: 0xffd4ef, stroke: 0x4a1939 },
  orbiter: { fill: 0x8f6dff, core: 0xf3e8ff, stroke: 0x24134f },
  'pulse-caster': { fill: 0xff4fd8, core: 0xffd7f6, stroke: 0x4a123f },
  guardian: { fill: 0x27586b, core: 0xd4fbff, stroke: 0x102d3a },
  disruptor: { fill: 0xffa53d, core: 0xfff1b8, stroke: 0x4a2607 },
  anchor: { fill: 0x114c68, core: 0xe8feff, stroke: 0x062234 },
  interceptor: { fill: 0xff8d32, core: 0xfff4cf, stroke: 0x552207 },
  'energy-node': { fill: 0xffd166, core: 0xffffff, stroke: 0x53330d },
};

export const RARITY_COLORS: Record<UpgradeRarity, {
  fill: number;
  stroke: number;
  glow: number;
  label: string;
}> = {
  common: { fill: 0x1c3e38, stroke: 0x65e7c3, glow: 0x1b7a68, label: '#9ff7db' },
  rare: { fill: 0x193f61, stroke: 0x68ccff, glow: 0x236a99, label: '#9addff' },
  epic: { fill: 0x44306f, stroke: 0xd8a7ff, glow: 0x7c45d8, label: '#e9c6ff' },
};

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
