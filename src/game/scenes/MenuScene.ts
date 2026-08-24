import Phaser from 'phaser';
import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import { buyPermanentUpgrade, getPermanentUpgradeCost } from '../systems/ProgressionSystem';
import { LocalStorageGameStorage, loadSaveOrDefault, saveBestEffort } from '../services/StorageService';
import type { GameSaveData, PermanentUpgradeId } from '../types';

export class MenuScene extends Phaser.Scene {
  private storage = new LocalStorageGameStorage();
  private save!: GameSaveData;
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private isShutdown = true;

  constructor() {
    super('MenuScene');
  }

  async create(): Promise<void> {
    this.isShutdown = false;
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.save = await loadSaveOrDefault(this.storage);
    if (this.isShutdown) {
      return;
    }
    this.render();
  }

  private handleResize(): void {
    this.render();
  }

  private handleShutdown(): void {
    this.isShutdown = true;
    this.scale.off('resize', this.handleResize, this);
    this.nodes.forEach((node) => node.destroy());
    this.nodes = [];
  }

  private render(): void {
    if (!this.save) {
      return;
    }
    this.nodes.forEach((node) => node.destroy());
    this.nodes = [];
    const { width, height } = this.scale;
    const shortLandscape = width > height && height < 520;
    if (shortLandscape) {
      this.renderShortLandscape(width, height);
      return;
    }

    const centerX = width / 2;
    const startY = Math.max(92, height * 0.16);

    this.addNode(
      this.add
        .text(centerX, startY, 'Evolve Arena', {
          color: '#ffffff',
          fontSize: `${Math.min(52, Math.max(34, width * 0.055))}px`,
          fontStyle: '900',
        })
        .setOrigin(0.5),
    );
    this.addNode(
      this.add
        .text(centerX, startY + 48, 'Collect XP. Build synergies. Beat the Apex Core.', {
          color: '#d7edff',
          fontSize: '17px',
          align: 'center',
          wordWrap: { width: Math.min(560, width - 40) },
        })
        .setOrigin(0.5),
    );

    const playButton = this.createButton(centerX, startY + 106, Math.min(300, width - 42), 58, 'Play', () => {
      this.scene.start('GameScene', { save: this.save });
    });
    this.addNode(playButton);

    this.addNode(
      this.add
        .text(centerX, startY + 162, `Best ${this.save.bestScore}    Coins ${this.save.coins}`, {
          color: '#ffffff',
          fontSize: '18px',
          fontStyle: '800',
        })
        .setOrigin(0.5),
    );

    const upgradeY = startY + 235;
    this.addNode(
      this.add
        .text(centerX, upgradeY - 44, 'Permanent Upgrades', {
          color: '#9ff7db',
          fontSize: '18px',
          fontStyle: '900',
        })
        .setOrigin(0.5),
    );

    const ids: PermanentUpgradeId[] = ['damage', 'health', 'speed'];
    const compact = width < 720;
    ids.forEach((id, index) => {
      const x = compact ? centerX : centerX + (index - 1) * 250;
      const y = compact ? upgradeY + index * 82 : upgradeY + 24;
      this.addNode(this.createUpgradePanel(id, x, y, Math.min(230, width - 44)));
    });

    this.addNode(
      this.add
        .text(centerX, height - 34, 'WASD / Arrow Keys   |   Touch + drag to move', {
          color: '#b9c7dc',
          fontSize: '14px',
          align: 'center',
        })
        .setOrigin(0.5),
    );
  }

  private renderShortLandscape(width: number, height: number): void {
    const leftX = width * 0.31;
    const rightX = width * 0.72;
    const panelWidth = Math.min(260, Math.max(220, width * 0.28));

    this.addNode(
      this.add
        .text(leftX, 52, 'Evolve Arena', {
          color: '#ffffff',
          fontSize: '34px',
          fontStyle: '900',
        })
        .setOrigin(0.5),
    );
    this.addNode(
      this.add
        .text(leftX, 92, 'Collect XP. Build synergies. Beat the Apex Core.', {
          color: '#d7edff',
          fontSize: '15px',
          align: 'center',
          wordWrap: { width: Math.min(360, width * 0.48) },
        })
        .setOrigin(0.5),
    );
    this.addNode(
      this.createButton(leftX, 150, Math.min(250, width * 0.32), 52, 'Play', () => {
        this.scene.start('GameScene', { save: this.save });
      }),
    );
    this.addNode(
      this.add
        .text(leftX, 207, `Best ${this.save.bestScore}    Coins ${this.save.coins}`, {
          color: '#ffffff',
          fontSize: '16px',
          fontStyle: '800',
        })
        .setOrigin(0.5),
    );

    this.addNode(
      this.add
        .text(rightX, 54, 'Permanent Upgrades', {
          color: '#9ff7db',
          fontSize: '17px',
          fontStyle: '900',
        })
        .setOrigin(0.5),
    );
    const ids: PermanentUpgradeId[] = ['damage', 'health', 'speed'];
    ids.forEach((id, index) => {
      this.addNode(this.createUpgradePanel(id, rightX, 112 + index * 68, panelWidth, 56));
    });

    this.addNode(
      this.add
        .text(leftX, height - 28, 'WASD / Arrow Keys   |   Touch + drag to move', {
          color: '#b9c7dc',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: Math.min(390, width * 0.52) },
        })
        .setOrigin(0.5),
    );
  }

  private createUpgradePanel(
    id: PermanentUpgradeId,
    x: number,
    y: number,
    width: number,
    height = 66,
  ): Phaser.GameObjects.Container {
    const level = this.save.permanentUpgrades[id];
    const balance = PERMANENT_UPGRADE_BALANCE[id];
    const cost = getPermanentUpgradeCost(id, level);
    const maxed = level >= balance.maxLevel;
    const affordable = this.save.coins >= cost;
    const bg = this.add
      .rectangle(0, 0, width, height, affordable && !maxed ? 0x1f5f4d : 0x22283a, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.14);
    const label = this.add
      .text(-width / 2 + 14, -height * 0.28, `${balance.name} Lv ${level}/${balance.maxLevel}`, {
        color: '#ffffff',
        fontSize: height < 64 ? '14px' : '15px',
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    const value = this.add
      .text(-width / 2 + 14, height * 0.26, maxed ? 'MAX' : `${cost} coins`, {
        color: maxed ? '#9ff7db' : '#d7edff',
        fontSize: height < 64 ? '13px' : '14px',
      })
      .setOrigin(0, 0.5);
    const panel = this.add.container(x, y, [bg, label, value]);
    if (affordable && !maxed) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', async () => {
        const nextSave = buyPermanentUpgrade(this.save, id);
        this.save = nextSave;
        await saveBestEffort(this.storage, nextSave);
        if (!this.isShutdown) {
          this.render();
        }
      });
    }
    return panel;
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, width, height, 0x37d399, 0.96).setStrokeStyle(2, 0xffffff, 0.22);
    const text = this.add
      .text(0, 0, label, {
        color: '#07131a',
        fontSize: '24px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', onClick);
    return this.add.container(x, y, [bg, text]);
  }

  private addNode<T extends Phaser.GameObjects.GameObject>(node: T): T {
    this.nodes.push(node);
    return node;
  }
}
