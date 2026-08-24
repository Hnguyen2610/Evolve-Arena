import Phaser from 'phaser';
import type { PlayerStats } from '../types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, 'player');
    this.stats = stats;
    this.shadow = scene.add.ellipse(x, y + 18, 42, 16, 0x000000, 0.26).setDepth(8);
    this.glow = scene.add.image(x, y, 'player-glow').setDepth(9).setAlpha(0.72);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    this.setCircle(18, (this.width - 36) / 2, (this.height - 36) / 2);
  }

  applyInput(vector: Phaser.Math.Vector2): void {
    this.moving = vector.lengthSq() > 0.01;
    this.setVelocity(vector.x * this.stats.movementSpeed, vector.y * this.stats.movementSpeed);
    if (this.moving) {
      this.rotation = vector.angle() + Math.PI / 2;
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const pulse = 0.06 + Math.sin(time / 180) * 0.025;
    this.glow.setPosition(this.x, this.y).setScale(1 + pulse).setAlpha(this.moving ? 0.82 : 0.62);
    this.shadow.setPosition(this.x, this.y + 19);
    this.setAlpha(this.moving ? 1 : 0.96);
  }

  destroy(fromScene?: boolean): void {
    this.glow.destroy();
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
