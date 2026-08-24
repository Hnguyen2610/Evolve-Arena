import Phaser from 'phaser';
import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import { COLORS } from '../config/visual';
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
    this.addMenuBackdrop(width, height);

    this.addNode(
      this.add
        .text(centerX, startY, 'Evolve Arena', {
          color: '#f7fbff',
          fontSize: `${Math.min(52, Math.max(34, width * 0.055))}px`,
          fontStyle: '900',
          stroke: '#07131a',
          strokeThickness: 7,
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

    const playButton = this.createButton(centerX, startY + 106, Math.min(320, width - 42), 62, 'PLAY', () => {
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
      const y = compact ? upgradeY + index * 90 : upgradeY + 28;
      this.addNode(this.createUpgradePanel(id, x, y, Math.min(244, width - 44), compact ? 76 : 78));
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
    this.addMenuBackdrop(width, height);
    const leftX = width * 0.31;
    const rightX = width * 0.72;
    const panelWidth = Math.min(260, Math.max(220, width * 0.28));

    this.addNode(
      this.add
        .text(leftX, 52, 'Evolve Arena', {
          color: '#f7fbff',
          fontSize: '34px',
          fontStyle: '900',
          stroke: '#07131a',
          strokeThickness: 6,
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
      this.createButton(leftX, 150, Math.min(260, width * 0.32), 54, 'PLAY', () => {
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
      this.addNode(this.createUpgradePanel(id, rightX, 112 + index * 70, panelWidth, 62));
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
    const shadow = this.add.rectangle(4, 5, width, height, 0x000000, 0.24);
    const bg = this.add
      .rectangle(0, 0, width, height, affordable && !maxed ? 0x1d5b48 : COLORS.uiPanelLight, 0.94)
      .setStrokeStyle(2, affordable && !maxed ? COLORS.uiPrimary : COLORS.arenaAccent, affordable && !maxed ? 0.65 : 0.36);
    const label = this.add
      .text(-width / 2 + 14, -height * 0.29, `${balance.name}  Lv ${level}/${balance.maxLevel}`, {
        color: '#ffffff',
        fontSize: height < 64 ? '14px' : '15px',
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    const effect = this.add
      .text(-width / 2 + 14, height < 66 ? 4 : 2, this.getPermanentUpgradeEffectText(id), {
        color: '#b9c7dc',
        fontSize: height < 66 ? '11px' : '12px',
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);
    const value = this.add
      .text(-width / 2 + 14, height * 0.3, maxed ? 'MAXED' : `${cost} coins`, {
        color: maxed ? '#9ff7db' : '#d7edff',
        fontSize: height < 64 ? '13px' : '14px',
        fontStyle: '900',
      })
      .setOrigin(0, 0.5);
    const action = this.add
      .text(width / 2 - 14, height * 0.3, maxed ? '' : affordable ? 'UPGRADE' : 'LOCKED', {
        color: affordable ? '#9ff7db' : '#7f8ba3',
        fontSize: height < 66 ? '10px' : '11px',
        fontStyle: '900',
      })
      .setOrigin(1, 0.5);
    const panel = this.add.container(x, y, [shadow, bg, label, effect, value, action]);
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
    const shadow = this.add.rectangle(5, 7, width, height, 0x000000, 0.25);
    const bg = this.add.rectangle(0, 0, width, height, COLORS.uiPrimary, 0.98).setStrokeStyle(2, 0xffffff, 0.28);
    const shine = this.add.rectangle(0, -height * 0.23, width - 18, Math.max(5, height * 0.1), 0xffffff, 0.22);
    const text = this.add
      .text(0, 0, label, {
        color: '#07131a',
        fontSize: '24px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x54e5b1, 1));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.uiPrimary, 0.98));
    bg.on('pointerdown', () => bg.setFillStyle(COLORS.uiPrimaryDark, 1));
    bg.on('pointerup', onClick);
    return this.add.container(x, y, [shadow, bg, shine, text]);
  }

  private addNode<T extends Phaser.GameObjects.GameObject>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private addMenuBackdrop(width: number, height: number): void {
    this.addNode(this.add.rectangle(width / 2, height / 2, width, height, COLORS.backgroundDeep, 1));
    this.addNode(this.add.circle(width * 0.24, height * 0.17, Math.min(260, width * 0.28), COLORS.playerGlow, 0.1));
    this.addNode(this.add.circle(width * 0.82, height * 0.78, Math.min(320, width * 0.32), COLORS.bossShell, 0.12));
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.arenaGrid, 0.18);
    for (let x = 0; x <= width; x += 72) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 72) {
      grid.lineBetween(0, y, width, y);
    }
    this.addNode(grid);
  }

  private getPermanentUpgradeEffectText(id: PermanentUpgradeId): string {
    if (id === 'damage') {
      return '+6% projectile damage / level';
    }
    if (id === 'health') {
      return '+10 max health / level';
    }
    return '+2.5% movement speed / level';
  }
}
