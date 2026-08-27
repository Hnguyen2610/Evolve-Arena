import { CHAPTER_DEFINITIONS } from '../data/chapters';
import { STAGE_IDS } from '../data/stages';
import type { ChapterId, GameSaveData, RunResult, StageId, StageRecord, StageRecordsState } from '../types';

export interface StageMasteryObjective {
  oneStar: string;
  twoStars: string;
  threeStars: string;
  identity: string;
}

interface StageMasteryRule {
  identity: string;
  timeTargetSeconds: number;
  performanceRequirement: string;
  meetsPerformanceTarget: (result: RunResult) => boolean;
}

export interface StageMasteryEvaluation {
  stageId: StageId;
  stars: number;
  cleared: boolean;
  underTimeTarget: boolean;
  metPerformanceTarget: boolean;
  objective: StageMasteryObjective;
}

export interface StageMetaProgressionOutcome {
  save: GameSaveData;
  earnedMastery: number;
  previousMastery: number;
  currentMastery: number;
  masteryImproved: boolean;
  previousRecord: StageRecord;
  currentRecord: StageRecord;
  newStageBestScore: boolean;
  newBestClearTime: boolean;
}

export interface ChapterMasterySummary {
  earnedStars: number;
  maxStars: number;
  mastered: boolean;
}

const EMPTY_RECORD: StageRecord = { bestScore: 0 };

export const STAGE_MASTERY_RULES: Record<StageId, StageMasteryRule> = {
  'stage-1': {
    identity: 'MOVE',
    timeTargetSeconds: 118,
    performanceRequirement: 'take 180 damage or less',
    meetsPerformanceTarget: (result) => result.damageTaken <= 180,
  },
  'stage-2': {
    identity: 'POSITION',
    timeTargetSeconds: 112,
    performanceRequirement: 'take 130 damage or less',
    meetsPerformanceTarget: (result) => result.damageTaken <= 130,
  },
  'stage-3': {
    identity: 'PRIORITIZE',
    timeTargetSeconds: 106,
    performanceRequirement: 'destroy 3 Energy Nodes and take 4 or fewer node pressure hits',
    meetsPerformanceTarget: (result) => result.energyNodesDestroyed >= 3 && result.energyNodePressureHits <= 4,
  },
};

export function evaluateStageMastery(result: RunResult): StageMasteryEvaluation {
  const rule = STAGE_MASTERY_RULES[result.stageId];
  const cleared = result.victory;
  const underTimeTarget = cleared && result.survivalSeconds <= rule.timeTargetSeconds;
  const metPerformanceTarget = underTimeTarget && rule.meetsPerformanceTarget(result);
  const stars = !cleared ? 0 : metPerformanceTarget ? 3 : underTimeTarget ? 2 : 1;

  return {
    stageId: result.stageId,
    stars,
    cleared,
    underTimeTarget,
    metPerformanceTarget,
    objective: getStageMasteryObjective(result.stageId),
  };
}

export function getStageMasteryObjective(stageId: StageId): StageMasteryObjective {
  const rule = STAGE_MASTERY_RULES[stageId];
  return {
    identity: rule.identity,
    oneStar: 'Clear the stage',
    twoStars: `Clear under ${formatClearTime(rule.timeTargetSeconds)}`,
    threeStars: `${rule.performanceRequirement}`,
  };
}

export function applyStageMetaProgression(save: GameSaveData, result: RunResult): StageMetaProgressionOutcome {
  const evaluation = evaluateStageMastery(result);
  const previousMastery = getStageMastery(save, result.stageId);
  const currentMastery = Math.max(previousMastery, evaluation.stars);
  const previousRecord = getStageRecord(save, result.stageId);
  const currentRecord = getUpdatedStageRecord(previousRecord, result);
  const newStageBestScore = currentRecord.bestScore > previousRecord.bestScore;
  const newBestClearTime = currentRecord.bestClearTimeSeconds !== previousRecord.bestClearTimeSeconds
    && currentRecord.bestClearTimeSeconds !== undefined;

  return {
    save: {
      ...save,
      stageMastery: setStageMastery(save.stageMastery, result.stageId, currentMastery),
      stageRecords: setStageRecord(save.stageRecords, result.stageId, currentRecord),
    },
    earnedMastery: evaluation.stars,
    previousMastery,
    currentMastery,
    masteryImproved: currentMastery > previousMastery,
    previousRecord,
    currentRecord,
    newStageBestScore,
    newBestClearTime,
  };
}

export function getStageMastery(save: GameSaveData, stageId: StageId): number {
  return clampMastery(save.stageMastery[stageId] ?? 0);
}

export function getStageRecord(save: GameSaveData, stageId: StageId): StageRecord {
  return normalizeRecord(save.stageRecords[stageId]);
}

export function getChapterMasterySummary(save: GameSaveData, chapterId: ChapterId): ChapterMasterySummary {
  const chapter = CHAPTER_DEFINITIONS[chapterId];
  const earnedStars = chapter.stageIds.reduce((total, stageId) => total + getStageMastery(save, stageId), 0);
  const maxStars = chapter.stageIds.length * 3;
  return {
    earnedStars,
    maxStars,
    mastered: earnedStars === maxStars,
  };
}

export function formatMasteryStars(stars: number): string {
  const safeStars = clampMastery(stars);
  return `${'★'.repeat(safeStars)}${'☆'.repeat(3 - safeStars)}`;
}

export function formatClearTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds * 10) % 10);
  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
}

export function normalizeStageMasteryState(value: unknown, clearedStageIds: StageId[]): Partial<Record<StageId, number>> {
  const source = isRecord(value) ? value : {};
  const normalized: Partial<Record<StageId, number>> = {};

  STAGE_IDS.forEach((stageId) => {
    const parsed = typeof source[stageId] === 'number' && Number.isFinite(source[stageId])
      ? clampMastery(Math.floor(source[stageId]))
      : 0;
    const minimumForOldClear = clearedStageIds.includes(stageId) ? 1 : 0;
    const stars = Math.max(parsed, minimumForOldClear);
    if (stars > 0) {
      normalized[stageId] = stars;
    }
  });

  return normalized;
}

export function normalizeStageRecordsState(value: unknown): StageRecordsState {
  const source = isRecord(value) ? value : {};
  const normalized: StageRecordsState = {};

  STAGE_IDS.forEach((stageId) => {
    const record = normalizeRecord(source[stageId]);
    if (record.bestScore > 0 || record.bestClearTimeSeconds !== undefined) {
      normalized[stageId] = record;
    }
  });

  return normalized;
}

function getUpdatedStageRecord(record: StageRecord, result: RunResult): StageRecord {
  const bestClearTimeSeconds = result.victory
    ? getBestClearTime(record.bestClearTimeSeconds, result.survivalSeconds)
    : record.bestClearTimeSeconds;

  return {
    bestScore: Math.max(record.bestScore, Math.max(0, Math.floor(result.score))),
    ...(bestClearTimeSeconds !== undefined ? { bestClearTimeSeconds } : {}),
  };
}

function getBestClearTime(previous: number | undefined, next: number): number {
  const roundedNext = Math.round(Math.max(0, next) * 10) / 10;
  return previous === undefined ? roundedNext : Math.min(previous, roundedNext);
}

function setStageMastery(stageMastery: Partial<Record<StageId, number>>, stageId: StageId, stars: number): Partial<Record<StageId, number>> {
  const next = { ...stageMastery };
  if (stars > 0) {
    next[stageId] = clampMastery(stars);
  }
  return next;
}

function setStageRecord(stageRecords: StageRecordsState, stageId: StageId, record: StageRecord): StageRecordsState {
  return {
    ...stageRecords,
    [stageId]: record,
  };
}

function normalizeRecord(value: unknown): StageRecord {
  if (!isRecord(value)) {
    return EMPTY_RECORD;
  }

  const bestScore = typeof value.bestScore === 'number' && Number.isFinite(value.bestScore)
    ? Math.max(0, Math.floor(value.bestScore))
    : 0;
  const bestClearTimeSeconds = typeof value.bestClearTimeSeconds === 'number'
    && Number.isFinite(value.bestClearTimeSeconds)
    && value.bestClearTimeSeconds > 0
    ? Math.round(value.bestClearTimeSeconds * 10) / 10
    : undefined;

  return {
    bestScore,
    ...(bestClearTimeSeconds !== undefined ? { bestClearTimeSeconds } : {}),
  };
}

function clampMastery(value: number): number {
  return Math.min(3, Math.max(0, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
