import Phaser from 'phaser';
import type { PlayerStats } from '../types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, 'player');
    this.stats = stats;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    this.setCircle(18, (this.width - 36) / 2, (this.height - 36) / 2);
  }

  applyInput(vector: Phaser.Math.Vector2): void {
    this.setVelocity(vector.x * this.stats.movementSpeed, vector.y * this.stats.movementSpeed);
    if (vector.lengthSq() > 0.01) {
      this.rotation = vector.angle() + Math.PI / 2;
    }
  }
}
