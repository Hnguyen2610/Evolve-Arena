import Phaser from 'phaser';
import { COLORS } from '../config/visual';
import { gameStorage, platform } from '../services/PlatformServices';
import { setLatestSaveSnapshot } from '../services/PersistenceCoordinator';
import { saveBestEffort } from '../services/StorageService';
import { persistResultAndMaybeSendScore } from '../systems/ResultPersistenceSystem';
import type { GameSaveData, RunResult } from '../types';

interface ResultSceneData {
  save: GameSaveData;
  result: RunResult;
}

export class ResultScene extends Phaser.Scene {
  private save!: GameSaveData;
  private result!: RunResult;

  constructor() {
    super('ResultScene');
  }

  async init(data: ResultSceneData): Promise<void> {
    this.save = data.save;
    this.result = data.result;
  }

  async create(): Promise<void> {
    this.scene.stop('GameScene');
    const persistence = await persistResultAndMaybeSendScore(this.save, this.result, {
      save: (save) => saveBestEffort(gameStorage, save),
      sendScore: (score) => platform.sendScore(score),
    });
    const newBest = persistence.newBest;
    this.save = persistence.save;
    setLatestSaveSnapshot(this.save);

    const { width, height } = this.scale;
    const centerX = width / 2;
    const shortLandscape = width > height && height < 520;
    const title = this.result.victory ? 'VICTORY' : 'RUN COMPLETE';
    const titleColor = this.result.victory ? '#fff5a8' : COLORS.uiText;

    this.addBackdrop(width, height);

    const panelWidth = shortLandscape ? Math.min(760, width - 56) : Math.min(540, width - 42);
    const panelHeight = shortLandscape ? Math.min(292, height - 52) : Math.min(520, height - 96);
    const panelY = shortLandscape ? height / 2 : height * 0.51;
    const panel = this.add.rectangle(centerX, panelY, panelWidth, panelHeight, COLORS.uiPanel, 0.94);
    panel.setStrokeStyle(2, this.result.victory ? COLORS.boss : COLORS.arenaAccent, 0.54);
    this.add.rectangle(centerX + 6, panelY + 8, panelWidth, panelHeight, 0x000000, 0.18);
    panel.setDepth(2);

    this.add
      .text(centerX, panelY - panelHeight * 0.37, title, {
        color: titleColor,
        fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
        fontSize: `${shortLandscape ? 32 : Math.min(54, Math.max(36, width * 0.06))}px`,
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(3);

    if (newBest) {
      this.add
        .text(centerX, panelY - panelHeight * 0.24, 'NEW BEST!', {
          color: '#9ff7db',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: shortLandscape ? '15px' : '17px',
          fontStyle: '900',
        })
        .setOrigin(0.5)
        .setDepth(3);
    }

    const scoreY = panelY - panelHeight * (shortLandscape ? 0.12 : 0.1);
    this.add
      .text(centerX, scoreY, `${this.result.score}`, {
        color: '#f7fbff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '34px' : '46px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.add
      .text(centerX, scoreY + (shortLandscape ? 34 : 46), `Best ${this.save.bestScore}   Coins +${this.result.coinsEarned}   Total ${this.save.coins}`, {
        color: '#dfe9ff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '14px' : '16px',
        fontStyle: '800',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const stats = `Kills ${this.result.kills}   Elites ${this.result.eliteKills}   Level ${this.result.playerLevel}   Time ${Math.floor(this.result.survivalSeconds)}s`;
    this.add
      .text(centerX, scoreY + (shortLandscape ? 62 : 78), stats, {
        color: COLORS.uiTextMuted,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '13px' : '15px',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: panelWidth - 42 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    if (shortLandscape) {
      const buttonWidth = Math.min(250, width * 0.32);
      const buttonY = panelY + panelHeight * 0.35;
      this.createButton(centerX - buttonWidth * 0.58, buttonY, buttonWidth, 50, 'PLAY AGAIN', () => {
        this.scene.start('GameScene', { save: this.save });
      });
      this.createButton(centerX + buttonWidth * 0.58, buttonY, buttonWidth, 50, 'UPGRADES', () => {
        this.scene.start('MenuScene');
      }, false);
    } else {
      this.createButton(centerX, panelY + panelHeight * 0.26, Math.min(320, panelWidth - 48), 60, 'PLAY AGAIN', () => {
        this.scene.start('GameScene', { save: this.save });
      });
      this.createButton(centerX, panelY + panelHeight * 0.4, Math.min(320, panelWidth - 48), 52, 'UPGRADES', () => {
        this.scene.start('MenuScene');
      }, false);
    }
  }

  private addBackdrop(width: number, height: number): void {
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.backgroundDeep, 1).setDepth(0);
    this.add.circle(width * 0.25, height * 0.2, Math.min(280, width * 0.25), COLORS.playerGlow, 0.09).setDepth(1);
    this.add.circle(width * 0.78, height * 0.72, Math.min(340, width * 0.3), COLORS.bossShell, 0.13).setDepth(1);
    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, COLORS.arenaGrid, 0.16);
    for (let x = 0; x <= width; x += 84) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 84) {
      grid.lineBetween(0, y, width, y);
    }
    grid.lineStyle(4, this.result.victory ? COLORS.boss : COLORS.playerProjectileCore, 0.16);
    for (let i = 0; i < 5; i += 1) {
      const start = i * Math.PI * 0.28;
      grid.beginPath();
      grid.arc(width * 0.5, height * 0.5, Math.min(width, height) * 0.42, start, start + Math.PI * 0.16);
      grid.strokePath();
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    primary = true,
  ): void {
    const fill = primary ? COLORS.uiPrimary : COLORS.uiPanelLight;
    const textColor = primary ? '#07131a' : '#f7fbff';
    this.add.rectangle(x + 5, y + 7, width, height, 0x000000, 0.24).setDepth(3);
    const bg = this.add.rectangle(x, y, width, height, fill, 0.98).setStrokeStyle(2, 0xffffff, primary ? 0.25 : 0.14);
    bg.setDepth(4);
    this.add
      .text(x, y, label, {
        color: textColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height < 56 ? '17px' : '20px',
        fontStyle: '900',
      })
      .setOrigin(0.5)
      .setDepth(5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(primary ? 0x54e5b1 : 0x303957, 1));
    bg.on('pointerout', () => bg.setFillStyle(fill, 0.98));
    bg.on('pointerup', onClick);
  }
}
