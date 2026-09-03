import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { COLORS } from '../config/visual';

export class BossHealthBar {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly lagFill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private targetWidth = 520;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panel = scene.add.rectangle(0, 0, 570, 48, COLORS.uiPanelDark, 0.78).setOrigin(0.5);
    this.panel.setStrokeStyle(2, COLORS.boss, 0.48);
    const bg = scene.add.rectangle(-260, 10, 520, 14, 0x000000, 0.52).setOrigin(0, 0.5);
    this.lagFill = scene.add.rectangle(-260, 10, 520, 14, COLORS.warning, 0.5).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(-260, 10, 520, 14, COLORS.boss, 0.96).setOrigin(0, 0.5);
    this.label = scene.add
      .text(0, -12, 'APEX CORE', {
        color: '#fff5a8',
        fontSize: '15px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container = scene.add
      .container(0, 0, [this.panel, bg, this.lagFill, this.fill, this.label])
      .setScrollFactor(0)
      .setDepth(UI_DEPTH.hud);
    this.container.setVisible(false);
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  show(label = 'APEX CORE', color = COLORS.boss, dangerColor = COLORS.warning): void {
    this.label.setText(label.toUpperCase());
    this.panel.setStrokeStyle(2, color, 0.48);
    this.fill.setFillStyle(color, 0.96);
    this.lagFill.setFillStyle(dangerColor, 0.5);
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 180 });
  }

  update(current: number, max: number): void {
    this.targetWidth = 520 * Phaser.Math.Clamp(current / max, 0, 1);
    this.fill.width = this.targetWidth;
    this.lagFill.width += (this.targetWidth - this.lagFill.width) * 0.08;
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy();
  }

  private layout(): void {
    const shortLandscape = this.scene.scale.width > this.scene.scale.height && this.scene.scale.height < 520;
    this.container.setPosition(this.scene.scale.width / 2, shortLandscape ? 108 : 92);
    const scale = Math.min(1, (this.scene.scale.width - 32) / 590);
    this.container.setScale(scale);
  }
}
