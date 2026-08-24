import Phaser from 'phaser';
import { LocalStorageGameStorage, saveBestEffort } from '../services/StorageService';
import type { GameSaveData, RunResult } from '../types';

interface ResultSceneData {
  save: GameSaveData;
  result: RunResult;
}

export class ResultScene extends Phaser.Scene {
  private storage = new LocalStorageGameStorage();
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
    this.save = {
      ...this.save,
      bestScore: Math.max(this.save.bestScore, this.result.score),
      coins: this.save.coins + this.result.coinsEarned,
    };
    await saveBestEffort(this.storage, this.save);

    const { width, height } = this.scale;
    const centerX = width / 2;
    const shortLandscape = width > height && height < 520;
    const title = this.result.victory ? 'Victory' : 'Run Complete';
    const color = this.result.victory ? '#fff5a8' : '#ffffff';

    this.add
      .text(centerX, shortLandscape ? 54 : Math.max(90, height * 0.16), title, {
        color,
        fontSize: `${shortLandscape ? 32 : Math.min(52, Math.max(34, width * 0.055))}px`,
        fontStyle: '900',
      })
      .setOrigin(0.5);

    const lines = [
      `Score ${this.result.score}`,
      `Best ${this.save.bestScore}`,
      `Coins +${this.result.coinsEarned}   Total ${this.save.coins}`,
      `Kills ${this.result.kills}   Elites ${this.result.eliteKills}`,
      `Level ${this.result.playerLevel}   Time ${Math.floor(this.result.survivalSeconds)}s`,
    ];
    this.add
      .text(centerX, shortLandscape ? height * 0.43 : height * 0.38, lines.join('\n'), {
        color: '#dfe9ff',
        fontSize: shortLandscape ? '16px' : '20px',
        fontStyle: '700',
        align: 'center',
        lineSpacing: shortLandscape ? 4 : 10,
      })
      .setOrigin(0.5);

    if (shortLandscape) {
      const buttonWidth = Math.min(250, width * 0.34);
      const buttonY = height - 46;
      this.createButton(centerX - buttonWidth * 0.58, buttonY, buttonWidth, 50, 'Replay', () => {
        this.scene.start('GameScene', { save: this.save });
      });
      this.createButton(centerX + buttonWidth * 0.58, buttonY, buttonWidth, 50, 'Upgrades', () => {
        this.scene.start('MenuScene');
      });
    } else {
      this.createButton(centerX, height * 0.68, Math.min(300, width - 42), 58, 'Replay', () => {
        this.scene.start('GameScene', { save: this.save });
      });
      this.createButton(centerX, height * 0.8, Math.min(300, width - 42), 50, 'Upgrades', () => {
        this.scene.start('MenuScene');
      });
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add.rectangle(x, y, width, height, 0x37d399, 0.96).setStrokeStyle(2, 0xffffff, 0.22);
    this.add
      .text(x, y, label, {
        color: '#07131a',
        fontSize: '21px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', onClick);
  }
}
