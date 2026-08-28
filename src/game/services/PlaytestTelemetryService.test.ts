import { describe, expect, it, vi } from 'vitest';
import type { RunResult } from '../types';
import { PlaytestTelemetryService } from './PlaytestTelemetryService';

const result: RunResult = {
  stageId: 'stage-1',
  chapterId: 'chapter-1',
  victory: false,
  score: 8420,
  kills: 44,
  eliteKills: 3,
  bossDefeated: false,
  survivalSeconds: 96.3,
  coinsEarned: 37,
  playerLevel: 8,
  damageTaken: 75,
  energyNodesDestroyed: 0,
  energyNodePressureHits: 0,
  arenaShifts: 0,
  overloadEvents: 0,
  overloadHits: 0,
  overloadDamageTaken: 0,
};

function createService(): PlaytestTelemetryService {
  return new PlaytestTelemetryService({
    enabled: true,
    now: vi.fn(() => 1000),
    logRunSummary: vi.fn(),
  });
}

describe('PlaytestTelemetryService', () => {
  it('records only the first level-up time', () => {
    const telemetry = createService();
    telemetry.beginRun();

    expect(telemetry.recordFirstLevelUp(10.74)).toBe(true);
    expect(telemetry.recordFirstLevelUp(14.2)).toBe(false);

    expect(telemetry.getCurrentRun()?.firstLevelUpSeconds).toBe(10.7);
  });

  it('records the selected stage for a run', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-2', 'chapter-1');

    expect(telemetry.getCurrentRun()?.stageId).toBe('stage-2');
    expect(telemetry.getCurrentRun()?.chapterId).toBe('chapter-1');
  });

  it('records energy node pressure metrics for stage 3 QA', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-3', 'chapter-1');
    telemetry.recordEnergyNodeSpawned(21.2);
    telemetry.recordEnergyNodeDestroyed(27.8);
    telemetry.recordEnergyNodePressureHit(34.1);

    expect(telemetry.getCurrentRun()).toMatchObject({
      energyNodesSpawned: 1,
      energyNodesDestroyed: 1,
      energyNodePressureHits: 1,
    });
  });

  it('records arena overload metrics for stage 4 QA', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-4', 'chapter-2');
    telemetry.recordArenaShift('warning', 22.1, [1, 3], 0);
    telemetry.recordOverloadStarted(23.4, [1, 3], 0);
    telemetry.recordOverloadHit(24.2, 8.6);

    expect(telemetry.getCurrentRun()).toMatchObject({
      arenaShifts: 1,
      overloadEvents: 1,
      overloadHits: 1,
      overloadDamageTaken: 8.6,
    });
    expect(telemetry.getCurrentRun()?.events).toEqual(expect.arrayContaining([
      {
        name: 'arena_shift',
        atSeconds: 22.1,
        payload: { phase: 'warning', cycleIndex: 0, dangerousSectors: '1,3' },
      },
      {
        name: 'overload_started',
        atSeconds: 23.4,
        payload: { cycleIndex: 0, dangerousSectors: '1,3' },
      },
    ]));
    expect(telemetry.getCurrentRun()?.events).toContainEqual({
      name: 'overload_hit',
      atSeconds: 24.2,
      payload: { damageTaken: 8.6 },
    });
  });

  it('records upgrade picks with before and after levels plus offered choices', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.recordUpgradeOffer(['damage', 'magnet', 'lifesteal'], 12);
    telemetry.recordUpgradeSelected('damage', 1, 2, 13.26, ['damage', 'magnet', 'lifesteal']);

    expect(telemetry.getCurrentRun()?.upgradesSelected).toEqual([
      {
        upgradeId: 'damage',
        levelBefore: 1,
        levelAfter: 2,
        selectedAtSeconds: 13.3,
        offeredUpgradeIds: ['damage', 'magnet', 'lifesteal'],
      },
    ]);
  });

  it('records boss reached and defeated timing', () => {
    const telemetry = createService();
    telemetry.beginRun();

    expect(telemetry.recordBossReached(90.18)).toBe(true);
    expect(telemetry.recordBossDefeated(108.64)).toBe(true);

    const run = telemetry.getCurrentRun();
    expect(run?.bossReached).toBe(true);
    expect(run?.bossReachedSeconds).toBe(90.2);
    expect(run?.bossDefeated).toBe(true);
    expect(run?.bossFightDurationSeconds).toBe(18.4);
  });

  it('records boss entry HP before and after recovery', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-2', 'chapter-1');

    telemetry.recordBossEntryRecovery({
      hpBefore: 118.24,
      hpAfter: 198.91,
      maxHp: 280,
    });

    expect(telemetry.getCurrentRun()).toMatchObject({
      hpBeforeBossEntryRecovery: 118.2,
      hpAfterBossEntryRecovery: 198.9,
      bossEntryRecoveryAmount: 80.7,
      maxHpAtBossEntry: 280,
    });
  });

  it('does not record negative boss entry recovery', () => {
    const telemetry = createService();
    telemetry.beginRun();

    telemetry.recordBossEntryRecovery({
      hpBefore: 230,
      hpAfter: 220,
      maxHp: 240,
    });

    expect(telemetry.getCurrentRun()?.bossEntryRecoveryAmount).toBe(0);
  });

  it('updates live run progress without completing the run', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-3', 'chapter-1');
    telemetry.recordRunProgress({
      durationSeconds: 44.24,
      score: 1234,
      coinsEarned: 18,
      playerLevel: 4,
      kills: 22,
      eliteKills: 1,
      remainingHp: 77.35,
      maxHp: 268,
    });

    expect(telemetry.getCurrentRun()).toMatchObject({
      durationSeconds: 44.2,
      score: 1234,
      coinsEarned: 18,
      playerLevel: 4,
      kills: 22,
      eliteKills: 1,
      remainingHp: 77.4,
      maxHp: 268,
    });
    expect(telemetry.getSessionSummary().runsCompleted).toBe(0);
  });

  it('records chapter completion before a completed run is exported', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-3', 'chapter-1');
    telemetry.recordChapterCompleted('chapter-1', 96.1);
    telemetry.completeRun({ result: { ...result, stageId: 'stage-3', victory: true, bossDefeated: true }, durationSeconds: 96.1, remainingHp: 42, maxHp: 240 });

    expect(telemetry.getCompletedRuns()[0].events).toContainEqual({
      name: 'chapter_completed',
      atSeconds: 96.1,
      payload: { chapterId: 'chapter-1' },
    });
  });

  it('uses gameplay duration instead of wall-clock duration when completing a run', () => {
    const telemetry = new PlaytestTelemetryService({
      enabled: true,
      now: vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(61000),
      logRunSummary: vi.fn(),
    });
    telemetry.beginRun();

    const completed = telemetry.completeRun({ result, durationSeconds: 42.4, remainingHp: 18, maxHp: 240 });

    expect(completed?.startTimestamp).toBe(1000);
    expect(completed?.endTimestamp).toBe(61000);
    expect(completed?.durationSeconds).toBe(42.4);
  });

  it('increments replay session count when a result play-again run starts', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.completeRun({ result, durationSeconds: 30, remainingHp: 0, maxHp: 240 });
    telemetry.beginRun('replay');

    expect(telemetry.getSessionSummary()).toMatchObject({
      runsStarted: 2,
      runsCompleted: 1,
      replays: 1,
    });
  });

  it('does not leak run telemetry into the next run', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.recordFirstLevelUp(10);
    telemetry.recordUpgradeSelected('damage', 0, 1, 12, ['damage']);
    telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0, maxHp: 240 });

    telemetry.beginRun('replay');

    const nextRun = telemetry.getCurrentRun();
    expect(nextRun?.firstLevelUpSeconds).toBeNull();
    expect(nextRun?.upgradesSelected).toEqual([]);
    expect(nextRun?.runId).toBe('run-2');
  });

  it('is a no-op when playtest mode is disabled', () => {
    const telemetry = new PlaytestTelemetryService({ enabled: false, logRunSummary: vi.fn() });
    telemetry.beginRun();

    expect(telemetry.recordFirstLevelUp(10)).toBe(false);
    expect(telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0, maxHp: 240 })).toBeNull();
    expect(telemetry.getSessionSummary().runsStarted).toBe(0);
  });

  it('exports bounded session telemetry as JSON for manual playtest reports', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.recordFirstLevelUp(12);
    telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0, maxHp: 240 });

    const exported = JSON.parse(telemetry.getExportJson());

    expect(exported.format).toBe('evolve-arena-playtest-v1');
    expect(exported.session.runsCompleted).toBe(1);
    expect(exported.completedRuns[0].firstLevelUpSeconds).toBe(12);
    expect(exported.currentRun).toBeNull();
  });

  it('attaches mastery and stage record improvements to the latest completed run', () => {
    const telemetry = createService();
    telemetry.beginRun('new', 'stage-3', 'chapter-1');
    telemetry.completeRun({ result: { ...result, stageId: 'stage-3', victory: true }, durationSeconds: 98, remainingHp: 80, maxHp: 240 });
    telemetry.recordMetaProgress({
      stageId: 'stage-3',
      masteryEarned: 3,
      previousMastery: 1,
      masteryImproved: true,
      newBestStageScore: true,
      newBestClearTime: true,
    });

    expect(telemetry.getCompletedRuns()[0]).toMatchObject({
      masteryEarned: 3,
      previousMastery: 1,
      masteryImproved: true,
      newBestStageScore: true,
      newBestClearTime: true,
    });
    expect(telemetry.getCompletedRuns()[0].events).toEqual(expect.arrayContaining([
      {
        name: 'mastery_improved',
        atSeconds: 98,
        payload: { previousMastery: 1, masteryEarned: 3 },
      },
      {
        name: 'stage_record_improved',
        atSeconds: 98,
        payload: { newBestStageScore: true, newBestClearTime: true },
      },
    ]));
  });
});
