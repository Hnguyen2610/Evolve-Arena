import { describe, expect, it, vi } from 'vitest';
import type { RunResult } from '../types';
import { PlaytestTelemetryService } from './PlaytestTelemetryService';

const result: RunResult = {
  victory: false,
  score: 8420,
  kills: 44,
  eliteKills: 3,
  bossDefeated: false,
  survivalSeconds: 96.3,
  coinsEarned: 37,
  playerLevel: 8,
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

  it('uses gameplay duration instead of wall-clock duration when completing a run', () => {
    const telemetry = new PlaytestTelemetryService({
      enabled: true,
      now: vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(61000),
      logRunSummary: vi.fn(),
    });
    telemetry.beginRun();

    const completed = telemetry.completeRun({ result, durationSeconds: 42.4, remainingHp: 18 });

    expect(completed?.startTimestamp).toBe(1000);
    expect(completed?.endTimestamp).toBe(61000);
    expect(completed?.durationSeconds).toBe(42.4);
  });

  it('increments replay session count when a result play-again run starts', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.completeRun({ result, durationSeconds: 30, remainingHp: 0 });
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
    telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0 });

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
    expect(telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0 })).toBeNull();
    expect(telemetry.getSessionSummary().runsStarted).toBe(0);
  });

  it('exports bounded session telemetry as JSON for manual playtest reports', () => {
    const telemetry = createService();
    telemetry.beginRun();
    telemetry.recordFirstLevelUp(12);
    telemetry.completeRun({ result, durationSeconds: 40, remainingHp: 0 });

    const exported = JSON.parse(telemetry.getExportJson());

    expect(exported.format).toBe('evolve-arena-playtest-v1');
    expect(exported.session.runsCompleted).toBe(1);
    expect(exported.completedRuns[0].firstLevelUpSeconds).toBe(12);
    expect(exported.currentRun).toBeNull();
  });
});
