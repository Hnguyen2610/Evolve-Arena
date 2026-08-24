import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createTextures();
    this.scene.start('MenuScene');
  }

  private createTextures(): void {
    this.makeCircleTexture('player', 50, 0x67e8f9, 0xffffff);
    this.makeCircleTexture('projectile', 26, 0xdaf7ff, 0x57d1ff);
    this.makeCircleTexture('enemy-projectile', 24, 0xff5b6d, 0xffe1e7);
    this.makeCircleTexture('xp-orb', 22, 0x68ff9c, 0xf1fff5);
    this.makeCircleTexture('enemy-basic', 40, 0xff6b6b, 0xffd0d0);
    this.makeTriangleTexture('enemy-runner', 36, 0xffc857);
    this.makeCircleTexture('enemy-tank', 54, 0x8d6bff, 0xe2d8ff);
    this.makeDiamondTexture('enemy-ranged', 40, 0x47d7ac);
    this.makeCircleTexture('enemy-swarm', 26, 0xff8bd1, 0xffd7ef);
    this.makeBossTexture();
    this.makeCircleTexture('spark', 10, 0xffffff, 0xffffff);
  }

  private makeCircleTexture(key: string, size: number, fill: number, stroke: number): void {
    const graphics = this.add.graphics().setDepth(UI_DEPTH.world);
    const radius = size / 2;
    graphics.fillStyle(fill, 1);
    graphics.fillCircle(radius, radius, radius - 2);
    graphics.lineStyle(3, stroke, 0.95);
    graphics.strokeCircle(radius, radius, radius - 3);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeTriangleTexture(key: string, size: number, fill: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, 1);
    graphics.lineStyle(3, 0xffffff, 0.9);
    const path = new Phaser.Geom.Triangle(size / 2, 3, size - 3, size - 5, 3, size - 5);
    graphics.fillTriangleShape(path);
    graphics.strokeTriangleShape(path);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeDiamondTexture(key: string, size: number, fill: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, 1);
    graphics.lineStyle(3, 0xffffff, 0.9);
    graphics.beginPath();
    graphics.moveTo(size / 2, 3);
    graphics.lineTo(size - 3, size / 2);
    graphics.lineTo(size / 2, size - 3);
    graphics.lineTo(3, size / 2);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private makeBossTexture(): void {
    const size = 120;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3e2d7d, 1);
    graphics.fillCircle(size / 2, size / 2, 56);
    graphics.fillStyle(0xf6f06c, 1);
    graphics.fillCircle(size / 2, size / 2, 32);
    graphics.lineStyle(5, 0xffffff, 0.85);
    graphics.strokeCircle(size / 2, size / 2, 54);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      graphics.lineBetween(
        size / 2 + Math.cos(angle) * 36,
        size / 2 + Math.sin(angle) * 36,
        size / 2 + Math.cos(angle) * 58,
        size / 2 + Math.sin(angle) * 58,
      );
    }
    graphics.generateTexture('boss', size, size);
    graphics.destroy();
  }
}
