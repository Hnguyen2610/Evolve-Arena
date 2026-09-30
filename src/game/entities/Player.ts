import Phaser from 'phaser';
import { getPlayerVisualDirection, getPlayerVisualFrame, PLAYER_VISUAL, type PlayerVisualDirection } from '../config/playerVisual';
import { COLORS } from '../config/visual';
import {
  getDepthScale,
  getGroundedVisualY,
  getGroundEffectDepth,
  getShadowDepth,
  getVisualDepth,
  projectY,
  WORLD_PRESENTATION,
} from '../systems/WorldPresentation';
import { WORLD } from '../config/constants';
import type { PlayerStats, UpgradeState } from '../types';
import { addGlowFx, addShadowFx } from '../utils/phaserFx';

const FACING_ANGLES: Record<PlayerVisualDirection, number> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: -Math.PI / 2,
};

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
  private readonly visualUpper: Phaser.GameObjects.Sprite;
  private readonly visualLegs: Phaser.GameObjects.Sprite;
  private readonly hasSplitVisual: boolean;
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
  // Continuous (not 4-direction) aim angle for the weapon sprite, in radians (0 = east, matching
  // Phaser.Math.Angle.Between). Falls back to the current facing direction when nothing has aimed
  // it this frame -- see aimAt() and preUpdate().
  private aimAngle = Math.PI / 2;
  private aimedThisFrame = false;

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
    this.glow = scene.add.image(x, y, 'player-glow').setDepth(9).setAlpha(0.42).setScale(0.75);
    this.hasSplitVisual = scene.textures.exists(PLAYER_VISUAL.textureKey);
    const visualTexture = this.hasSplitVisual ? PLAYER_VISUAL.textureKey : PLAYER_VISUAL.fallbackTextureKey;
    const upperFrame = this.hasSplitVisual ? getPlayerVisualFrame(this.facing, PLAYER_VISUAL.upperRow) : undefined;
    const legsFrame = this.hasSplitVisual ? getPlayerVisualFrame(this.facing, PLAYER_VISUAL.legsRow) : undefined;
    this.visualUpper = scene.add.sprite(x, y, visualTexture, upperFrame).setDepth(10).setScale(PLAYER_VISUAL.renderScale);
    this.visualLegs = scene.add
      .sprite(x, y, visualTexture, legsFrame)
      .setDepth(10)
      .setScale(PLAYER_VISUAL.renderScale)
      .setOrigin(PLAYER_VISUAL.legsPivotXFraction, PLAYER_VISUAL.legsPivotYFraction)
      .setVisible(this.hasSplitVisual);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10).setVisible(false);
    this.setCollideWorldBounds(true);
    this.setCircle(PLAYER_VISUAL.collisionRadius, (this.width - PLAYER_VISUAL.collisionRadius * 2) / 2, (this.height - PLAYER_VISUAL.collisionRadius * 2) / 2);
    this.fxGlow = addGlowFx(scene, this.visualUpper, COLORS.playerProjectileCore, 1.2, 0.18);
    this.fxShadow = addShadowFx(scene, this.visualUpper, COLORS.playerGlow, 0.18);
  }

  applyInput(vector: Phaser.Math.Vector2): void {
    this.moving = vector.lengthSq() > 0.01;
    this.setVelocity(vector.x * this.stats.movementSpeed, vector.y * this.stats.movementSpeed);
    if (this.moving) {
      this.lastMoveAngle = vector.angle();
      this.facing = getPlayerVisualDirection(vector, this.facing);
    }
  }

  /** Points the weapon at an exact angle in radians (0 = east), e.g. the current attack target.
   * Call every frame there's a target -- if it isn't called in a given frame, the weapon falls
   * back to matching the character's 4-direction facing instead of freezing at a stale angle. */
  aimAt(angle: number): void {
    this.aimAngle = angle;
    this.aimedThisFrame = true;
  }

  /** Faces the character toward an attack target (e.g. the current auto-attack target). Called
   * after movement each frame so it takes priority: the player visibly aims at whoever they're
   * fighting even while strafing in a different direction, and falls back to movement-facing
   * again once no target remains in range. */
  faceAttackTarget(target: { x: number; y: number }): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    this.facing = getPlayerVisualDirection({ x: dx, y: dy, lengthSq: () => dx * dx + dy * dy }, this.facing);
  }

  showHurtFeedback(): void {
    this.hurtFeedbackUntil = this.scene.time.now + 140;
    const targets = [this.visualUpper, this.visualLegs];
    targets.forEach((target) => target.setTint(0xfff2f5));
    this.scene.tweens.killTweensOf(targets);
    this.scene.tweens.add({
      targets,
      alpha: 0.62,
      scaleX: PLAYER_VISUAL.renderScale * 1.08,
      scaleY: PLAYER_VISUAL.renderScale * 0.92,
      duration: 58,
      yoyo: true,
      onComplete: () => {
        targets.forEach((target) => {
          target.clearTint();
          target.setAlpha(1);
        });
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
    if (!this.aimedThisFrame) {
      this.aimAngle = FACING_ANGLES[this.facing];
    }
    this.aimedThisFrame = false;
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
    const groundY = projectY(this.y);

    // getPlayerVisualDirection picks whichever of the 4 sprite rows is nearest the actual aim
    // angle (its dominant-axis rule is exactly "nearest cardinal by angle"), so this remainder is
    // always within +-45 degrees -- a small, natural-looking twist on top of the correct pose
    // rather than the character tipping over. This turns the 4-pose sprite into a continuous
    // 360-degree-facing character without needing new art.
    const rotationDelta = Phaser.Math.Angle.Wrap(this.aimAngle - FACING_ANGLES[this.facing]);

    if (this.hasSplitVisual) {
      this.visualUpper.setFrame(getPlayerVisualFrame(this.facing, PLAYER_VISUAL.upperRow));
      this.visualLegs.setFrame(getPlayerVisualFrame(this.facing, PLAYER_VISUAL.legsRow));
    }
    const upperY = getGroundedVisualY(this.y, bob, footLift);
    const scaleX = baseScale * (1 + moveLean * 0.25);
    const scaleY = baseScale * squash;
    // Legs are a separate sprite pivoted at the hip (see PLAYER_VISUAL.legsPivotYFraction) and
    // swung procedurally with a sine wave while moving, instead of frame-swapping between
    // independently AI-generated stride poses -- those don't share a registration point between
    // generations, so swapping them reads as the whole body jittering rather than walking.
    const legSwingAngle = this.moving
      ? Math.sin((time / PLAYER_VISUAL.legSwingPeriodMs) * Math.PI * 2) * PLAYER_VISUAL.legSwingMaxRadians
      : 0;
    const hipOffsetY = (PLAYER_VISUAL.legsPivotYFraction - 0.5) * PLAYER_VISUAL.frameHeight * scaleY;

    this.visualUpper
      .setDepth(visualDepth)
      .setPosition(this.x, upperY)
      .setRotation(rotationDelta)
      .setScale(scaleX, scaleY);
    this.visualLegs
      .setDepth(visualDepth - 0.1)
      .setPosition(this.x, upperY + hipOffsetY)
      .setRotation(rotationDelta + legSwingAngle)
      .setScale(scaleX, scaleY);
    this.glow
      .setDepth(getGroundEffectDepth(this.y, 0.6))
      .setPosition(this.x, groundY)
      .setScale(1 + pulse + tier * 0.35 + offense * 0.12)
      .setAlpha(this.moving ? 0.76 + tier * 0.16 : 0.54 + tier * 0.18);
    // Enhanced depth-aware shadow for better grounding
    const shadowLength = 0.6 + 0.4 * ((this.y - WORLD_PRESENTATION.horizonY) / (WORLD.height - WORLD_PRESENTATION.horizonY));
    const shadowOffset = 20 + shadowLength * 10; // Longer shadow for objects further back
    const shadowVerticalScale = 0.3 + shadowLength * 0.4; // More stretched shadow for objects further back

    this.shadow
      .setDepth(getShadowDepth(this.y))
      .setPosition(this.x - Math.cos(this.lastMoveAngle) * (this.moving ? 5 : 0), groundY + shadowOffset)
      .setScale((1.08 + tier * 0.34) * depthScale, shadowVerticalScale * depthScale)
      .setAlpha(0.1 + tier * 0.05 + (1 - shadowLength) * 0.1); // More transparent for objects further back
    this.energyField
      .setDepth(getGroundEffectDepth(this.y, 0.1))
      .setPosition(this.x, groundY)
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
      const restAlpha = this.moving ? 1 : 0.97;
      this.visualUpper.setAlpha(restAlpha);
      this.visualLegs.setAlpha(restAlpha);
    }
  }

  private updateOptionalRings(time: number, tier: number): void {
    const groundY = projectY(this.y);
    const armorVisible = this.evolution.armorLevels > 0;
    this.shieldRing
      .setVisible(armorVisible)
      .setDepth(getVisualDepth(this.y, 1.65))
      .setPosition(this.x, groundY)
      .setRadius(33 + this.evolution.armorLevels * 3)
      .setRotation(-time / 520);
    this.shieldRing.setStrokeStyle(2 + Math.min(2, this.evolution.armorLevels), COLORS.playerShield, armorVisible ? 0.3 + tier * 0.18 : 0);

    const magnetVisible = this.evolution.magnetLevels > 0;
    this.magnetRing
      .setVisible(magnetVisible)
      .setDepth(getGroundEffectDepth(this.y))
      .setPosition(this.x, groundY)
      .setRadius(48 + this.evolution.magnetLevels * 7 + Math.sin(time / 360) * 3);
    this.magnetRing.setStrokeStyle(2, COLORS.playerMagnet, magnetVisible ? 0.12 + this.evolution.magnetLevels * 0.025 : 0);

    const lifestealVisible = this.evolution.lifestealLevels > 0;
    this.lifestealRing
      .setVisible(lifestealVisible)
      .setDepth(getGroundEffectDepth(this.y, 0.2))
      .setPosition(this.x, groundY)
      .setRadius(37 + Math.sin(time / 220) * 4)
      .setAlpha(lifestealVisible ? 0.24 + Math.sin(time / 180) * 0.05 : 0);
  }

  private updateOrbiters(time: number, tier: number): void {
    const groundY = projectY(this.y);
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
        .setPosition(this.x + Math.cos(angle) * radius, groundY + Math.sin(angle) * radius * 0.78)
        .setAlpha(0.52 + tier * 0.28)
        .setScale(0.58 + tier * 0.3)
        .setRotation(angle);
    });
  }

  destroy(fromScene?: boolean): void {
    this.visualUpper.destroy();
    this.visualLegs.destroy();
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
