import type { UpgradeDefinition } from '../types';

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'damage',
    name: 'Damage Up',
    description: '+18% projectile damage',
    maxLevel: 8,
    rarity: 'common',
    apply: (stats) => {
      stats.damage *= 1.18;
    },
  },
  {
    id: 'attack-speed',
    name: 'Attack Speed',
    description: '+16% fire rate',
    maxLevel: 7,
    rarity: 'common',
    apply: (stats) => {
      stats.attackSpeed *= 1.16;
    },
  },
  {
    id: 'movement-speed',
    name: 'Swift Steps',
    description: '+12% movement speed',
    maxLevel: 5,
    rarity: 'common',
    apply: (stats) => {
      stats.movementSpeed *= 1.12;
    },
  },
  {
    id: 'max-hp',
    name: 'Vital Core',
    description: '+24 max HP and heal',
    maxLevel: 5,
    rarity: 'common',
    apply: (stats) => {
      stats.maxHealth += 24;
      stats.currentHealth = Math.min(stats.maxHealth, stats.currentHealth + 24);
    },
  },
  {
    id: 'magnet',
    name: 'Magnet Field',
    description: '+55 XP pickup range',
    maxLevel: 5,
    rarity: 'common',
    apply: (stats) => {
      stats.magnetRange += 55;
    },
  },
  {
    id: 'projectile-count',
    name: 'Extra Shot',
    description: '+1 projectile per attack',
    maxLevel: 4,
    rarity: 'rare',
    apply: (stats) => {
      stats.projectileCount += 1;
    },
  },
  {
    id: 'projectile-size',
    name: 'Heavy Bolts',
    description: '+18% projectile size and hit area',
    maxLevel: 5,
    rarity: 'common',
    apply: (stats) => {
      stats.projectileSize *= 1.18;
    },
  },
  {
    id: 'piercing',
    name: 'Piercing',
    description: 'Projectiles pierce +1 enemy',
    maxLevel: 3,
    rarity: 'rare',
    apply: (stats) => {
      stats.piercing += 1;
    },
  },
  {
    id: 'critical-chance',
    name: 'Critical Eye',
    description: '+9% critical chance',
    maxLevel: 5,
    rarity: 'common',
    apply: (stats) => {
      stats.criticalChance += 0.09;
    },
  },
  {
    id: 'explosion',
    name: 'Explosion on Kill',
    description: 'Kills burst for area damage',
    maxLevel: 4,
    rarity: 'epic',
    apply: (stats, level) => {
      stats.explosionOnKill = Math.max(stats.explosionOnKill, 52 + level * 18);
    },
  },
  {
    id: 'lifesteal',
    name: 'Lifesteal',
    description: 'Heal from damage dealt',
    maxLevel: 4,
    rarity: 'rare',
    apply: (stats) => {
      stats.lifesteal += 0.014;
    },
  },
  {
    id: 'knockback',
    name: 'Knockback',
    description: '+45 impact knockback',
    maxLevel: 4,
    rarity: 'common',
    apply: (stats) => {
      stats.knockback += 45;
    },
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    description: 'Explosions grow and chain once per level',
    maxLevel: 3,
    rarity: 'epic',
    apply: (stats) => {
      stats.chainReaction += 1;
      stats.explosionOnKill = Math.max(stats.explosionOnKill, 65);
    },
  },
  {
    id: 'armor',
    name: 'Armor',
    description: 'Reduce incoming damage',
    maxLevel: 5,
    rarity: 'rare',
    apply: (stats) => {
      stats.armor += 2;
    },
  },
  {
    id: 'projectile-speed',
    name: 'Velocity',
    description: '+18% projectile speed',
    maxLevel: 4,
    rarity: 'common',
    apply: (stats) => {
      stats.projectileSpeed *= 1.18;
    },
  },
  {
    id: 'critical-damage',
    name: 'Critical Burst',
    description: '+45% critical damage',
    maxLevel: 3,
    rarity: 'rare',
    apply: (stats) => {
      stats.criticalDamage += 0.45;
    },
  },
];
