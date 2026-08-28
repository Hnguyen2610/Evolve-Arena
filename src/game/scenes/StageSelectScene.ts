import Phaser from 'phaser';
import { COLORS } from '../config/visual';
import { CHAPTER_DEFINITIONS, CHAPTER_IDS, isChapterId } from '../data/chapters';
import { STAGE_DEFINITIONS, STAGE_IDS } from '../data/stages';
import { getClearedChapterIds, getClearedStageIds, isChapterAvailable, isStageUnlocked } from '../systems/StageProgressionSystem';
import {
  formatClearTime,
  formatMasteryStars,
  getChapterMasterySummary,
  getStageMastery,
  getStageMasteryObjective,
  getStageRecord,
} from '../systems/StageMetaProgressionSystem';
import type { ChapterId, GameSaveData, StageDefinition, StageRecord } from '../types';

interface StageSelectSceneData {
  save: GameSaveData;
  chapterId?: ChapterId;
}

export class StageSelectScene extends Phaser.Scene {
  private save!: GameSaveData;
  private selectedChapterId: ChapterId = 'chapter-1';
  private nodes: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('StageSelectScene');
  }

  init(data: StageSelectSceneData): void {
    this.save = data.save;
    this.selectedChapterId = isChapterId(data.chapterId) ? data.chapterId : this.getDefaultChapterId();
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

    const titleY = shortLandscape ? 30 : Math.max(66, height * 0.085);
    this.addNode(
      this.add
        .text(width / 2, titleY, 'STAGE SELECT', {
          color: '#f7fbff',
          fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
          fontSize: shortLandscape ? '28px' : `${Math.min(44, Math.max(32, width * 0.06))}px`,
          fontStyle: '900',
          stroke: '#07131a',
          strokeThickness: 7,
        })
        .setOrigin(0.5),
    );

    this.addChapterTabs(width, titleY + (shortLandscape ? 34 : 50), shortLandscape);

    const chapter = CHAPTER_DEFINITIONS[this.selectedChapterId];
    const chapterCleared = getClearedChapterIds(this.save).includes(chapter.id);
    const chapterAvailable = isChapterAvailable(this.save, chapter.id);
    const chapterMastery = getChapterMasterySummary(this.save, chapter.id);
    const chapterStatus = !chapterAvailable
      ? 'LOCKED  |  CLEAR CHAPTER 1'
      : !chapter.completeWhenAllStagesCleared
        ? `IN PROGRESS  |  MASTERY ${chapterMastery.earnedStars}/${chapterMastery.maxStars} *`
        : chapterMastery.mastered
          ? 'CHAPTER MASTERED'
          : chapterCleared
            ? `COMPLETE  |  MASTERY ${chapterMastery.earnedStars}/${chapterMastery.maxStars} *`
            : `MASTERY ${chapterMastery.earnedStars}/${chapterMastery.maxStars} *  |  ${chapter.subtitle}`;
    this.addNode(
      this.add
        .text(width / 2, titleY + (shortLandscape ? 66 : 88), `CHAPTER ${chapter.number}: ${chapter.name.toUpperCase()}  |  ${chapterStatus}`, {
          color: chapterAvailable ? (chapterCleared ? '#9ff7db' : '#d7edff') : '#8ea0bc',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: shortLandscape ? '12px' : '14px',
          fontStyle: '900',
          align: 'center',
          wordWrap: { width: Math.min(width - 44, 680) },
        })
        .setOrigin(0.5),
    );

    const clearedIds = getClearedStageIds(this.save);
    const stages = chapter.stageIds;
    const cardWidth = shortLandscape ? Math.min(262, (width - 96) / Math.max(1, stages.length)) : Math.min(420, width - 42);
    const cardHeight = shortLandscape ? 166 : 154;
    const startY = shortLandscape ? height * 0.62 : titleY + 154;
    const gap = shortLandscape ? cardWidth + 20 : cardHeight + 16;

    stages.forEach((stageId, index) => {
      const stage = STAGE_DEFINITIONS[stageId];
      const x = shortLandscape ? width / 2 + (index - (stages.length - 1) / 2) * gap : width / 2;
      const y = shortLandscape ? startY : startY + index * gap;
      const unlocked = chapterAvailable && isStageUnlocked(this.save, stageId);
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

  private addChapterTabs(width: number, y: number, shortLandscape: boolean): void {
    const tabWidth = shortLandscape ? 124 : Math.min(170, (width - 64) / CHAPTER_IDS.length);
    const tabHeight = shortLandscape ? 28 : 34;
    const gap = tabWidth + 10;
    CHAPTER_IDS.forEach((chapterId, index) => {
      const chapter = CHAPTER_DEFINITIONS[chapterId];
      const available = isChapterAvailable(this.save, chapterId);
      const selected = chapterId === this.selectedChapterId;
      const x = width / 2 + (index - (CHAPTER_IDS.length - 1) / 2) * gap;
      const label = `CH ${chapter.number}${available ? '' : ' LOCKED'}`;
      const tab = this.createButton(x, y, tabWidth, tabHeight, label, () => {
        this.selectedChapterId = chapterId;
        this.render();
      }, selected && available);
      tab.setAlpha(available ? 1 : 0.58);
      this.addNode(tab);
    });
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
    const lockMessage = this.getStageLockMessage(stage);
    const mastery = unlocked ? getStageMastery(this.save, stage.id) : 0;
    const record = unlocked ? getStageRecord(this.save, stage.id) : { bestScore: 0 };
    const objective = getStageMasteryObjective(stage.id);
    const nextGoal = this.getNextMasteryGoal(mastery, objective, shortLandscape);
    const statusText = !unlocked ? 'LOCKED' : mastery >= 3 ? 'MASTERED' : cleared ? 'IMPROVE' : 'READY';
    const description = this.add
      .text(-width / 2 + 22, -height / 2 + (shortLandscape ? 96 : 95), unlocked ? objective.identity : lockMessage, {
        color: unlocked ? COLORS.uiTextMuted : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '10px' : '11px',
        fontStyle: '700',
        wordWrap: { width: width - 44 },
      })
      .setOrigin(0, 0);
    const status = this.add
      .text(width / 2 - 22, height / 2 - 20, statusText, {
        color: cleared ? '#9ff7db' : unlocked ? '#f7fbff' : '#7f8ba3',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '12px' : '13px',
        fontStyle: '900',
      })
      .setOrigin(1, 0.5);
    const stars = this.add
      .text(-width / 2 + 22, -height / 2 + (shortLandscape ? 78 : 76), unlocked ? formatMasteryStars(mastery) : '', {
        color: mastery >= 3 ? '#fff5a8' : stage.visualTheme.phase2 === COLORS.uiPrimary ? '#9ff7db' : '#ffd166',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '18px' : '20px',
        fontStyle: '900',
      })
      .setOrigin(0, 0.5);
    const records = this.add
      .text(-width / 2 + 22, -height / 2 + (shortLandscape ? 118 : 116), unlocked ? this.formatRecordLine(record.bestScore, record.bestClearTimeSeconds) : '', {
        color: COLORS.uiTextMuted,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '10px' : '12px',
        fontStyle: '800',
        wordWrap: { width: width - 44 },
      })
      .setOrigin(0, 0.5);
    const goal = this.add
      .text(-width / 2 + 22, -height / 2 + (shortLandscape ? 142 : 139), unlocked ? nextGoal : '', {
        color: mastery >= 3 ? '#fff5a8' : '#d7edff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: shortLandscape ? '10px' : '11px',
        fontStyle: '800',
        wordWrap: { width: width - 44 },
      })
      .setOrigin(0, 0.5);

    const card = this.add.container(x, y, [shadow, bg, band, badge, number, title, subtitle, description, stars, records, goal, status]);
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

  private getDefaultChapterId(): ChapterId {
    return [...CHAPTER_IDS].reverse().find((chapterId) => isChapterAvailable(this.save, chapterId)) ?? 'chapter-1';
  }

  private getStageLockMessage(stage: StageDefinition): string {
    if (stage.chapterId === 'chapter-2' && !isChapterAvailable(this.save, stage.chapterId)) {
      return 'Clear Chapter 1 to unlock.';
    }
    const previousStageId = STAGE_IDS.find((stageId) => STAGE_DEFINITIONS[stageId].unlocksOnClear === stage.id);
    return previousStageId ? `Clear Stage ${STAGE_DEFINITIONS[previousStageId].number} to unlock.` : 'Locked.';
  }

  private getNextMasteryGoal(
    stars: number,
    objective: ReturnType<typeof getStageMasteryObjective>,
    compact: boolean,
  ): string {
    if (stars <= 0) {
      return compact ? 'Goal: clear' : `Next * ${objective.oneStar}`;
    }
    if (stars === 1) {
      return compact ? `Goal: ${objective.twoStars.replace('Clear ', '')}` : `Next ** ${objective.twoStars}`;
    }
    if (stars === 2) {
      if (compact && objective.threeStars.includes('Energy Nodes')) {
        return 'Goal: 3 nodes, <=4 hits';
      }
      if (compact && objective.threeStars.includes('overload')) {
        return 'Goal: <=3 overload hits';
      }
      if (compact && objective.threeStars.includes('130')) {
        return 'Goal: <=130 damage';
      }
      if (compact && objective.threeStars.includes('180')) {
        return 'Goal: <=180 damage';
      }
      return `Next *** ${objective.threeStars}`;
    }
    return compact ? '' : 'Stage mastery complete';
  }

  private formatRecordLine(bestScore: StageRecord['bestScore'], bestClearTimeSeconds: StageRecord['bestClearTimeSeconds']): string {
    const bestScoreText = bestScore > 0 ? String(bestScore) : '--';
    const timeText = bestClearTimeSeconds === undefined ? '--' : formatClearTime(bestClearTimeSeconds);
    return `Best ${bestScoreText}   Clear ${timeText}`;
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
