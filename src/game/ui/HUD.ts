import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { getRequiredXp } from '../systems/LevelSystem';
import type { PlayerStats } from '../types';

export interface HudSnapshot {
  stats: PlayerStats;
  level: number;
  xp: number;
  score: number;
  coins: number;
  timeSeconds: number;
  kills: number;
}

export class HUD {
  private readonly scene: Phaser.Scene;
  private healthBg!: Phaser.GameObjects.Rectangle;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private xpBg!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private statText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
    scene.scale.on('resize', this.layout, this);
  }

  update(snapshot: HudSnapshot): void {
    const width = Math.min(this.scene.scale.width - 32, 430);
    const hpRatio = Phaser.Math.Clamp(snapshot.stats.currentHealth / snapshot.stats.maxHealth, 0, 1);
    const xpRatio = Phaser.Math.Clamp(snapshot.xp / getRequiredXp(snapshot.level), 0, 1);
    this.healthFill.width = width * hpRatio;
    this.xpFill.width = width * xpRatio;
    this.statText.setText(
      `Lv ${snapshot.level}  Score ${snapshot.score}  Kills ${snapshot.kills}  Coins ${snapshot.coins}  ${Math.floor(snapshot.timeSeconds)}s`,
    );
    this.layout();
  }

  showHint(text: string): void {
    this.hintText.setText(text).setAlpha(1);
    this.scene.tweens.add({ targets: this.hintText, alpha: 0, delay: 2200, duration: 800 });
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
  }

  private create(): void {
    this.healthBg = this.scene.add.rectangle(16, 16, 430, 14, 0x000000, 0.42).setOrigin(0).setScrollFactor(0);
    this.healthFill = this.scene.add.rectangle(16, 16, 430, 14, 0x58e079, 0.92).setOrigin(0).setScrollFactor(0);
    this.xpBg = this.scene.add.rectangle(16, 36, 430, 10, 0x000000, 0.38).setOrigin(0).setScrollFactor(0);
    this.xpFill = this.scene.add.rectangle(16, 36, 0, 10, 0x6bc6ff, 0.92).setOrigin(0).setScrollFactor(0);
    this.statText = this.scene.add
      .text(16, 52, '', {
        color: '#ffffff',
        fontSize: '15px',
        fontStyle: '700',
        stroke: '#11131f',
        strokeThickness: 4,
      })
      .setScrollFactor(0);
    this.hintText = this.scene.add
      .text(0, 0, '', {
        color: '#ffffff',
        fontSize: '18px',
        fontStyle: '700',
        align: 'center',
        stroke: '#11131f',
        strokeThickness: 5,
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    [this.healthBg, this.healthFill, this.xpBg, this.xpFill, this.statText, this.hintText].forEach((item) =>
      item.setDepth(UI_DEPTH.hud),
    );
    this.layout();
  }

  private layout(): void {
    const margin = 16;
    const width = Math.min(this.scene.scale.width - margin * 2, 430);
    this.healthBg.setSize(width, 14);
    this.xpBg.setSize(width, 10);
    this.hintText.setPosition(this.scene.scale.width / 2, Math.min(120, this.scene.scale.height * 0.22));
    this.hintText.setWordWrapWidth(Math.max(260, this.scene.scale.width - 36));
    this.hintText.setFontSize(this.scene.scale.width < 460 ? 15 : 18);
  }
}
