import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { COLORS, cssColor } from '../config/visual';
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
  private panel!: Phaser.GameObjects.Rectangle;
  private healthBg!: Phaser.GameObjects.Rectangle;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private healthLow!: Phaser.GameObjects.Rectangle;
  private xpBg!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private levelBadge!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
    scene.scale.on('resize', this.layout, this);
  }

  update(snapshot: HudSnapshot): void {
    const width = this.getBarWidth();
    const hpRatio = Phaser.Math.Clamp(snapshot.stats.currentHealth / snapshot.stats.maxHealth, 0, 1);
    const xpRatio = Phaser.Math.Clamp(snapshot.xp / getRequiredXp(snapshot.level), 0, 1);
    this.healthFill.width = width * hpRatio;
    this.healthLow.width = width;
    this.healthLow.setAlpha(hpRatio < 0.28 ? 0.28 + Math.sin(this.scene.time.now / 90) * 0.08 : 0);
    this.xpFill.width = width * xpRatio;
    this.levelBadge.setText(`LV ${snapshot.level}`);
    this.scoreText.setText(`Score ${snapshot.score}  Kills ${snapshot.kills}  Coins ${snapshot.coins}`);
    this.timeText.setText(`${Math.floor(snapshot.timeSeconds)}s`);
    this.layout();
  }

  showHint(text: string): void {
    this.hintText.setText(text).setAlpha(1).setScale(0.96);
    this.scene.tweens.add({ targets: this.hintText, scale: 1, duration: 120, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: this.hintText, alpha: 0, delay: 1800, duration: 650 });
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
  }

  private create(): void {
    this.panel = this.scene.add.rectangle(12, 12, 466, 76, COLORS.uiPanelDark, 0.74).setOrigin(0).setScrollFactor(0);
    this.panel.setStrokeStyle(1, COLORS.arenaAccent, 0.8);
    this.healthBg = this.scene.add.rectangle(92, 22, 360, 14, 0x000000, 0.36).setOrigin(0).setScrollFactor(0);
    this.healthLow = this.scene.add.rectangle(92, 22, 360, 14, COLORS.lowHealth, 0).setOrigin(0).setScrollFactor(0);
    this.healthFill = this.scene.add.rectangle(92, 22, 360, 14, COLORS.health, 0.95).setOrigin(0).setScrollFactor(0);
    this.xpBg = this.scene.add.rectangle(92, 44, 360, 9, 0x000000, 0.34).setOrigin(0).setScrollFactor(0);
    this.xpFill = this.scene.add.rectangle(92, 44, 0, 9, COLORS.xpBar, 0.95).setOrigin(0).setScrollFactor(0);
    this.levelBadge = this.scene.add
      .text(26, 22, 'LV 1', {
        color: COLORS.uiText,
        fontSize: '18px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 4,
      })
      .setScrollFactor(0);
    this.scoreText = this.scene.add
      .text(92, 58, '', {
        color: COLORS.uiText,
        fontSize: '14px',
        fontStyle: '700',
        stroke: '#07131a',
        strokeThickness: 3,
      })
      .setScrollFactor(0);
    this.timeText = this.scene.add
      .text(0, 22, '', {
        color: cssColor(COLORS.xpBar),
        fontSize: '18px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setOrigin(1, 0);
    this.hintText = this.scene.add
      .text(0, 0, '', {
        color: COLORS.uiText,
        fontSize: '18px',
        fontStyle: '800',
        align: 'center',
        stroke: '#07131a',
        strokeThickness: 5,
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    [
      this.panel,
      this.healthBg,
      this.healthLow,
      this.healthFill,
      this.xpBg,
      this.xpFill,
      this.levelBadge,
      this.scoreText,
      this.timeText,
      this.hintText,
    ].forEach((item) => item.setDepth(UI_DEPTH.hud));
    this.layout();
  }

  private layout(): void {
    const compact = this.scene.scale.width < 520;
    const shortLandscape = this.scene.scale.width > this.scene.scale.height && this.scene.scale.height < 520;
    const margin = compact ? 10 : 16;
    const barWidth = this.getBarWidth();
    const panelWidth = compact ? this.scene.scale.width - margin * 2 : Math.min(486, this.scene.scale.width - margin * 2);
    const panelHeight = shortLandscape ? 62 : 76;
    const panelX = compact ? margin : 12;
    const panelY = shortLandscape ? 10 : 12;
    this.panel.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.levelBadge.setPosition(panelX + 14, panelY + 12).setFontSize(compact ? 15 : 18);
    this.healthBg.setPosition(panelX + 78, panelY + 12).setSize(barWidth, compact ? 12 : 14);
    this.healthLow.setPosition(panelX + 78, panelY + 12).setSize(barWidth, compact ? 12 : 14);
    this.healthFill.setPosition(panelX + 78, panelY + 12).setDisplaySize(this.healthFill.width, compact ? 12 : 14);
    this.xpBg.setPosition(panelX + 78, panelY + (compact ? 31 : 34)).setSize(barWidth, 9);
    this.xpFill.setPosition(panelX + 78, panelY + (compact ? 31 : 34)).setDisplaySize(this.xpFill.width, 9);
    this.scoreText.setPosition(panelX + 78, panelY + (compact ? 44 : 52)).setFontSize(compact ? 11 : 14);
    this.timeText.setPosition(panelX + panelWidth - 12, panelY + 12).setFontSize(compact ? 15 : 18);
    this.hintText.setPosition(this.scene.scale.width / 2, shortLandscape ? 92 : Math.min(128, this.scene.scale.height * 0.2));
    this.hintText.setWordWrapWidth(Math.max(260, this.scene.scale.width - 44));
    this.hintText.setFontSize(compact || shortLandscape ? 15 : 18);
  }

  private getBarWidth(): number {
    const compact = this.scene.scale.width < 520;
    const rightPadding = compact ? 106 : 128;
    return Math.max(170, Math.min(360, this.scene.scale.width - rightPadding));
  }
}
