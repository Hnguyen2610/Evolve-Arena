import Phaser from 'phaser';
import { getVisualDepth, getDepthScale, projectY } from '../systems/WorldPresentation';
import type { ProjectileData } from '../types';
import type { Enemy } from './Enemy';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  projectileData: ProjectileData;
  readonly hitEnemies = new Set<Enemy>();
  private readonly trail: Phaser.GameObjects.Image;
  // The physics body (this.x/y) drives collision in raw gameplay space and stays invisible; this
  // visual sprite tracks the same horizon-projected Y used for Player/Enemy so the bullet appears
  // to leave the character's actual (compressed) on-screen position instead of their raw one.
  private readonly visual: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, owner: 'player' | 'enemy') {
    super(scene, -200, -200, owner === 'player' ? 'projectile' : 'enemy-projectile');
    this.trail = scene.add
      .image(-200, -200, owner === 'player' ? 'projectile-trail' : 'enemy-projectile-trail')
      .setDepth(10)
      .setVisible(false);
    this.visual = scene.add
      .image(-200, -200, owner === 'player' ? 'projectile' : 'enemy-projectile')
      .setDepth(11)
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
    this.setDepth(11).setVisible(false);
    this.disableBody(true, true);
  }

  fire(x: number, y: number, angle: number, speed: number, data: ProjectileData): void {
    this.projectileData = { ...data };
    this.hitEnemies.clear();
    this.enableBody(true, x, y, true, false);
    this.setScale(data.size);
    const radius = 7 * data.size;
    const diameter = radius * 2;
    this.setCircle(radius, (this.width - diameter) / 2, (this.height - diameter) / 2);
    this.setRotation(angle);
    this.visual.setVisible(true).setPosition(x, projectY(y)).setRotation(angle).setScale(data.size);
    const playerPower = data.owner === 'player' ? Phaser.Math.Clamp(data.damage / 42, 0.85, 1.7) : 1;
    this.trail
      .setVisible(true)
      .setRotation(angle)
      .setScale(data.size * playerPower, data.size)
      .setAlpha(data.owner === 'player' ? 0.34 + Math.min(0.24, data.size * 0.07 + playerPower * 0.06) : 0.55);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.trail.setVisible(this.active);
    this.visual.setVisible(this.active);
    if (!this.active) {
      return;
    }
    const groundY = projectY(this.y);
    const depth = getVisualDepth(this.y, 2.8);
    const depthScale = getDepthScale(this.y, 0.1); // Subtle size scaling for projectiles
    this.visual.setPosition(this.x, groundY).setRotation(this.rotation).setDepth(depth).setScale(this.projectileData.size * depthScale);
    this.trail.setDepth(depth - 0.15);
    this.trail.setScale(this.projectileData.size * depthScale);
    this.trail.setPosition(this.x - Math.cos(this.rotation) * 13, groundY - Math.sin(this.rotation) * 13);
    this.trail.setRotation(this.rotation);
    if (this.projectileData.owner === 'player') {
      this.trail.setAlpha(0.36 + Math.sin(time / 90) * 0.08 + Math.min(0.16, this.projectileData.size * 0.04));
    }
  }

  setTint(topLeft?: number, topRight?: number, bottomLeft?: number, bottomRight?: number): this {
    this.visual?.setTint(topLeft, topRight, bottomLeft, bottomRight);
    return this;
  }

  clearTint(): this {
    this.visual?.clearTint();
    return this;
  }

  disableBody(disableGameObject?: boolean, hideGameObject?: boolean): this {
    super.disableBody(disableGameObject, hideGameObject);
    this.trail.setVisible(false);
    this.visual.setVisible(false);
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    this.visual.destroy();
    super.destroy(fromScene);
  }
}
