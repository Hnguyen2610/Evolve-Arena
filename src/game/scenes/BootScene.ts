import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { COLORS, ENEMY_COLORS } from '../config/visual';
import { gameStorage, platform } from '../services/PlatformServices';
import { reconcilePersistedBestScore, setLatestSaveSnapshot } from '../services/PersistenceCoordinator';
import { loadSaveOrDefault } from '../services/StorageService';
import { loadStartupSaveAfterFirstFrame } from '../systems/StartupSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createTextures();
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, COLORS.backgroundDeep, 1);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'EVOLVE ARENA', {
        color: '#f7fbff',
        fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
        fontSize: `${Math.min(36, Math.max(24, this.scale.width * 0.06))}px`,
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 48, 'Initializing...', {
        color: '#d7edff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        fontStyle: '800',
      })
      .setOrigin(0.5);

    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      void this.loadStartupSave();
    });
  }

  private async loadStartupSave(): Promise<void> {
    const save = await loadStartupSaveAfterFirstFrame({
      signalFirstFrameReady: () => platform.signalFirstFrameReady(),
      initializePlatform: () => platform.initialize(),
      loadSave: () => loadSaveOrDefault(gameStorage),
    });
    setLatestSaveSnapshot(save);
    void reconcilePersistedBestScore(platform, save);
    this.scene.start('MenuScene', { save });
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
    graphics.fillStyle(0x061d29, 0.98);
    graphics.fillCircle(center, center + 5, 22);
    graphics.lineStyle(4, COLORS.player, 0.86);
    graphics.beginPath();
    graphics.arc(center, center, 21, -Math.PI * 0.1, Math.PI * 0.72);
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(center, center, 21, Math.PI * 0.92, Math.PI * 1.72);
    graphics.strokePath();
    graphics.lineStyle(2, COLORS.playerCore, 0.92);
    graphics.strokeCircle(center, center, 15);
    graphics.fillStyle(COLORS.player, 0.96);
    graphics.fillCircle(center, center, 17);
    graphics.fillStyle(COLORS.playerCore, 1);
    graphics.fillCircle(center, center, 8);
    graphics.fillStyle(0x0b4b61, 0.95);
    graphics.fillTriangle(center, 4, center + 9, 22, center - 9, 22);
    graphics.lineStyle(2, COLORS.playerProjectileCore, 0.8);
    graphics.lineBetween(center - 16, center + 14, center, center + 22);
    graphics.lineBetween(center + 16, center + 14, center, center + 22);
    graphics.generateTexture('player', 50, 50);
    graphics.destroy();
  }

  private makeProjectileTextures(): void {
    this.makeBoltTexture('projectile', 34, COLORS.playerProjectileCore, COLORS.playerProjectile);
    this.makeDangerProjectileTexture();
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
    graphics.fillStyle(colors.stroke, 1);
    this.drawPolygon(graphics, 20, 20, [18, 15, 19, 13, 18, 16], -0.35);
    graphics.fillStyle(colors.fill, 1);
    this.drawPolygon(graphics, 20, 20, [13, 15, 12, 14, 11, 15], -0.15);
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(2, 15, 11, 8, 9, 20);
    graphics.fillTriangle(38, 22, 28, 31, 31, 18);
    graphics.fillTriangle(17, 2, 27, 9, 16, 12);
    graphics.fillStyle(colors.core, 0.95);
    graphics.fillCircle(20, 20, 6.5);
    graphics.lineStyle(3, colors.core, 0.72);
    graphics.lineBetween(11, 13, 28, 27);
    graphics.lineStyle(2, 0xffffff, 0.45);
    graphics.lineBetween(17, 15, 23, 25);
    graphics.generateTexture('enemy-basic', 40, 40);
    graphics.destroy();
  }

  private makeRunnerTexture(): void {
    const colors = ENEMY_COLORS.runner;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(18, 0, 36, 35, 18, 28);
    graphics.fillTriangle(18, 0, 0, 35, 18, 28);
    graphics.fillTriangle(4, 26, 14, 20, 9, 35);
    graphics.fillTriangle(32, 26, 22, 20, 27, 35);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillTriangle(18, 5, 30, 31, 18, 24);
    graphics.fillTriangle(18, 5, 6, 31, 18, 24);
    graphics.fillStyle(colors.core, 0.95);
    graphics.fillTriangle(18, 9, 24, 25, 12, 25);
    graphics.lineStyle(2, colors.core, 0.6);
    graphics.lineBetween(7, 31, 1, 35);
    graphics.lineBetween(29, 31, 35, 35);
    graphics.lineBetween(18, 8, 18, 27);
    graphics.generateTexture('enemy-runner', 36, 36);
    graphics.destroy();
  }

  private makeTankTexture(): void {
    const colors = ENEMY_COLORS.tank;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawOctagon(graphics, 27, 27, 26);
    graphics.fillRect(2, 20, 11, 14);
    graphics.fillRect(41, 20, 11, 14);
    graphics.fillRect(20, 2, 14, 11);
    graphics.fillRect(20, 41, 14, 11);
    graphics.fillStyle(colors.fill, 1);
    this.drawOctagon(graphics, 27, 27, 21);
    graphics.fillStyle(0x32255f, 1);
    graphics.fillRect(7, 22, 8, 10);
    graphics.fillRect(39, 22, 8, 10);
    graphics.fillRect(22, 7, 10, 8);
    graphics.fillRect(22, 39, 10, 8);
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
    graphics.fillRect(0, 16, 12, 8);
    graphics.fillRect(28, 16, 12, 8);
    graphics.fillTriangle(20, 0, 39, 20, 20, 40);
    graphics.fillTriangle(20, 0, 1, 20, 20, 40);
    graphics.fillStyle(colors.fill, 1);
    this.drawDiamond(graphics, 20, 5, 30);
    graphics.fillStyle(0x145545, 1);
    graphics.fillRect(3, 18, 11, 4);
    graphics.fillRect(26, 18, 11, 4);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(20, 20, 6.5);
    graphics.lineStyle(2, colors.core, 0.75);
    graphics.strokeCircle(20, 20, 11);
    graphics.lineStyle(3, colors.core, 0.72);
    graphics.lineBetween(20, 7, 20, 0);
    graphics.generateTexture('enemy-ranged', 40, 40);
    graphics.destroy();
  }

  private makeSwarmTexture(): void {
    const colors = ENEMY_COLORS.swarm;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.beginPath();
    graphics.moveTo(13, 0);
    graphics.lineTo(18, 8);
    graphics.lineTo(26, 10);
    graphics.lineTo(19, 16);
    graphics.lineTo(21, 25);
    graphics.lineTo(13, 20);
    graphics.lineTo(5, 25);
    graphics.lineTo(7, 16);
    graphics.lineTo(0, 10);
    graphics.lineTo(8, 8);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(colors.fill, 1);
    graphics.beginPath();
    graphics.moveTo(13, 4);
    graphics.lineTo(17, 10);
    graphics.lineTo(22, 11);
    graphics.lineTo(17, 15);
    graphics.lineTo(18, 21);
    graphics.lineTo(13, 17);
    graphics.lineTo(8, 21);
    graphics.lineTo(9, 15);
    graphics.lineTo(4, 11);
    graphics.lineTo(9, 10);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(13, 13, 3.5);
    graphics.generateTexture('enemy-swarm', 26, 26);
    graphics.destroy();
  }

  private makeEliteRingTexture(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, COLORS.elite, 0.92);
    for (let i = 0; i < 4; i += 1) {
      const start = i * Math.PI * 0.5 + 0.08;
      graphics.beginPath();
      graphics.arc(34, 34, 30, start, start + Math.PI * 0.34);
      graphics.strokePath();
    }
    graphics.lineStyle(2, 0xffffff, 0.75);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      graphics.lineBetween(34 + Math.cos(angle) * 24, 34 + Math.sin(angle) * 24, 34 + Math.cos(angle) * 32, 34 + Math.sin(angle) * 32);
    }
    graphics.generateTexture('elite-ring', 68, 68);
    graphics.destroy();
  }

  private makeBossTexture(): void {
    this.makeGlowTexture('boss-glow', 190, COLORS.boss, 0.22);
    const size = 120;
    const graphics = this.add.graphics();
    const center = size / 2;
    graphics.fillStyle(0x1b153a, 1);
    this.drawPolygon(graphics, center, center, [54, 42, 58, 42, 54, 42], Math.PI / 6);
    graphics.fillStyle(COLORS.bossShell, 1);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = center + Math.cos(angle) * 40;
      const y = center + Math.sin(angle) * 40;
      graphics.fillTriangle(
        center + Math.cos(angle - 0.18) * 29,
        center + Math.sin(angle - 0.18) * 29,
        x + Math.cos(angle + Math.PI / 2) * 12,
        y + Math.sin(angle + Math.PI / 2) * 12,
        x + Math.cos(angle - Math.PI / 2) * 12,
        y + Math.sin(angle - Math.PI / 2) * 12,
      );
    }
    graphics.lineStyle(5, 0xfdf2a4, 0.78);
    graphics.strokeCircle(center, center, 49);
    graphics.lineStyle(2, COLORS.boss, 0.55);
    graphics.strokeCircle(center, center, 36);
    graphics.fillStyle(0x24174d, 1);
    graphics.fillCircle(center, center, 34);
    graphics.fillStyle(COLORS.boss, 1);
    this.drawPolygon(graphics, center, center, [24, 18, 24, 18, 24, 18], Math.PI / 6);
    graphics.fillStyle(0xfff7b0, 1);
    graphics.fillCircle(center, center, 13);
    graphics.fillStyle(0x2b204d, 1);
    graphics.fillCircle(center, center, 6);
    graphics.generateTexture('boss', size, size);
    graphics.destroy();

    const ring = this.add.graphics();
    ring.lineStyle(5, COLORS.boss, 0.78);
    for (let i = 0; i < 6; i += 1) {
      const start = (Math.PI * 2 * i) / 6 + 0.08;
      ring.beginPath();
      ring.arc(64, 64, 57, start, start + Math.PI * 0.28);
      ring.strokePath();
      const angle = start + Math.PI * 0.14;
      ring.fillStyle(0xfdf2a4, 0.9);
      ring.fillRect(64 + Math.cos(angle) * 53 - 4, 64 + Math.sin(angle) * 53 - 4, 8, 8);
    }
    ring.lineStyle(2, 0xffffff, 0.5);
    ring.strokeCircle(64, 64, 45);
    ring.generateTexture('boss-ring', 128, 128);
    ring.destroy();
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

  private makeDangerProjectileTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.enemyProjectile, 1);
    graphics.fillTriangle(17, 1, 32, 30, 17, 24);
    graphics.fillTriangle(17, 1, 2, 30, 17, 24);
    graphics.fillStyle(COLORS.enemyProjectileCore, 1);
    graphics.fillTriangle(17, 7, 25, 25, 17, 20);
    graphics.fillTriangle(17, 7, 9, 25, 17, 20);
    graphics.lineStyle(2, 0xffffff, 0.62);
    graphics.lineBetween(17, 3, 17, 27);
    graphics.generateTexture('enemy-projectile', 34, 34);
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

  private drawPolygon(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number, radii: number[], rotation = 0): void {
    graphics.beginPath();
    radii.forEach((radius, index) => {
      const angle = rotation + (Math.PI * 2 * index) / radii.length;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (index === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    });
    graphics.closePath();
    graphics.fillPath();
  }
}
