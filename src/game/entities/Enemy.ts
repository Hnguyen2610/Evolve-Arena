import Phaser from 'phaser';
import {
  ENEMY_VISUAL_ATLAS,
  getEnemyVisualAnimationKey,
  getEnemyVisualConfig,
  getEnemyVisualStartFrame,
  type EnemyVisualConfig,
} from '../config/enemyVisual';
import { COLORS } from '../config/visual';
import type { EnemyDefinition, EnemyRuntimeData } from '../types';
import { addGlowFx, addShadowFx } from '../utils/phaserFx';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  dataModel: EnemyRuntimeData;
  private readonly visualConfig: EnemyVisualConfig | null;
  private readonly visual?: Phaser.GameObjects.Sprite;
  private readonly eliteRing?: Phaser.GameObjects.Image;
  private readonly glow?: Phaser.GameObjects.Image;
  private readonly bossRing?: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly baseDisplayScale: number;
  private readonly baseVisualScale: number;
  private readonly fxGlow: Phaser.FX.Glow | null;
  private readonly fxShadow: Phaser.FX.Shadow | null;
  private hurtFeedbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition, elite: boolean, scale: number) {
    const bossType = definition.behavior === 'boss';
    super(scene, x, y, bossType ? definition.type : `enemy-${definition.type}`);
    this.visualConfig = bossType ? null : getEnemyVisualConfig(definition.type);
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
    this.setDepth(bossType ? 9 : 8);
    this.setTint(elite ? 0xffffff : definition.tint);
    this.setScale(elite ? 1.28 : 1);
    this.baseDisplayScale = elite ? 1.28 : 1;
    this.baseVisualScale = (this.visualConfig?.scale ?? 1) * (elite ? 1.16 : 1);
    if (this.visualConfig && scene.textures.exists(ENEMY_VISUAL_ATLAS.textureKey)) {
      const startFrame = getEnemyVisualStartFrame(this.visualConfig);
      this.visual = scene.add
        .sprite(x, y, ENEMY_VISUAL_ATLAS.textureKey, startFrame)
        .setDepth(8)
        .setScale(this.baseVisualScale);
      const animationKey = getEnemyVisualAnimationKey(this.visualConfig.enemyType);
      if (scene.anims.exists(animationKey)) {
        this.visual.play(animationKey);
      }
      this.setVisible(false);
    }
    this.shadow = scene.add
      .ellipse(x, y + definition.radius * 0.58, definition.radius * (elite ? 2.25 : 1.85), definition.radius * 0.72, definition.tint, bossType ? 0.18 : 0.12)
      .setDepth(6);
    if (bossType) {
      this.glow = scene.add.image(x, y, this.getBossCompanionTexture('glow')).setDepth(7).setAlpha(0.42);
      this.bossRing = scene.add.image(x, y, this.getBossCompanionTexture('ring')).setDepth(8).setAlpha(0.9);
      this.fxGlow = addGlowFx(scene, this, definition.tint, 1.4, 0.18);
      this.fxShadow = addShadowFx(scene, this, definition.tint, 0.24);
    } else if (elite) {
      this.eliteRing = scene.add.image(x, y, 'elite-ring').setDepth(7).setAlpha(0.92).setScale(0.78);
      this.fxGlow = addGlowFx(scene, this, COLORS.elite, 0.72, 0.06);
      this.fxShadow = null;
    } else {
      this.fxGlow = null;
      this.fxShadow = null;
    }
    const diameter = definition.radius * 2;
    this.setCircle(definition.radius, (this.width - diameter) / 2, (this.height - diameter) / 2);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.updateBodyMotion(time);
    this.updateVisualPresentation(time);
    this.shadow
      .setPosition(this.x, this.y + this.dataModel.radius * 0.58)
        .setScale(this.isBossType() ? this.scaleX * 1.18 : this.scaleX, Math.max(0.75, this.scaleY))
      .setVisible(this.active);
    if (this.eliteRing) {
      this.eliteRing
        .setPosition(this.x, this.y)
        .setRotation(-time / 520)
        .setScale(this.scaleX * (0.84 + Math.sin(time / 260) * 0.035))
        .setVisible(this.active);
      if (this.fxGlow) {
        this.fxGlow.outerStrength = 0.62 + Math.sin(time / 260) * 0.18;
      }
    }
    if (this.glow) {
      const healthRatio = Phaser.Math.Clamp(this.dataModel.health / this.dataModel.maxHealth, 0, 1);
      const instability = 1 - healthRatio;
      this.glow
        .setPosition(this.x, this.y)
        .setScale(this.scaleX * (1.04 + Math.sin(time / (240 - instability * 90)) * (0.04 + instability * 0.05)))
        .setAlpha(0.35 + instability * 0.26)
        .setVisible(this.active);
      if (this.fxGlow) {
        this.fxGlow.outerStrength = 1.2 + instability * 1.1;
        this.fxGlow.innerStrength = 0.16 + instability * 0.18;
      }
      if (this.fxShadow) {
        this.fxShadow.intensity = 0.18 + instability * 0.16;
      }
    }
    if (this.bossRing) {
      const charging = this.dataModel.telegraphUntil > time || this.dataModel.chargeUntil > time;
      const healthRatio = Phaser.Math.Clamp(this.dataModel.health / this.dataModel.maxHealth, 0, 1);
      const instability = 1 - healthRatio;
      this.bossRing
        .setPosition(this.x, this.y)
        .setRotation(time / (charging ? 230 : 720 - instability * 240))
        .setScale(this.scaleX * (1.02 + Math.sin(time / 190) * (charging ? 0.045 : 0.018 + instability * 0.02)))
        .setAlpha(charging ? 1 : 0.76 + instability * 0.18)
        .setVisible(this.active);
    }
  }

  showHitFeedback(): void {
    const target = this.visual ?? this;
    this.hurtFeedbackUntil = this.scene.time.now + 130;
    target.setTint(0xffffff);
    this.scene.tweens.killTweensOf(target);
    this.scene.tweens.add({
      targets: target,
      alpha: 0.48,
      duration: 55,
      yoyo: true,
      onComplete: () => {
        target.clearTint();
        target.setAlpha(1);
      },
    });
  }

  private updateVisualPresentation(time: number): void {
    if (!this.visual || !this.visualConfig) {
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body && Math.abs(body.velocity.x) > 8) {
      this.visual.setFlipX(body.velocity.x < 0);
    }
    const scaleX = this.baseVisualScale * (this.scaleX / this.baseDisplayScale);
    const scaleY = this.baseVisualScale * (this.scaleY / this.baseDisplayScale);
    const floating = this.dataModel.behavior === 'ranged' || this.dataModel.behavior === 'node';
    const hover = floating ? Math.sin(time / 260 + this.x * 0.01) * 1.4 : 0;
    this.visual
      .setPosition(this.x, this.y + hover)
      .setScale(scaleX, scaleY)
      .setVisible(this.active);
    if (time >= this.hurtFeedbackUntil) {
      this.visual.setAlpha(1);
    }
  }

  private updateBodyMotion(time: number): void {
    const data = this.dataModel;
    if (this.isBossType()) {
      const healthRatio = Phaser.Math.Clamp(data.health / data.maxHealth, 0, 1);
      const instability = 1 - healthRatio;
      const charging = data.telegraphUntil > time || data.chargeUntil > time;
      const pulse = Math.sin(time / (charging ? 120 : 260 - instability * 90));
      this.setScale(this.baseDisplayScale * (1 + pulse * (0.018 + instability * 0.018)));
      return;
    }

    const life = Number(this.getData('lifeSeconds')) || 0;
    const phase = time / 1000 + life + this.x * 0.003;
    if (data.behavior === 'runner') {
      const stretch = 1 + Math.sin(time / 115) * 0.055;
      this.setScale(this.baseDisplayScale * (0.96 + stretch * 0.04), this.baseDisplayScale * (1.03 + stretch * 0.08));
    } else if (data.behavior === 'tank') {
      const weight = Math.sin(time / 420 + this.y * 0.004);
      this.setScale(this.baseDisplayScale * (1.02 + weight * 0.018), this.baseDisplayScale * (0.98 - weight * 0.012));
    } else if (data.behavior === 'ranged') {
      const charging = data.nextAttackAt > time && data.nextAttackAt - time < 380;
      const chargePulse = charging ? Math.sin(time / 70) * 0.055 : Math.sin(phase * 2.1) * 0.018;
      this.setScale(this.baseDisplayScale * (1 + chargePulse));
    } else if (data.behavior === 'swarm') {
      this.setScale(this.baseDisplayScale * (1 + Math.sin(time / 80 + this.x) * 0.045));
    } else if (data.behavior === 'guardian') {
      this.setScale(this.baseDisplayScale * (1.01 + Math.sin(time / 240) * 0.02), this.baseDisplayScale * (0.99 - Math.sin(time / 240) * 0.014));
    } else if (data.behavior === 'disruptor') {
      const charging = data.nextAttackAt > time && data.nextAttackAt - time < 520;
      this.setScale(this.baseDisplayScale * (1 + (charging ? Math.sin(time / 58) * 0.062 : Math.sin(phase * 1.9) * 0.02)));
    } else if (data.behavior === 'anchor') {
      const overloadPulse = data.telegraphUntil > time ? 0.055 : 0.018;
      this.setScale(this.baseDisplayScale * (1.01 + Math.sin(time / 150) * overloadPulse));
    } else if (data.behavior === 'interceptor') {
      const dashing = data.chargeUntil > time;
      const stretch = dashing ? 0.11 : 0.035;
      this.setScale(this.baseDisplayScale * (0.96 + stretch), this.baseDisplayScale * (1.02 + Math.sin(time / 90) * stretch));
    } else if (data.behavior === 'node') {
      this.setScale(this.baseDisplayScale * (1 + Math.sin(time / 180) * 0.035));
    } else {
      this.setScale(this.baseDisplayScale * (1 + Math.sin(phase * 2.4) * 0.024));
    }
  }

  private getBossCompanionTexture(kind: 'glow' | 'ring'): string {
    if (this.dataModel.type === 'rift-boss') {
      return `rift-boss-${kind}`;
    }
    if (this.dataModel.type === 'forge-boss') {
      return `forge-boss-${kind}`;
    }
    if (this.dataModel.type === 'grid-boss') {
      return `grid-boss-${kind}`;
    }
    return `boss-${kind}`;
  }

  private isBossType(): boolean {
    return this.dataModel.behavior === 'boss';
  }

  disableBody(disableGameObject?: boolean, hideGameObject?: boolean): this {
    super.disableBody(disableGameObject, hideGameObject);
    this.visual?.setVisible(false);
    this.eliteRing?.setVisible(false);
    this.glow?.setVisible(false);
    this.bossRing?.setVisible(false);
    this.shadow.setVisible(false);
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.visual?.destroy();
    this.eliteRing?.destroy();
    this.glow?.destroy();
    this.bossRing?.destroy();
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
