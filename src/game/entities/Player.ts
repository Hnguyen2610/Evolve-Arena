import Phaser from 'phaser';
import {
  getPlayerVisualAnimationKey,
  getPlayerVisualDirection,
  PLAYER_VISUAL,
  type PlayerVisualDirection,
  type PlayerVisualMotion,
} from '../config/playerVisual';
import { COLORS } from '../config/visual';
import {
  getDepthScale,
  getGroundedVisualY,
  getGroundEffectDepth,
  getShadowDepth,
  getVisualDepth,
  WORLD_PRESENTATION,
} from '../systems/WorldPresentation';
import { WORLD } from '../config/constants';
import type { PlayerStats, UpgradeState } from '../types';
import { addGlowFx, addShadowFx } from '../utils/phaserFx';

interface PlayerEvolutionVisuals {
  totalLevels: number;
  offenseLevels: number;
  projectileNodes: number;
  armorLevels: number;
  magnetLevels: number;
  lifestealLevels: number;
  attackSpeedLevels: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly energyField: Phaser.GameObjects.Arc;
  private readonly shieldRing: Phaser.GameObjects.Arc;
  private readonly magnetRing: Phaser.GameObjects.Arc;
  private readonly lifestealRing: Phaser.GameObjects.Arc;
  private readonly orbiters: Phaser.GameObjects.Image[] = [];
  private readonly fxGlow: Phaser.FX.Glow | null;
  private readonly fxShadow: Phaser.FX.Shadow | null;
  private evolution: PlayerEvolutionVisuals = {
    totalLevels: 0,
    offenseLevels: 0,
    projectileNodes: 0,
    armorLevels: 0,
    magnetLevels: 0,
    lifestealLevels: 0,
    attackSpeedLevels: 0,
  };
  private moving = false;
  private facing: PlayerVisualDirection = 'south';
  private lastMoveAngle = Math.PI / 2;
  private hurtFeedbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, PLAYER_VISUAL.fallbackTextureKey);
    this.stats = stats;
    this.shadow = scene.add.ellipse(x, y + 20, 46, 17, COLORS.playerGlow, 0.16).setDepth(7);
    this.energyField = scene.add.circle(x, y, 32, COLORS.playerGlow, 0.07).setDepth(8);
    this.energyField.setStrokeStyle(2, COLORS.playerProjectileCore, 0.18);
    this.magnetRing = scene.add.circle(x, y, 42, COLORS.playerMagnet, 0).setDepth(8).setVisible(false);
    this.magnetRing.setStrokeStyle(2, COLORS.playerMagnet, 0.2);
    this.lifestealRing = scene.add.circle(x, y, 36, COLORS.playerLifesteal, 0).setDepth(8).setVisible(false);
    this.lifestealRing.setStrokeStyle(2, COLORS.playerLifesteal, 0.22);
    this.shieldRing = scene.add.circle(x, y, 31, COLORS.playerShield, 0).setDepth(12).setVisible(false);
    this.shieldRing.setStrokeStyle(3, COLORS.playerShield, 0.46);
    for (let index = 0; index < 4; index += 1) {
      this.orbiters.push(scene.add.image(x, y, 'spark').setDepth(12).setAlpha(0).setScale(0.7).setTint(COLORS.playerProjectileCore));
    }
    this.glow = scene.add.image(x, y, 'player-glow').setDepth(9).setAlpha(0.72);
    const visualTexture = scene.textures.exists(PLAYER_VISUAL.textureKey) ? PLAYER_VISUAL.textureKey : PLAYER_VISUAL.fallbackTextureKey;
    this.visual = scene.add.sprite(x, y, visualTexture).setDepth(10).setScale(PLAYER_VISUAL.renderScale);
    this.playVisualAnimation('idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10).setVisible(false);
    this.setCollideWorldBounds(true);
    this.setCircle(PLAYER_VISUAL.collisionRadius, (this.width - PLAYER_VISUAL.collisionRadius * 2) / 2, (this.height - PLAYER_VISUAL.collisionRadius * 2) / 2);
    this.fxGlow = addGlowFx(scene, this.visual, COLORS.playerProjectileCore, 1.2, 0.18);
    this.fxShadow = addShadowFx(scene, this.visual, COLORS.playerGlow, 0.18);
  }

  applyInput(vector: Phaser.Math.Vector2): void {
    this.moving = vector.lengthSq() > 0.01;
    this.setVelocity(vector.x * this.stats.movementSpeed, vector.y * this.stats.movementSpeed);
    if (this.moving) {
      this.lastMoveAngle = vector.angle();
      this.facing = getPlayerVisualDirection(vector, this.facing);
    }
  }

  showHurtFeedback(): void {
    this.hurtFeedbackUntil = this.scene.time.now + 140;
    this.visual.setTint(0xfff2f5);
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({
      targets: this.visual,
      alpha: 0.62,
      scaleX: PLAYER_VISUAL.renderScale * 1.08,
      scaleY: PLAYER_VISUAL.renderScale * 0.92,
      duration: 58,
      yoyo: true,
      onComplete: () => {
        this.visual.clearTint();
        this.visual.setAlpha(1);
      },
    });
  }

  updateEvolutionVisuals(upgrades: UpgradeState): void {
    const getLevel = (id: string): number => upgrades[id] ?? 0;
    const offenseLevels =
      getLevel('damage') +
      getLevel('attack-speed') +
      getLevel('projectile-size') +
      getLevel('piercing') +
      getLevel('critical-chance') +
      getLevel('critical-damage') +
      getLevel('projectile-speed');
    const totalLevels = Object.values(upgrades).reduce((sum, level) => sum + level, 0);
    this.evolution = {
      totalLevels,
      offenseLevels,
      projectileNodes: Math.min(4, getLevel('projectile-count') + Math.floor(totalLevels / 2)),
      armorLevels: getLevel('armor'),
      magnetLevels: getLevel('magnet'),
      lifestealLevels: getLevel('lifesteal'),
      attackSpeedLevels: getLevel('attack-speed'),
    };
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const tier = Math.min(1, this.evolution.totalLevels / 7);
    const offense = Math.min(1, this.evolution.offenseLevels / 7);
    const cadence = Math.max(92, 190 - this.evolution.attackSpeedLevels * 13);
    const pulse = 0.06 + Math.sin(time / cadence) * (0.025 + offense * 0.025);
    const moveLean = this.moving ? 0.08 : 0;
    const squash = this.moving ? 1 + Math.sin(time / 105) * 0.025 : 1;
    const depthScale = getDepthScale(this.y, 0.1);
    const baseScale = PLAYER_VISUAL.renderScale * (1 + tier * 0.06) * depthScale;
    const visualDepth = getVisualDepth(this.y, 1.2);
    const footLift = 15 + tier * 3;
    const bob = this.moving ? Math.sin(time / 105) * 1.4 : Math.sin(time / 310) * 0.65;

    this.playVisualAnimation(this.moving ? 'run' : 'idle');
    this.visual
      .setDepth(visualDepth)
      .setPosition(this.x, getGroundedVisualY(this.y, bob, footLift))
      .setScale(baseScale * (1 + moveLean * 0.25), baseScale * squash);
    this.glow
      .setDepth(getGroundEffectDepth(this.y, 0.6))
      .setPosition(this.x, this.y)
      .setScale(1 + pulse + tier * 0.35 + offense * 0.12)
      .setAlpha(this.moving ? 0.76 + tier * 0.16 : 0.54 + tier * 0.18);
    // Enhanced depth-aware shadow for better grounding
    const shadowLength = 0.6 + 0.4 * ((this.y - WORLD_PRESENTATION.horizonY) / (WORLD.height - WORLD_PRESENTATION.horizonY));
    const shadowOffset = 20 + shadowLength * 10; // Longer shadow for objects further back
    const shadowVerticalScale = 0.3 + shadowLength * 0.4; // More stretched shadow for objects further back

    this.shadow
      .setDepth(getShadowDepth(this.y))
      .setPosition(this.x - Math.cos(this.lastMoveAngle) * (this.moving ? 5 : 0), this.y + shadowOffset)
      .setScale((1.08 + tier * 0.34) * depthScale, shadowVerticalScale * depthScale)
      .setAlpha(0.1 + tier * 0.05 + (1 - shadowLength) * 0.1); // More transparent for objects further back
    this.energyField
      .setDepth(getGroundEffectDepth(this.y, 0.1))
      .setPosition(this.x, this.y)
      .setRadius(32 + tier * 18 + offense * 6)
      .setAlpha(0.06 + tier * 0.08)
      .setRotation(time / 900);
    this.energyField.setStrokeStyle(2, COLORS.playerProjectileCore, 0.16 + tier * 0.2);
    if (this.fxGlow) {
      this.fxGlow.outerStrength = 1.1 + tier * 1.25 + offense * 0.65;
      this.fxGlow.innerStrength = 0.12 + offense * 0.18;
    }
    if (this.fxShadow) {
      this.fxShadow.intensity = 0.12 + tier * 0.16;
    }

    this.updateOptionalRings(time, tier);
    this.updateOrbiters(time, tier);
    if (time >= this.hurtFeedbackUntil) {
      this.visual.setAlpha(this.moving ? 1 : 0.97);
    }
  }

  private playVisualAnimation(motion: PlayerVisualMotion): void {
    const key = getPlayerVisualAnimationKey(this.facing, motion);
    if (this.scene.anims.exists(key) && this.visual.anims.currentAnim?.key !== key) {
      this.visual.play(key);
    }
  }

  private updateOptionalRings(time: number, tier: number): void {
    const armorVisible = this.evolution.armorLevels > 0;
    this.shieldRing
      .setVisible(armorVisible)
      .setDepth(getVisualDepth(this.y, 1.65))
      .setPosition(this.x, this.y)
      .setRadius(33 + this.evolution.armorLevels * 3)
      .setRotation(-time / 520);
    this.shieldRing.setStrokeStyle(2 + Math.min(2, this.evolution.armorLevels), COLORS.playerShield, armorVisible ? 0.3 + tier * 0.18 : 0);

    const magnetVisible = this.evolution.magnetLevels > 0;
    this.magnetRing
      .setVisible(magnetVisible)
      .setDepth(getGroundEffectDepth(this.y))
      .setPosition(this.x, this.y)
      .setRadius(48 + this.evolution.magnetLevels * 7 + Math.sin(time / 360) * 3);
    this.magnetRing.setStrokeStyle(2, COLORS.playerMagnet, magnetVisible ? 0.12 + this.evolution.magnetLevels * 0.025 : 0);

    const lifestealVisible = this.evolution.lifestealLevels > 0;
    this.lifestealRing
      .setVisible(lifestealVisible)
      .setDepth(getGroundEffectDepth(this.y, 0.2))
      .setPosition(this.x, this.y)
      .setRadius(37 + Math.sin(time / 220) * 4)
      .setAlpha(lifestealVisible ? 0.24 + Math.sin(time / 180) * 0.05 : 0);
  }

  private updateOrbiters(time: number, tier: number): void {
    const count = this.evolution.projectileNodes;
    this.orbiters.forEach((orbiter, index) => {
      if (index >= count) {
        orbiter.setAlpha(0);
        return;
      }
      const angle = time / 480 + (Math.PI * 2 * index) / Math.max(1, count);
      const radius = 34 + tier * 16;
      orbiter
        .setDepth(getVisualDepth(this.y, 2.1))
        .setPosition(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius * 0.78)
        .setAlpha(0.52 + tier * 0.28)
        .setScale(0.58 + tier * 0.3)
        .setRotation(angle);
    });
  }

  destroy(fromScene?: boolean): void {
    this.visual.destroy();
    this.glow.destroy();
    this.shadow.destroy();
    this.energyField.destroy();
    this.shieldRing.destroy();
    this.magnetRing.destroy();
    this.lifestealRing.destroy();
    this.orbiters.forEach((orbiter) => orbiter.destroy());
    super.destroy(fromScene);
  }
}
