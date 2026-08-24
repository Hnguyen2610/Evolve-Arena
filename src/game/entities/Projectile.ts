import Phaser from 'phaser';
import type { ProjectileData } from '../types';
import type { Enemy } from './Enemy';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  projectileData: ProjectileData;
  readonly hitEnemies = new Set<Enemy>();
  private readonly trail: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, owner: 'player' | 'enemy') {
    super(scene, -200, -200, owner === 'player' ? 'projectile' : 'enemy-projectile');
    this.trail = scene.add
      .image(-200, -200, owner === 'player' ? 'projectile-trail' : 'enemy-projectile-trail')
      .setDepth(10)
      .setVisible(false);
    this.projectileData = {
      owner,
      damage: 0,
      pierceLeft: 0,
      expiresAt: 0,
      knockback: 0,
      size: 1,
    };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(11);
    this.disableBody(true, true);
  }

  fire(x: number, y: number, angle: number, speed: number, data: ProjectileData): void {
    this.projectileData = { ...data };
    this.hitEnemies.clear();
    this.enableBody(true, x, y, true, true);
    this.setScale(data.size);
    const radius = 7 * data.size;
    const diameter = radius * 2;
    this.setCircle(radius, (this.width - diameter) / 2, (this.height - diameter) / 2);
    this.setRotation(angle);
    this.trail.setVisible(true).setRotation(angle).setScale(data.size).setAlpha(data.owner === 'player' ? 0.42 : 0.55);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.trail.setVisible(this.active);
    if (!this.active) {
      return;
    }
    this.trail.setPosition(this.x - Math.cos(this.rotation) * 13, this.y - Math.sin(this.rotation) * 13);
    this.trail.setRotation(this.rotation);
  }

  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    super.destroy(fromScene);
  }
}
