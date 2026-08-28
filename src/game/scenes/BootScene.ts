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
    this.makeOrbiterTexture();
    this.makePulseCasterTexture();
    this.makeGuardianTexture();
    this.makeDisruptorTexture();
    this.makeAnchorTexture();
    this.makeInterceptorTexture();
    this.makeEnergyNodeTexture();
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

  private makeOrbiterTexture(): void {
    const colors = ENEMY_COLORS.orbiter;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawDiamond(graphics, 22, 0, 44);
    graphics.fillStyle(colors.fill, 1);
    this.drawDiamond(graphics, 22, 5, 34);
    graphics.lineStyle(4, colors.core, 0.68);
    graphics.beginPath();
    graphics.arc(22, 22, 18, Math.PI * 0.05, Math.PI * 0.78);
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(22, 22, 18, Math.PI * 1.05, Math.PI * 1.78);
    graphics.strokePath();
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(22, 22, 6);
    graphics.lineStyle(2, 0xffffff, 0.55);
    graphics.lineBetween(22, 6, 22, 38);
    graphics.generateTexture('enemy-orbiter', 44, 44);
    graphics.destroy();
  }

  private makePulseCasterTexture(): void {
    const colors = ENEMY_COLORS['pulse-caster'];
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(23, 0, 46, 23, 23, 46);
    graphics.fillTriangle(23, 0, 0, 23, 23, 46);
    graphics.fillCircle(23, 23, 18);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillTriangle(23, 6, 39, 23, 23, 40);
    graphics.fillTriangle(23, 6, 7, 23, 23, 40);
    graphics.fillCircle(23, 23, 13);
    graphics.lineStyle(3, colors.core, 0.76);
    graphics.strokeCircle(23, 23, 15);
    graphics.strokeCircle(23, 23, 7);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(23, 23, 4);
    graphics.generateTexture('enemy-pulse-caster', 46, 46);
    graphics.destroy();
  }

  private makeGuardianTexture(): void {
    const colors = ENEMY_COLORS.guardian;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawOctagon(graphics, 24, 24, 23);
    graphics.fillStyle(colors.fill, 1);
    this.drawOctagon(graphics, 24, 24, 18);
    graphics.lineStyle(4, colors.core, 0.75);
    graphics.beginPath();
    graphics.arc(24, 24, 15, Math.PI * 0.12, Math.PI * 0.72);
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(24, 24, 15, Math.PI * 1.12, Math.PI * 1.72);
    graphics.strokePath();
    graphics.fillStyle(colors.core, 1);
    graphics.fillTriangle(24, 9, 35, 32, 24, 28);
    graphics.fillTriangle(24, 9, 13, 32, 24, 28);
    graphics.generateTexture('enemy-guardian', 48, 48);
    graphics.destroy();
  }

  private makeDisruptorTexture(): void {
    const colors = ENEMY_COLORS.disruptor;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(22, 0, 44, 28, 26, 22);
    graphics.fillTriangle(22, 0, 0, 28, 18, 22);
    graphics.fillRect(7, 22, 30, 12);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillTriangle(22, 5, 35, 27, 24, 22);
    graphics.fillTriangle(22, 5, 9, 27, 20, 22);
    graphics.fillRect(11, 24, 22, 7);
    graphics.lineStyle(3, colors.core, 0.82);
    graphics.lineBetween(22, 6, 22, 39);
    graphics.lineBetween(12, 28, 32, 28);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(22, 28, 5);
    graphics.generateTexture('enemy-disruptor', 44, 44);
    graphics.destroy();
  }

  private makeAnchorTexture(): void {
    const colors = ENEMY_COLORS.anchor;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawOctagon(graphics, 25, 25, 24);
    graphics.fillStyle(colors.fill, 1);
    this.drawOctagon(graphics, 25, 25, 18);
    graphics.lineStyle(4, colors.core, 0.75);
    graphics.lineBetween(25, 6, 25, 44);
    graphics.lineBetween(6, 25, 44, 25);
    graphics.strokeCircle(25, 25, 13);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(25, 25, 6);
    graphics.generateTexture('enemy-anchor', 50, 50);
    graphics.destroy();
  }

  private makeInterceptorTexture(): void {
    const colors = ENEMY_COLORS.interceptor;
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    graphics.fillTriangle(22, 0, 44, 42, 22, 32);
    graphics.fillTriangle(22, 0, 0, 42, 22, 32);
    graphics.fillStyle(colors.fill, 1);
    graphics.fillTriangle(22, 6, 36, 35, 22, 27);
    graphics.fillTriangle(22, 6, 8, 35, 22, 27);
    graphics.lineStyle(3, colors.core, 0.82);
    graphics.lineBetween(22, 7, 22, 38);
    graphics.lineBetween(10, 31, 2, 40);
    graphics.lineBetween(34, 31, 42, 40);
    graphics.fillStyle(colors.core, 1);
    graphics.fillTriangle(22, 12, 28, 26, 16, 26);
    graphics.generateTexture('enemy-interceptor', 44, 44);
    graphics.destroy();
  }

  private makeEnergyNodeTexture(): void {
    const colors = ENEMY_COLORS['energy-node'];
    this.makeGlowTexture('energy-node-glow', 92, colors.fill, 0.25);
    const graphics = this.add.graphics();
    graphics.fillStyle(colors.stroke, 1);
    this.drawDiamond(graphics, 25, 0, 50);
    graphics.fillStyle(colors.fill, 1);
    this.drawDiamond(graphics, 25, 6, 38);
    graphics.lineStyle(3, colors.core, 0.85);
    this.strokeDiamond(graphics, 25, 9, 32);
    graphics.fillStyle(0x53330d, 0.92);
    graphics.fillCircle(25, 25, 12);
    graphics.fillStyle(colors.core, 1);
    graphics.fillCircle(25, 25, 6);
    graphics.generateTexture('enemy-energy-node', 50, 50);
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
    this.makeGlowTexture('rift-boss-glow', 190, 0xff68f0, 0.24);
    this.makeGlowTexture('forge-boss-glow', 198, 0xffa53d, 0.26);
    this.makeGlowTexture('grid-boss-glow', 198, 0x5ee7ff, 0.25);
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

    this.makeRiftBossTexture();
    this.makeForgeBossTexture();
    this.makeGridBossTexture();
  }

  private makeRiftBossTexture(): void {
    const size = 120;
    const graphics = this.add.graphics();
    const center = size / 2;
    graphics.fillStyle(0x120d2d, 1);
    this.drawPolygon(graphics, center, center, [58, 34, 58, 34, 58, 34, 58, 34], Math.PI / 8);
    graphics.fillStyle(0x214a8f, 1);
    this.drawPolygon(graphics, center, center, [48, 30, 48, 30, 48, 30, 48, 30], Math.PI / 8);
    graphics.lineStyle(5, 0xff68f0, 0.82);
    graphics.strokeCircle(center, center, 46);
    graphics.lineStyle(3, 0x8f6dff, 0.65);
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
      graphics.lineBetween(center, center, center + Math.cos(angle) * 50, center + Math.sin(angle) * 50);
    }
    graphics.fillStyle(0xff68f0, 1);
    this.drawDiamond(graphics, center, center - 24, 48);
    graphics.fillStyle(0xf9e8ff, 1);
    graphics.fillCircle(center, center, 12);
    graphics.fillStyle(0x0d1538, 1);
    graphics.fillCircle(center, center, 5);
    graphics.generateTexture('rift-boss', size, size);
    graphics.destroy();

    const ring = this.add.graphics();
    ring.lineStyle(5, 0xff68f0, 0.82);
    for (let i = 0; i < 8; i += 1) {
      const start = (Math.PI * 2 * i) / 8 + 0.05;
      ring.beginPath();
      ring.arc(64, 64, 57, start, start + Math.PI * 0.17);
      ring.strokePath();
    }
    ring.lineStyle(2, 0x8f6dff, 0.64);
    ring.strokeCircle(64, 64, 42);
    ring.generateTexture('rift-boss-ring', 128, 128);
    ring.destroy();
  }

  private makeForgeBossTexture(): void {
    const size = 124;
    const graphics = this.add.graphics();
    const center = size / 2;
    graphics.fillStyle(0x25160c, 1);
    this.drawPolygon(graphics, center, center, [58, 40, 56, 40, 58, 40], Math.PI / 6);
    graphics.fillStyle(0x27586b, 1);
    this.drawPolygon(graphics, center, center, [48, 34, 48, 34, 48, 34], Math.PI / 6);
    graphics.lineStyle(6, 0xffa53d, 0.85);
    graphics.strokeCircle(center, center, 48);
    graphics.lineStyle(3, 0xffd166, 0.72);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      graphics.lineBetween(center + Math.cos(angle) * 20, center + Math.sin(angle) * 20, center + Math.cos(angle) * 55, center + Math.sin(angle) * 55);
    }
    graphics.fillStyle(0xffa53d, 1);
    this.drawOctagon(graphics, center, center, 28);
    graphics.fillStyle(0xfff1b8, 1);
    graphics.fillCircle(center, center, 13);
    graphics.fillStyle(0x3a1f10, 1);
    graphics.fillCircle(center, center, 6);
    graphics.generateTexture('forge-boss', size, size);
    graphics.destroy();

    const ring = this.add.graphics();
    ring.lineStyle(5, 0xffa53d, 0.82);
    for (let i = 0; i < 6; i += 1) {
      const start = (Math.PI * 2 * i) / 6 + 0.04;
      ring.beginPath();
      ring.arc(66, 66, 59, start, start + Math.PI * 0.23);
      ring.strokePath();
      const angle = start + Math.PI * 0.12;
      ring.fillStyle(0xffd166, 0.95);
      ring.fillCircle(66 + Math.cos(angle) * 54, 66 + Math.sin(angle) * 54, 4);
    }
    ring.lineStyle(2, 0x69e7ff, 0.58);
    ring.strokeCircle(66, 66, 43);
    ring.generateTexture('forge-boss-ring', 132, 132);
    ring.destroy();
  }

  private makeGridBossTexture(): void {
    const size = 124;
    const graphics = this.add.graphics();
    const center = size / 2;
    graphics.fillStyle(0x071827, 1);
    this.drawOctagon(graphics, center, center, 58);
    graphics.fillStyle(0x263f73, 1);
    this.drawOctagon(graphics, center, center, 45);
    graphics.lineStyle(5, 0x5ee7ff, 0.86);
    graphics.strokeCircle(center, center, 48);
    graphics.lineStyle(3, 0xff8d32, 0.72);
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI * 2 * i) / 4;
      graphics.lineBetween(center + Math.cos(angle) * 16, center + Math.sin(angle) * 16, center + Math.cos(angle) * 56, center + Math.sin(angle) * 56);
    }
    graphics.fillStyle(0x5ee7ff, 1);
    this.drawDiamond(graphics, center, center - 30, 60);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(center, center, 12);
    graphics.fillStyle(0xff8d32, 1);
    graphics.fillCircle(center, center, 5);
    graphics.generateTexture('grid-boss', size, size);
    graphics.destroy();

    const ring = this.add.graphics();
    ring.lineStyle(5, 0x5ee7ff, 0.82);
    for (let i = 0; i < 8; i += 1) {
      const start = (Math.PI * 2 * i) / 8 + 0.03;
      ring.beginPath();
      ring.arc(66, 66, 59, start, start + Math.PI * 0.18);
      ring.strokePath();
      const angle = start + Math.PI * 0.09;
      ring.fillStyle(i % 2 === 0 ? 0xff8d32 : 0xffffff, 0.9);
      ring.fillRect(66 + Math.cos(angle) * 54 - 3, 66 + Math.sin(angle) * 54 - 3, 6, 6);
    }
    ring.lineStyle(2, 0xff8d32, 0.58);
    ring.strokeCircle(66, 66, 43);
    ring.generateTexture('grid-boss-ring', 132, 132);
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
