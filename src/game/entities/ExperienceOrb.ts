import Phaser from 'phaser';
import type { XpOrbData } from '../types';

export class ExperienceOrb extends Phaser.Physics.Arcade.Sprite {
  xpData: XpOrbData;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, -200, 'xp-orb');
    this.xpData = { value: 0, attracted: false };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.setCircle(7, (this.width - 14) / 2, (this.height - 14) / 2);
    this.disableBody(true, true);
  }

  drop(x: number, y: number, value: number): void {
    this.xpData = { value, attracted: false };
    this.enableBody(true, x, y, true, true);
    this.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-70, 70));
  }
}
