import Phaser from 'phaser';
import { COLORS } from '../config/visual';
import { STAGE_DEFINITIONS, STAGE_IDS } from '../data/stages';
import { getClearedStageIds, isStageUnlocked } from '../systems/StageProgressionSystem';
import type { GameSaveData, StageDefinition } from '../types';

interface StageSelectSceneData {
  save: GameSaveData;
}

export class StageSelectScene extends Phaser.Scene {
  private save!: GameSaveData;
  private nodes: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('StageSelectScene');
  }

  init(data: StageSelectSceneData): void {
    this.save = data.save;
  }

  create(): void {
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.render, this);
      this.clearNodes();
    });
    this.render();
  }

  private render(): void {
    this.clearNodes();
    const { width, height } = this.scale;
    const shortLandscape = width > height && height < 520;
    this.addBackdrop(width, height);

    const titleY = shortLandscape ? 42 : Math.max(74, height * 0.12);
    this.addNode(
      this.add
        .text(width / 2, titleY, 'SELECT STAGE', {
          color: '#f7fbff',
          fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
          fontSize: shortLandscape ? '28px' : `${Math.min(44, Math.max(32, width * 0.06))}px`,
          fontStyle: '900',
          stroke: '#07131a',
          strokeThickness: 7,
        })
        .setOrigin(0.5),
    );

    const clearedIds = getClearedStageIds(this.save);
    const cardWidth = shortLandscape ? Math.min(350, (width - 92) / 2) : Math.min(420, width - 42);
    const cardHeight = shortLandscape ? 188 : 158;
    const startY = shortLandscape ? height * 0.52 : titleY + 112;
    const gap = shortLandscape ? cardWidth + 28 : cardHeight + 24;

    STAGE_IDS.forEach((stageId, index) => {
      const stage = STAGE_DEFINITIONS[stageId];
      const x = shortLandscape ? width / 2 + (index - 0.5) * gap : width / 2;
      const y = shortLandscape ? startY : startY + index * gap;
      const unlocked = isStageUnlocked(this.save, stageId);
      const cleared = clearedIds.includes(stageId);
      this.addNode(this.createStageCard(stage, x, y, cardWidth, cardHeight, unlocked, cleared, shortLandscape));
    });

    const backWidth = shortLandscape ? 118 : 156;
    this.addNode(
      this.createButton(24 + backWidth / 2, shortLandscape ? height - 28 : height - 42, backWidth, shortLandscape ? 34 : 42, 'BACK', () => {
        this.scene.start('MenuScene', { save: this.save });
      }, false),
    );
  }

  private createStageCard(
    stage: StageDefinition,
    x: number,
    y: number,
    width: number,
    height: number,
    unlocked: boolean,
    cleared: boolean,
    shortLandscape: boolean,
  ): Phaser.GameObjects.Container {
    const theme = stage.visualTheme;
    const shadow = this.add.rectangle(6, 8, width, height, 0x000000, 0.26);
    const bg = this.add
      .rectangle(0, 0, width, height, unlocked ? COLORS.uiPanel : COLORS.uiPanelDark, unlocked ? 0.96 : 0.88)
      .setStrokeStyle(2, unlocked ? theme.arenaMark : COLORS.uiMuted, unlocked ? 0.58 : 0.28);
    const band = this.add.rectangle(0, -height / 2 + 14, width - 22, 6, unlocked ? theme.phase2 : COLORS.uiMuted, unlocked ? 0.82 : 0.26);
    const badge = this.add.circle(-width / 2 + 32, -height / 2 + 38, 21, unlocked ? theme.bossShell : 0x1a2236, 0.96);
    badge.setStrokeStyle(2, unlocked ? theme.arenaMark : COLORS.uiMuted, 0.48);
    const number = this.add
      .text(badge.x, badge.y, String(stage.number), {
        color: '#f7fbff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '20px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(-width / 2 + 66, -height / 2 + 30, stage.name.toUpperCase(), {
        color: unlocked ? '#f7fbff' : '#8ea0bc',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '17px' : '20px',
        fontStyle: '900',
      })
      .setOrigin(0, 0.5);
    const subtitle = this.add
      .text(-width / 2 + 66, -height / 2 + 56, stage.subtitle, {
        color: unlocked ? '#d7edff' : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '12px' : '13px',
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    const description = this.add
      .text(-width / 2 + 22, -height / 2 + (shortLandscape ? 86 : 92), unlocked ? stage.description : 'Clear Stage 1 to unlock.', {
        color: unlocked ? COLORS.uiTextMuted : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '12px' : '13px',
        fontStyle: '700',
        wordWrap: { width: width - 44 },
      })
      .setOrigin(0, 0);
    const status = this.add
      .text(width / 2 - 22, height / 2 - 22, cleared ? 'CLEARED' : unlocked ? 'READY' : 'LOCKED', {
        color: cleared ? '#9ff7db' : unlocked ? '#f7fbff' : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '12px' : '13px',
        fontStyle: '900',
      })
      .setOrigin(1, 0.5);

    const card = this.add.container(x, y, [shadow, bg, band, badge, number, title, subtitle, description, status]);
    if (unlocked) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(COLORS.uiPanelLight, 0.98));
      bg.on('pointerout', () => bg.setFillStyle(COLORS.uiPanel, 0.96));
      bg.on('pointerup', () => {
        this.scene.start('GameScene', { save: this.save, stageId: stage.id });
      });
    }
    return card;
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    primary = true,
  ): Phaser.GameObjects.Container {
    const fill = primary ? COLORS.uiPrimary : COLORS.uiPanelLight;
    const textColor = primary ? '#07131a' : '#f7fbff';
    const shadow = this.add.rectangle(4, 6, width, height, 0x000000, 0.24);
    const bg = this.add.rectangle(0, 0, width, height, fill, 0.98).setStrokeStyle(2, 0xffffff, primary ? 0.25 : 0.14);
    const text = this.add
      .text(0, 0, label, {
        color: textColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height < 40 ? '13px' : '16px',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', onClick);
    return this.add.container(x, y, [shadow, bg, text]);
  }

  private addBackdrop(width: number, height: number): void {
    this.addNode(this.add.rectangle(width / 2, height / 2, width, height, COLORS.backgroundDeep, 1));
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.arenaGrid, 0.14);
    for (let x = 0; x <= width; x += 72) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 72) {
      grid.lineBetween(0, y, width, y);
    }
    grid.lineStyle(4, COLORS.playerProjectileCore, 0.12);
    grid.strokeCircle(width * 0.25, height * 0.56, Math.min(width, height) * 0.42);
    grid.lineStyle(4, 0xff68f0, 0.1);
    grid.strokeCircle(width * 0.78, height * 0.5, Math.min(width, height) * 0.38);
    this.addNode(grid);
  }

  private addNode<T extends Phaser.GameObjects.GameObject>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  private clearNodes(): void {
    this.nodes.forEach((node) => node.destroy());
    this.nodes = [];
  }
}
