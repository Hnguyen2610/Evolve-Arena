import Phaser from 'phaser';
import type { EnemyDefinition, EnemyRuntimeData } from '../types';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  dataModel: EnemyRuntimeData;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition, elite: boolean, scale: number) {
    super(scene, x, y, definition.type === 'boss' ? 'boss' : `enemy-${definition.type}`);
    const healthScale = elite ? 2.8 : 1;
    const damageScale = elite ? 1.45 : 1;
    this.dataModel = {
      type: definition.type,
      elite,
      health: definition.health * healthScale * scale,
      maxHealth: definition.health * healthScale * scale,
      speed: definition.speed * (elite ? 1.08 : 1) * Math.min(1.45, 0.92 + scale * 0.08),
      damage: definition.damage * damageScale * Math.min(1.55, 0.9 + scale * 0.1),
      xp: Math.floor(definition.xp * (elite ? 3.2 : 1) * Math.max(1, scale * 0.9)),
      score: Math.floor(definition.score * (elite ? 4 : 1)),
      radius: definition.radius * (elite ? 1.32 : 1),
      behavior: definition.behavior,
      nextAttackAt: 0,
      contactReadyAt: 0,
      chargeUntil: 0,
      telegraphUntil: 0,
    };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(definition.type === 'boss' ? 9 : 8);
    this.setTint(elite ? 0xffffff : definition.tint);
    this.setScale(elite ? 1.28 : 1);
    const diameter = definition.radius * 2;
    this.setCircle(definition.radius, (this.width - diameter) / 2, (this.height - diameter) / 2);
  }
}
