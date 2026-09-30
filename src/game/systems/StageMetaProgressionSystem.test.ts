import { describe, expect, it } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import type { RunResult, StageId } from '../types';
import {
  applyStageMetaProgression,
  evaluateStageMastery,
  getChapterMasterySummary,
  getStageRecord,
} from './StageMetaProgressionSystem';

function result(input: Partial<RunResult> & { stageId?: StageId } = {}): RunResult {
  return {
    stageId: input.stageId ?? 'stage-1',
    chapterId: input.chapterId ?? 'chapter-1',
    victory: input.victory ?? true,
    score: input.score ?? 2000,
    kills: input.kills ?? 45,
    eliteKills: input.eliteKills ?? 0,
    bossDefeated: input.bossDefeated ?? true,
    survivalSeconds: input.survivalSeconds ?? 110,
    coinsEarned: input.coinsEarned ?? 90,
    playerLevel: input.playerLevel ?? 4,
    damageTaken: input.damageTaken ?? 150,
    energyNodesDestroyed: input.energyNodesDestroyed ?? 0,
    energyNodePressureHits: input.energyNodePressureHits ?? 0,
    arenaShifts: input.arenaShifts ?? 0,
    overloadEvents: input.overloadEvents ?? 0,
    overloadHits: input.overloadHits ?? 0,
    overloadDamageTaken: input.overloadDamageTaken ?? 0,
    conductorBossStaggeredByPulse: input.conductorBossStaggeredByPulse ?? 0,
  };
}

describe('StageMetaProgressionSystem', () => {
  it('evaluates stage 1 mastery from clear, time, and movement-survival damage', () => {
    expect(evaluateStageMastery(result({ victory: false })).stars).toBe(0);
    expect(evaluateStageMastery(result({ survivalSeconds: 123, damageTaken: 40 })).stars).toBe(1);
    expect(evaluateStageMastery(result({ survivalSeconds: 116, damageTaken: 220 })).stars).toBe(2);
    expect(evaluateStageMastery(result({ survivalSeconds: 116, damageTaken: 180 })).stars).toBe(3);
  });

  it('evaluates stage 2 mastery using positioning-friendly damage control', () => {
    expect(evaluateStageMastery(result({ stageId: 'stage-2', survivalSeconds: 109, damageTaken: 146 })).stars).toBe(2);
    expect(evaluateStageMastery(result({ stageId: 'stage-2', survivalSeconds: 109, damageTaken: 130 })).stars).toBe(3);
  });

  it('evaluates stage 3 mastery using Energy Node control', () => {
    expect(evaluateStageMastery(result({
      stageId: 'stage-3',
      survivalSeconds: 104,
      energyNodesDestroyed: 3,
      energyNodePressureHits: 6,
    })).stars).toBe(2);
    expect(evaluateStageMastery(result({
      stageId: 'stage-3',
      survivalSeconds: 104,
      energyNodesDestroyed: 3,
      energyNodePressureHits: 4,
    })).stars).toBe(3);
  });

  it('evaluates stage 4 mastery using overload adaptation', () => {
    expect(evaluateStageMastery(result({
      stageId: 'stage-4',
      chapterId: 'chapter-2',
      survivalSeconds: 110,
      overloadEvents: 2,
      overloadHits: 5,
    })).stars).toBe(2);
    expect(evaluateStageMastery(result({
      stageId: 'stage-4',
      chapterId: 'chapter-2',
      survivalSeconds: 110,
      overloadEvents: 2,
      overloadHits: 3,
    })).stars).toBe(3);
  });

  it('evaluates stage 5 mastery using Nexus Pulse boss staggers', () => {
    expect(evaluateStageMastery(result({
      stageId: 'stage-5',
      chapterId: 'chapter-2',
      survivalSeconds: 105,
      conductorBossStaggeredByPulse: 1,
    })).stars).toBe(2);
    expect(evaluateStageMastery(result({
      stageId: 'stage-5',
      chapterId: 'chapter-2',
      survivalSeconds: 105,
      conductorBossStaggeredByPulse: 2,
    })).stars).toBe(3);
  });

  it('keeps mastery, score, and clear time monotonic', () => {
    const first = applyStageMetaProgression(cloneDefaultSave(), result({
      score: 2000,
      survivalSeconds: 116,
      damageTaken: 220,
    }));
    const worse = applyStageMetaProgression(first.save, result({
      score: 1800,
      survivalSeconds: 130,
      damageTaken: 300,
    }));
    const better = applyStageMetaProgression(worse.save, result({
      score: 2200,
      survivalSeconds: 105,
      damageTaken: 120,
    }));

    expect(first.currentMastery).toBe(2);
    expect(worse.currentMastery).toBe(2);
    expect(worse.masteryImproved).toBe(false);
    expect(getStageRecord(worse.save, 'stage-1')).toEqual({ bestScore: 2000, bestClearTimeSeconds: 116 });
    expect(better.currentMastery).toBe(3);
    expect(better.newStageBestScore).toBe(true);
    expect(better.newBestClearTime).toBe(true);
    expect(getStageRecord(better.save, 'stage-1')).toEqual({ bestScore: 2200, bestClearTimeSeconds: 105 });
  });

  it('allows defeat score records but never updates clear mastery or clear time on defeat', () => {
    const save = applyStageMetaProgression(cloneDefaultSave(), result({
      score: 2000,
      survivalSeconds: 110,
      damageTaken: 160,
    })).save;
    const defeat = applyStageMetaProgression(save, result({
      victory: false,
      bossDefeated: false,
      score: 2400,
      survivalSeconds: 95,
      damageTaken: 250,
    }));

    expect(defeat.earnedMastery).toBe(0);
    expect(defeat.currentMastery).toBe(3);
    expect(defeat.newStageBestScore).toBe(true);
    expect(defeat.newBestClearTime).toBe(false);
    expect(getStageRecord(defeat.save, 'stage-1')).toEqual({ bestScore: 2400, bestClearTimeSeconds: 110 });
  });

  it('isolates records and mastery by stage', () => {
    const stage1 = applyStageMetaProgression(cloneDefaultSave(), result({ stageId: 'stage-1', score: 2100 }));
    const stage2 = applyStageMetaProgression(stage1.save, result({ stageId: 'stage-2', score: 1800, damageTaken: 130 }));

    expect(getStageRecord(stage2.save, 'stage-1').bestScore).toBe(2100);
    expect(getStageRecord(stage2.save, 'stage-2').bestScore).toBe(1800);
    expect(stage2.save.stageMastery['stage-1']).toBe(3);
    expect(stage2.save.stageMastery['stage-2']).toBe(3);
  });

  it('summarizes chapter mastery', () => {
    const save = {
      ...cloneDefaultSave(),
      stageMastery: {
        'stage-1': 3,
        'stage-2': 2,
        'stage-3': 1,
      },
    };

    expect(getChapterMasterySummary(save, 'chapter-1')).toEqual({
      earnedStars: 6,
      maxStars: 9,
      mastered: false,
    });
  });
});
