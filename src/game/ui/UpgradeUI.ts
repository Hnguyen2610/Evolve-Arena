import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';
import { COLORS, RARITY_COLORS } from '../config/visual';
import type { UpgradeDefinition, UpgradeState } from '../types';

export class UpgradeUI {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly cards: Phaser.GameObjects.Container[] = [];
  private readonly hitZones: Phaser.GameObjects.Rectangle[] = [];
  private readonly levels: UpgradeState;

  constructor(
    scene: Phaser.Scene,
    options: UpgradeDefinition[],
    levels: UpgradeState,
    onPick: (upgrade: UpgradeDefinition) => void,
  ) {
    this.scene = scene;
    this.levels = levels;
    const blocker = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, COLORS.backgroundDeep, 0.9)
      .setOrigin(0);
    const flash = scene.add.circle(scene.scale.width / 2, scene.scale.height * 0.18, 190, COLORS.xpBar, 0.08);
    const title = scene.add
      .text(scene.scale.width / 2, 0, 'LEVEL UP', {
        color: '#f7fbff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '30px',
        fontStyle: '900',
        align: 'center',
        stroke: '#07131a',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(scene.scale.width / 2, 0, 'Choose an Evolution', {
        color: COLORS.uiTextMuted,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '15px',
        fontStyle: '800',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container = scene.add
      .container(0, 0, [blocker, flash, title, subtitle])
      .setScrollFactor(0)
      .setDepth(UI_DEPTH.overlay);
    scene.tweens.add({ targets: flash, scale: 1.25, alpha: 0, duration: 460, ease: 'Sine.Out' });
    options.forEach((option, index) => {
      this.cards.push(this.createCard(option, index, onPick).setScrollFactor(0).setDepth(UI_DEPTH.overlay + 1).setAlpha(0));
    });
    scene.scale.on('resize', this.layout, this);
    this.layout();
    this.cards.forEach((card, index) => {
      const scale = card.scaleX;
      card.setScale(scale * 0.94);
      scene.tweens.add({
        targets: card,
        alpha: 1,
        scaleX: scale,
        scaleY: scale,
        delay: index * 50,
        duration: 160,
        ease: 'Back.Out',
      });
    });
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy();
    this.cards.forEach((card) => card.destroy());
    this.hitZones.forEach((zone) => zone.destroy());
  }

  private createCard(
    option: UpgradeDefinition,
    index: number,
    onPick: (upgrade: UpgradeDefinition) => void,
  ): Phaser.GameObjects.Container {
    const rarity = RARITY_COLORS[option.rarity];
    const shadow = this.scene.add.rectangle(5, 7, 270, 186, 0x000000, 0.26);
    const glow = this.scene.add.rectangle(0, 0, 270, 186, rarity.glow, option.rarity === 'epic' ? 0.2 : 0.1);
    const card = this.scene.add.rectangle(0, 0, 270, 186, rarity.fill, 0.98).setStrokeStyle(3, rarity.stroke, 0.75);
    const iconFrame = this.scene.add.circle(0, -55, 34, COLORS.uiPanelDark, 0.95).setStrokeStyle(2, rarity.stroke, 0.75);
    const iconKey = this.scene.textures.exists(`upgrade-${option.id}`) ? `upgrade-${option.id}` : 'upgrade-default';
    const icon = this.scene.add.image(0, -55, iconKey).setScale(0.92);
    const name = this.scene.add
      .text(0, -12, option.name, {
        color: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '19px',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 220 },
        stroke: '#07131a',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const description = this.scene.add
      .text(0, 28, option.description, {
        color: '#dfe9ff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5);
    const level = this.scene.add
      .text(-72, 72, `LV ${(this.levels[option.id] ?? 0) + 1}/${option.maxLevel}`, {
        color: COLORS.uiTextMuted,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    const rarityText = this.scene.add
      .text(76, 72, option.rarity.toUpperCase(), {
        color: rarity.label,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    const container = this.scene.add.container(0, 0, [
      shadow,
      glow,
      card,
      iconFrame,
      icon,
      name,
      description,
      level,
      rarityText,
    ]);
    container.setData('index', index);
    container.setSize(270, 186);
    const hitZone = this.scene.add
      .rectangle(0, 0, 270, 186, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH.overlay + 2)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => this.scene.tweens.add({ targets: container, scale: this.getCardScale() * 1.04, duration: 90 }));
    hitZone.on('pointerout', () => this.scene.tweens.add({ targets: container, scale: this.getCardScale(), duration: 90 }));
    hitZone.on('pointerdown', () => this.scene.tweens.add({ targets: container, scale: this.getCardScale() * 0.97, duration: 70 }));
    hitZone.on('pointerup', () => onPick(option));
    this.hitZones[index] = hitZone;
    return container;
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const blocker = this.container.list[0] as Phaser.GameObjects.Rectangle;
    const flash = this.container.list[1] as Phaser.GameObjects.Arc;
    const title = this.container.list[2] as Phaser.GameObjects.Text;
    const subtitle = this.container.list[3] as Phaser.GameObjects.Text;
    const shortLandscape = width > height && height < 520;
    blocker.setSize(width, height);
    flash.setPosition(width / 2, shortLandscape ? 64 : Math.max(86, height * 0.15));
    title.setPosition(width / 2, shortLandscape ? 45 : Math.max(70, height * 0.13));
    title.setFontSize(shortLandscape ? 24 : 30);
    subtitle.setPosition(width / 2, shortLandscape ? 73 : Math.max(102, height * 0.13 + 33));
    subtitle.setFontSize(shortLandscape ? 13 : 15);

    const compact = width < 720;
    const scale = this.getCardScale();
    this.cards.forEach((card, index) => {
      const hitZone = this.hitZones[index];
      if (compact) {
        const x = width / 2;
        const y = Math.max(224, height * 0.25) + index * 172;
        card.setPosition(x, y).setScale(scale);
        hitZone.setPosition(x, y).setScale(scale);
      } else {
        const spacing = shortLandscape ? Math.min(270, width * 0.32) : 300;
        const x = width / 2 + (index - 1) * spacing;
        const y = shortLandscape ? height * 0.59 : height / 2 + 4;
        card.setPosition(x, y).setScale(scale);
        hitZone.setPosition(x, y).setScale(scale);
      }
    });
  }

  private getCardScale(): number {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const shortLandscape = width > height && height < 520;
    if (width < 720) {
      return Math.min(0.86, (width - 46) / 286);
    }
    return Math.min(1, (width - 48) / 900, shortLandscape ? 0.82 : 1);
  }
}
