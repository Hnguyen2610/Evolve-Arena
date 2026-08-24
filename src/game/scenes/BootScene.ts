import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { COLORS, ENEMY_COLORS } from '../config/visual';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createTextures();
    this.scene.start('MenuScene');
  }

  private createTextures(): void {
    this.makePlayerTextures();
    this.makeProjectileTextures();
    this.makeXpTexture();
    this.makeEnemyTextures();
    this.makeBossTexture();
    this.makeSparkTextures();
    this.makeUpgradeIcons();
  }

  private makePlayerTextures(): void {
    this.makeGlowTexture('player-glow', 92, COLORS.playerGlow, 0.32);

    const graphics = this.add.graphics().setDepth(UI_DEPTH.world);
    const center = 25;
    graphics.fillStyle(0x092532, 0.96);
    graphics.fillCircle(center, center + 4, 22);
    graphics.fillStyle(COLORS.player, 1);
    graphics.fillCircle(center, center, 21);
    graphics.lineStyle(4, COLORS.playerCore, 0.95);
    graphics.strokeCircle(center, center, 19);
    graphics.fillStyle(COLORS.playerCore, 1);
    graphics.fillCircle(center, center, 10);
    graphics.fillStyle(0x103849, 0.95);
    graphics.fillTriangle(center, 6, center + 8, 22, center - 8, 22);
    graphics.generateTexture('player', 50, 50);
    graphics.destroy();
  }

  private makeProjectileTextures(): void {
    this.makeBoltTexture('projectile', 34, COLORS.playerProjectileCore, COLORS.playerProjectile);
    this.makeBoltTexture('enemy-projectile', 34, COLORS.enemyProjectile, COLORS.enemyProjectileCore);
    this.makeTrailTexture('projectile-trail', 54, COLORS.playerProjectileCore, 0.34);
    this.makeTrailTexture('enemy-projectile-trail', 54, COLORS.enemyProjectile, 0.38);
  }

  private makeXpTexture(): void {
    this.makeGlowTexture('xp-glow', 46, COLORS.xp, 0.28);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.xp, 0.98);
    this.drawDiamond(graphics, 11, 2, 20);
    graphics.fillStyle(COLORS.xpCore, 1);
    this.drawDiamond(graphics, 11, 6, 10);
    graphics.lineStyle(2, COLORS.xpCore, 0.88);
    this.strokeDiamond(graphics, 11, 2, 20);
    graphics.generateTexture('xp-orb', 22, 22);
    graphics.destroy();
  }

  private makeEnemyTextures(): void {
    this.makeBasicEnemyTexture();
    this.makeRunnerTexture();
    this.makeTankTexture();
    this.makeRangedTexture();
    this.makeSwarmTexture();
    this.makeEliteRingTexture();
  }

  private makeBasicEnemyTexture(): void {
    const colors = ENEMY_COLORS.basic;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 0.96);
    graphics.fillCircle(20, 20, 19);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillCircle(20, 20, 15);
    graphics.fillStyle(colors.core, 0.95);
    graphics.fillCircle(20, 20, 6);
    graphics.lineStyle(3, colors.core, 0.72);
    graphics.lineBetween(11, 12, 29, 28);
    graphics.generateTexture('enemy-basic', 40, 40);
    graphics.destroy();
  }

  private makeRunnerTexture(): void {
    const colors = ENEMY_COLORS.runner;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(18, 1, 35, 35, 1, 35);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillTriangle(18, 5, 31, 32, 5, 32);
    graphics.fillStyle(colors.core, 0.95);
    graphics.fillTriangle(18, 10, 24, 25, 12, 25);
    graphics.lineStyle(2, colors.core, 0.6);
    graphics.lineBetween(8, 30, 2, 34);
    graphics.lineBetween(28, 30, 34, 34);
    graphics.generateTexture('enemy-runner', 36, 36);
    graphics.destroy();
  }

  private makeTankTexture(): void {
    const colors = ENEMY_COLORS.tank;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawOctagon(graphics, 27, 27, 26);
    graphics.fillStyle(colors.fill, 1);
    this.drawOctagon(graphics, 27, 27, 21);
    graphics.fillStyle(colors.core, 0.9);
    graphics.fillCircle(27, 27, 9);
    graphics.lineStyle(3, colors.core, 0.62);
    graphics.strokeCircle(27, 27, 15);
    graphics.generateTexture('enemy-tank', 54, 54);
    graphics.destroy();
  }

  private makeRangedTexture(): void {
    const colors = ENEMY_COLORS.ranged;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawDiamond(graphics, 20, 2, 36);
    graphics.fillStyle(colors.fill, 1);
    this.drawDiamond(graphics, 20, 6, 28);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(20, 20, 6);
    graphics.lineStyle(2, colors.core, 0.75);
    graphics.strokeCircle(20, 20, 11);
    graphics.generateTexture('enemy-ranged', 40, 40);
    graphics.destroy();
  }

  private makeSwarmTexture(): void {
    const colors = ENEMY_COLORS.swarm;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillCircle(13, 13, 12);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillCircle(13, 13, 9);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(13, 13, 3);
    graphics.generateTexture('enemy-swarm', 26, 26);
    graphics.destroy();
  }

  private makeEliteRingTexture(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, COLORS.elite, 0.9);
    graphics.strokeCircle(34, 34, 30);
    graphics.lineStyle(2, 0xffffff, 0.75);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      graphics.lineBetween(34 + Math.cos(angle) * 24, 34 + Math.sin(angle) * 24, 34 + Math.cos(angle) * 32, 34 + Math.sin(angle) * 32);
    }
    graphics.generateTexture('elite-ring', 68, 68);
    graphics.destroy();
  }

  private makeBossTexture(): void {
    this.makeGlowTexture('boss-glow', 170, COLORS.boss, 0.2);
    const size = 120;
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.bossShell, 1);
    graphics.fillCircle(size / 2, size / 2, 56);
    graphics.lineStyle(6, 0xfdf2a4, 0.75);
    graphics.strokeCircle(size / 2, size / 2, 52);
    graphics.fillStyle(0x24174d, 1);
    graphics.fillCircle(size / 2, size / 2, 42);
    graphics.fillStyle(COLORS.boss, 1);
    graphics.fillCircle(size / 2, size / 2, 30);
    graphics.fillStyle(0x2b204d, 1);
    graphics.fillCircle(size / 2, size / 2, 12);
    graphics.lineStyle(5, 0xfef3a2, 0.82);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      graphics.lineBetween(
        size / 2 + Math.cos(angle) * 35,
        size / 2 + Math.sin(angle) * 35,
        size / 2 + Math.cos(angle) * 58,
        size / 2 + Math.sin(angle) * 58,
      );
    }
    graphics.generateTexture('boss', size, size);
    graphics.destroy();
  }

  private makeSparkTextures(): void {
    this.makeCircleTexture('spark', 10, COLORS.playerProjectile, 0xffffff);
    this.makeCircleTexture('danger-spark', 12, COLORS.warning, 0xffd1dc);
    this.makeCircleTexture('gold-spark', 12, COLORS.elite, 0xffffff);
  }

  private makeUpgradeIcons(): void {
    const icons = [
      'damage',
      'attack-speed',
      'movement-speed',
      'max-hp',
      'magnet',
      'projectile-count',
      'projectile-size',
      'piercing',
      'critical-chance',
      'explosion',
      'lifesteal',
      'knockback',
      'chain-reaction',
      'armor',
      'projectile-speed',
      'critical-damage',
    ];
    icons.forEach((id) => this.makeUpgradeIcon(`upgrade-${id}`, id));
    this.makeUpgradeIcon('upgrade-default', 'default');
  }

  private makeUpgradeIcon(key: string, id: string): void {
    const graphics = this.add.graphics();
    const center = 24;
    graphics.fillStyle(0x10182a, 1);
    graphics.fillCircle(center, center, 23);
    graphics.lineStyle(3, COLORS.uiPrimary, 0.7);
    graphics.strokeCircle(center, center, 20);
    graphics.fillStyle(COLORS.playerProjectileCore, 1);

    if (id.includes('health') || id.includes('lifesteal')) {
      graphics.fillCircle(19, 20, 7);
      graphics.fillCircle(29, 20, 7);
      graphics.fillTriangle(13, 23, 35, 23, 24, 36);
    } else if (id.includes('magnet')) {
      graphics.lineStyle(5, COLORS.playerProjectileCore, 1);
      graphics.beginPath();
      graphics.arc(24, 26, 12, Math.PI * 0.15, Math.PI * 0.85, false);
      graphics.strokePath();
      graphics.fillRect(12, 27, 7, 9);
      graphics.fillRect(29, 27, 7, 9);
    } else if (id.includes('projectile') || id.includes('piercing')) {
      graphics.fillTriangle(11, 24, 35, 13, 35, 35);
      graphics.fillCircle(14, 24, 4);
    } else if (id.includes('speed')) {
      graphics.fillTriangle(16, 10, 35, 24, 16, 38);
      graphics.fillRect(9, 16, 10, 3);
      graphics.fillRect(7, 23, 12, 3);
      graphics.fillRect(9, 30, 10, 3);
    } else if (id.includes('critical')) {
      graphics.lineStyle(3, COLORS.critical, 1);
      graphics.strokeCircle(24, 24, 12);
      graphics.lineBetween(24, 8, 24, 16);
      graphics.lineBetween(24, 32, 24, 40);
      graphics.lineBetween(8, 24, 16, 24);
      graphics.lineBetween(32, 24, 40, 24);
    } else if (id.includes('explosion') || id.includes('chain')) {
      graphics.fillStyle(COLORS.critical, 1);
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        graphics.fillTriangle(24, 24, 24 + Math.cos(angle - 0.18) * 7, 24 + Math.sin(angle - 0.18) * 7, 24 + Math.cos(angle) * 18, 24 + Math.sin(angle) * 18);
      }
      graphics.fillCircle(24, 24, 7);
    } else if (id.includes('armor')) {
      graphics.fillStyle(COLORS.playerProjectileCore, 1);
      graphics.fillTriangle(24, 9, 36, 16, 33, 34);
      graphics.fillTriangle(24, 9, 12, 16, 15, 34);
      graphics.fillTriangle(15, 34, 33, 34, 24, 41);
    } else {
      graphics.fillTriangle(24, 8, 37, 37, 24, 30);
      graphics.fillTriangle(24, 8, 11, 37, 24, 30);
    }

    graphics.generateTexture(key, 48, 48);
    graphics.destroy();
  }

  private makeCircleTexture(key: string, size: number, fill: number, stroke: number): void {
    const graphics = this.add.graphics();
    const radius = size / 2;
    graphics.fillStyle(fill, 1);
    graphics.fillCircle(radius, radius, radius - 2);
    graphics.lineStyle(2, stroke, 0.92);
    graphics.strokeCircle(radius, radius, radius - 3);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeGlowTexture(key: string, size: number, color: number, alpha: number): void {
    const graphics = this.add.graphics();
    const radius = size / 2;
    graphics.fillStyle(color, alpha * 0.25);
    graphics.fillCircle(radius, radius, radius - 2);
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(radius, radius, radius * 0.58);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeBoltTexture(key: string, size: number, fill: number, core: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, 1);
    this.drawDiamond(graphics, size / 2, size * 0.18, size * 0.64);
    graphics.fillStyle(core, 1);
    this.drawDiamond(graphics, size / 2, size * 0.32, size * 0.36);
    graphics.lineStyle(2, 0xffffff, 0.82);
    this.strokeDiamond(graphics, size / 2, size * 0.18, size * 0.64);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeTrailTexture(key: string, size: number, color: number, alpha: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(color, alpha);
    graphics.fillTriangle(4, size / 2, size - 8, size * 0.27, size - 8, size * 0.73);
    graphics.fillStyle(color, alpha * 0.6);
    graphics.fillCircle(size - 11, size / 2, size * 0.18);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private drawDiamond(graphics: Phaser.GameObjects.Graphics, center: number, top: number, height: number): void {
    graphics.beginPath();
    graphics.moveTo(center, top);
    graphics.lineTo(center + height / 2, top + height / 2);
    graphics.lineTo(center, top + height);
    graphics.lineTo(center - height / 2, top + height / 2);
    graphics.closePath();
    graphics.fillPath();
  }

  private strokeDiamond(graphics: Phaser.GameObjects.Graphics, center: number, top: number, height: number): void {
    graphics.beginPath();
    graphics.moveTo(center, top);
    graphics.lineTo(center + height / 2, top + height / 2);
    graphics.lineTo(center, top + height);
    graphics.lineTo(center - height / 2, top + height / 2);
    graphics.closePath();
    graphics.strokePath();
  }

  private drawOctagon(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number, radius: number): void {
    graphics.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + (Math.PI * 2 * i) / 8;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.closePath();
    graphics.fillPath();
  }
}
