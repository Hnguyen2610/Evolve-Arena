import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';

export class BossHealthBar {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const bg = scene.add.rectangle(0, 0, 520, 14, 0x000000, 0.58).setOrigin(0.5);
    this.fill = scene.add.rectangle(-260, 0, 520, 14, 0xf7d952, 0.95).setOrigin(0, 0.5);
    this.label = scene.add
      .text(0, -24, 'APEX CORE', {
        color: '#fff5a8',
        fontSize: '15px',
        fontStyle: '900',
        stroke: '#11131f',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [bg, this.fill, this.label]).setScrollFactor(0).setDepth(UI_DEPTH.hud);
    this.container.setVisible(false);
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  show(): void {
    this.container.setVisible(true);
  }

  update(current: number, max: number): void {
    this.fill.width = 520 * Phaser.Math.Clamp(current / max, 0, 1);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy();
  }

  private layout(): void {
    this.container.setPosition(this.scene.scale.width / 2, 86);
    const scale = Math.min(1, (this.scene.scale.width - 32) / 560);
    this.container.setScale(scale);
  }
}
