import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import type { UpgradeDefinition } from '../types';

export class UpgradeUI {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly cards: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene, options: UpgradeDefinition[], onPick: (upgrade: UpgradeDefinition) => void) {
    this.scene = scene;
    const blocker = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x050710, 0.78)
      .setOrigin(0);
    const title = scene.add
      .text(scene.scale.width / 2, 0, 'Choose an Evolution', {
        color: '#ffffff',
        fontSize: '26px',
        fontStyle: '900',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [blocker, title]).setScrollFactor(0).setDepth(UI_DEPTH.overlay);
    options.forEach((option, index) => {
      this.cards.push(this.createCard(option, index, onPick).setScrollFactor(0).setDepth(UI_DEPTH.overlay + 1));
    });
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy();
    this.cards.forEach((card) => card.destroy());
  }

  private createCard(
    option: UpgradeDefinition,
    index: number,
    onPick: (upgrade: UpgradeDefinition) => void,
  ): Phaser.GameObjects.Container {
    const bgColor = option.rarity === 'epic' ? 0x49366f : option.rarity === 'rare' ? 0x214a68 : 0x223d36;
    const card = this.scene.add.rectangle(0, 0, 240, 170, bgColor, 0.96).setStrokeStyle(2, 0xffffff, 0.22);
    const name = this.scene.add
      .text(0, -46, option.name, {
        color: '#ffffff',
        fontSize: '19px',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 200 },
      })
      .setOrigin(0.5);
    const description = this.scene.add
      .text(0, 10, option.description, {
        color: '#dfe9ff',
        fontSize: '15px',
        align: 'center',
        wordWrap: { width: 195 },
      })
      .setOrigin(0.5);
    const rarity = this.scene.add
      .text(0, 58, option.rarity.toUpperCase(), {
        color: '#9ff7db',
        fontSize: '12px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    const container = this.scene.add.container(0, 0, [card, name, description, rarity]);
    container.setData('index', index);
    container.setSize(240, 170);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-120, -85, 240, 170),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerover', () => this.scene.tweens.add({ targets: container, scale: 1.04, duration: 90 }));
    container.on('pointerout', () => this.scene.tweens.add({ targets: container, scale: 1, duration: 90 }));
    container.on('pointerup', () => onPick(option));
    return container;
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const blocker = this.container.list[0] as Phaser.GameObjects.Rectangle;
    const title = this.container.list[1] as Phaser.GameObjects.Text;
    blocker.setSize(width, height);
    title.setPosition(width / 2, Math.max(64, height * 0.17));

    const compact = width < 720;
    this.cards.forEach((card, index) => {
      if (compact) {
        card.setPosition(width / 2, Math.max(155, height * 0.28) + index * 188).setScale(Math.min(1, (width - 56) / 260));
      } else {
        card.setPosition(width / 2 + (index - 1) * 280, height / 2 + 38).setScale(1);
      }
    });
  }
}
