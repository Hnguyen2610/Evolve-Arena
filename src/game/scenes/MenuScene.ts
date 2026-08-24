import Phaser from 'phaser';
import { PERMANENT_UPGRADE_BALANCE } from '../config/balance';
import { COLORS } from '../config/visual';
import { buyPermanentUpgrade, getPermanentUpgradeCost } from '../systems/ProgressionSystem';
import { gameStorage, platform } from '../services/PlatformServices';
import { setLatestSaveSnapshot } from '../services/PersistenceCoordinator';
import { loadSaveOrDefault, saveBestEffort } from '../services/StorageService';
import type { GameSaveData, PermanentUpgradeId } from '../types';

export class MenuScene extends Phaser.Scene {
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
    await platform.initialize();
    this.save = await loadSaveOrDefault(gameStorage);
    setLatestSaveSnapshot(this.save);
    if (this.isShutdown) {
      return;
    }
    this.render();
    platform.signalGameReady();
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

    this.addLogo(centerX, startY, Math.min(58, Math.max(38, width * 0.06)));
    this.addNode(
      this.add
        .text(centerX, startY + 54, 'Collect XP. Build synergies. Beat the Apex Core.', {
          color: '#d7edff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '17px',
          fontStyle: '700',
          align: 'center',
          wordWrap: { width: Math.min(560, width - 40) },
        })
        .setOrigin(0.5),
    );

    const playButton = this.createButton(centerX, startY + 118, Math.min(340, width - 42), 64, 'PLAY', () => {
      this.scene.start('GameScene', { save: this.save });
    });
    this.addNode(playButton);

    this.addNode(
      this.add
        .text(centerX, startY + 178, `Best ${this.save.bestScore}    Coins ${this.save.coins}`, {
          color: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '18px',
          fontStyle: '800',
        })
        .setOrigin(0.5),
    );

    const upgradeY = startY + 260;
    this.addNode(
      this.add
        .text(centerX, upgradeY - 44, 'Permanent Upgrades', {
          color: '#9ff7db',
          fontFamily: 'Arial, Helvetica, sans-serif',
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
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '14px',
          fontStyle: '700',
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

    this.addLogo(leftX, 52, 34);
    this.addNode(
      this.add
        .text(leftX, 92, 'Collect XP. Build synergies. Beat the Apex Core.', {
          color: '#d7edff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '15px',
          fontStyle: '700',
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
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
          fontStyle: '800',
        })
        .setOrigin(0.5),
    );

    this.addNode(
      this.add
        .text(rightX, 54, 'Permanent Upgrades', {
          color: '#9ff7db',
          fontFamily: 'Arial, Helvetica, sans-serif',
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
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          fontStyle: '700',
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
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height < 64 ? '14px' : '15px',
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    const effect = this.add
      .text(-width / 2 + 14, height < 66 ? 4 : 2, this.getPermanentUpgradeEffectText(id), {
        color: '#b9c7dc',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height < 66 ? '11px' : '12px',
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);
    const value = this.add
      .text(-width / 2 + 14, height * 0.3, maxed ? 'MAXED' : `${cost} coins`, {
        color: maxed ? '#9ff7db' : '#d7edff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height < 64 ? '13px' : '14px',
        fontStyle: '900',
      })
      .setOrigin(0, 0.5);
    const action = this.add
      .text(width / 2 - 14, height * 0.3, maxed ? '' : affordable ? 'UPGRADE' : 'LOCKED', {
        color: affordable ? '#9ff7db' : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
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
        setLatestSaveSnapshot(nextSave);
        await saveBestEffort(gameStorage, nextSave);
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
        fontFamily: 'Arial, Helvetica, sans-serif',
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

  private addLogo(x: number, y: number, size: number): void {
    const glow = this.add
      .text(x, y + 2, 'EVOLVE ARENA', {
        color: '#63e7ff',
        fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
        fontSize: `${size}px`,
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setAlpha(0.5);
    const title = this.add
      .text(x, y, 'EVOLVE ARENA', {
        color: '#f7fbff',
        fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
        fontSize: `${size}px`,
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    const accent = this.add.rectangle(x, y + size * 0.66, Math.min(420, size * 7.1), 3, COLORS.playerProjectileCore, 0.86);
    const core = this.add.image(x - Math.min(275, size * 4.55), y + 1, 'player').setScale(Math.max(0.38, size / 96)).setAlpha(0.95);
    this.addNode(glow);
    this.addNode(title);
    this.addNode(accent);
    this.addNode(core);
  }

  private addNode<T extends Phaser.GameObjects.GameObject>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private addMenuBackdrop(width: number, height: number): void {
    this.addNode(this.add.rectangle(width / 2, height / 2, width, height, COLORS.backgroundDeep, 1));
    this.addNode(this.add.circle(width * 0.23, height * 0.22, Math.min(250, width * 0.24), COLORS.playerGlow, 0.08));
    this.addNode(this.add.circle(width * 0.82, height * 0.72, Math.min(320, width * 0.28), COLORS.bossShell, 0.1));
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.arenaGrid, 0.13);
    for (let x = 0; x <= width; x += 72) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 72) {
      grid.lineBetween(0, y, width, y);
    }
    grid.lineStyle(4, COLORS.playerProjectileCore, 0.16);
    for (let i = 0; i < 4; i += 1) {
      const start = -Math.PI * 0.4 + i * Math.PI * 0.34;
      grid.beginPath();
      grid.arc(width * 0.22, height * 0.28, Math.min(210, width * 0.2), start, start + Math.PI * 0.22);
      grid.strokePath();
    }
    grid.lineStyle(5, COLORS.boss, 0.13);
    for (let i = 0; i < 5; i += 1) {
      const start = Math.PI * 0.55 + i * Math.PI * 0.28;
      grid.beginPath();
      grid.arc(width * 0.83, height * 0.72, Math.min(270, width * 0.24), start, start + Math.PI * 0.18);
      grid.strokePath();
    }
    grid.lineStyle(2, COLORS.arenaAccent, 0.18);
    grid.lineBetween(width * 0.18, height * 0.32, width * 0.47, height * 0.58);
    grid.lineBetween(width * 0.58, height * 0.42, width * 0.86, height * 0.66);
    grid.fillStyle(COLORS.arenaMark, 0.16);
    grid.fillCircle(width * 0.47, height * 0.58, 7);
    grid.fillCircle(width * 0.58, height * 0.42, 6);
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
