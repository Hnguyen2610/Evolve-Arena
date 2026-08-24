import Phaser from 'phaser';
import type { XpOrbData } from '../types';

export class ExperienceOrb extends Phaser.Physics.Arcade.Sprite {
  xpData: XpOrbData;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, -200, 'xp-orb');
    this.glow = scene.add.image(-200, -200, 'xp-glow').setDepth(6).setVisible(false).setAlpha(0.55);
    this.xpData = { value: 0, attracted: false, spawnedAt: 0 };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.setCircle(7, (this.width - 14) / 2, (this.height - 14) / 2);
    this.disableBody(true, true);
  }

  drop(x: number, y: number, value: number): void {
    this.xpData = { value, attracted: false, spawnedAt: this.scene.time.now };
    this.enableBody(true, x, y, true, true);
    this.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-70, 70));
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.glow.setVisible(this.active);
    if (!this.active) {
      return;
    }
    this.glow.setPosition(this.x, this.y).setScale(this.xpData.attracted ? 1.18 : 0.92 + Math.sin(time / 180) * 0.08);
    this.setRotation(time / 600);
  }

  disableBody(disableGameObject?: boolean, hideGameObject?: boolean): this {
    super.disableBody(disableGameObject, hideGameObject);
    this.glow.setVisible(false);
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.glow.destroy();
    super.destroy(fromScene);
  }
}
