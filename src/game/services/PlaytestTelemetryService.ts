import type { RunResult } from '../types';

export type PlaytestEventName =
  | 'game_started'
  | 'first_level_up'
  | 'upgrade_offered'
  | 'upgrade_selected'
  | 'elite_killed'
  | 'boss_reached'
  | 'boss_defeated'
  | 'player_died'
  | 'run_completed'
  | 'replay_started';

export interface UpgradeSelectionTelemetry {
  upgradeId: string;
  levelBefore: number;
  levelAfter: number;
  selectedAtSeconds: number;
  offeredUpgradeIds: string[];
}

export interface PlaytestEvent {
  name: PlaytestEventName;
  atSeconds: number;
  payload?: Record<string, string | number | boolean>;
}

export interface PlaytestRunTelemetry {
  runId: string;
  startTimestamp: number;
  endTimestamp: number | null;
  durationSeconds: number;
  victory: boolean | null;
  score: number;
  coinsEarned: number;
  playerLevel: number;
  kills: number;
  eliteKills: number;
  firstLevelUpSeconds: number | null;
  bossReached: boolean;
  bossReachedSeconds: number | null;
  bossDefeated: boolean;
  bossFightDurationSeconds: number | null;
  damageTaken: number;
  remainingHp: number | null;
  upgradesSelected: UpgradeSelectionTelemetry[];
  events: PlaytestEvent[];
}

export interface PlaytestSessionSummary {
  runsStarted: number;
  runsCompleted: number;
  victories: number;
  defeats: number;
  replays: number;
}

interface CompleteRunInput {
  result: RunResult;
  durationSeconds: number;
  remainingHp: number;
}

interface PlaytestTelemetryOptions {
  enabled: boolean;
  maxCompletedRuns?: number;
  now?: () => number;
  logRunSummary?: (summary: PlaytestRunTelemetry) => void;
}

interface PlaytestInspectionApi {
  getCurrentRun(): PlaytestRunTelemetry | null;
  getCompletedRuns(): PlaytestRunTelemetry[];
  getSessionSummary(): PlaytestSessionSummary;
  getExportJson(): string;
}

declare global {
  interface Window {
    __EVOLVE_PLAYTEST__?: PlaytestInspectionApi;
  }
}

export class PlaytestTelemetryService {
  private readonly maxCompletedRuns: number;
  private readonly now: () => number;
  private readonly logRunSummary: (summary: PlaytestRunTelemetry) => void;
  private runCounter = 0;
  private currentRun: PlaytestRunTelemetry | null = null;
  private readonly completedRuns: PlaytestRunTelemetry[] = [];
  private readonly session: PlaytestSessionSummary = {
    runsStarted: 0,
    runsCompleted: 0,
    victories: 0,
    defeats: 0,
    replays: 0,
  };

  constructor(private readonly options: PlaytestTelemetryOptions) {
    this.maxCompletedRuns = options.maxCompletedRuns ?? 25;
    this.now = options.now ?? (() => Date.now());
    this.logRunSummary = options.logRunSummary ?? ((summary) => console.info('[playtest-run]', JSON.stringify(summary)));
    if (options.enabled && typeof window !== 'undefined') {
      window.__EVOLVE_PLAYTEST__ = {
        getCurrentRun: () => this.getCurrentRun(),
        getCompletedRuns: () => this.getCompletedRuns(),
        getSessionSummary: () => this.getSessionSummary(),
        getExportJson: () => this.getExportJson(),
      };
    }
  }

  beginRun(source: 'new' | 'replay' = 'new'): void {
    if (!this.options.enabled) {
      return;
    }

    this.runCounter += 1;
    this.session.runsStarted += 1;
    if (source === 'replay') {
      this.session.replays += 1;
    }

    this.currentRun = {
      runId: `run-${this.runCounter}`,
      startTimestamp: this.now(),
      endTimestamp: null,
      durationSeconds: 0,
      victory: null,
      score: 0,
      coinsEarned: 0,
      playerLevel: 1,
      kills: 0,
      eliteKills: 0,
      firstLevelUpSeconds: null,
      bossReached: false,
      bossReachedSeconds: null,
      bossDefeated: false,
      bossFightDurationSeconds: null,
      damageTaken: 0,
      remainingHp: null,
      upgradesSelected: [],
      events: [],
    };

    this.recordEvent(source === 'replay' ? 'replay_started' : 'game_started', 0);
  }

  recordFirstLevelUp(seconds: number): boolean {
    if (!this.currentRun || this.currentRun.firstLevelUpSeconds !== null) {
      return false;
    }
    this.currentRun.firstLevelUpSeconds = roundSeconds(seconds);
    this.recordEvent('first_level_up', seconds);
    return true;
  }

  recordUpgradeOffer(upgradeIds: string[], seconds: number): void {
    if (!this.currentRun) {
      return;
    }
    this.recordEvent('upgrade_offered', seconds, { upgradeIds: upgradeIds.join(',') });
  }

  recordUpgradeSelected(
    upgradeId: string,
    levelBefore: number,
    levelAfter: number,
    selectedAtSeconds: number,
    offeredUpgradeIds: string[],
  ): void {
    if (!this.currentRun) {
      return;
    }
    this.currentRun.upgradesSelected.push({
      upgradeId,
      levelBefore,
      levelAfter,
      selectedAtSeconds: roundSeconds(selectedAtSeconds),
      offeredUpgradeIds: [...offeredUpgradeIds],
    });
    this.recordEvent('upgrade_selected', selectedAtSeconds, { upgradeId, levelBefore, levelAfter });
  }

  recordEliteKilled(seconds: number): void {
    this.recordEvent('elite_killed', seconds);
  }

  recordBossReached(seconds: number): boolean {
    if (!this.currentRun || this.currentRun.bossReached) {
      return false;
    }
    this.currentRun.bossReached = true;
    this.currentRun.bossReachedSeconds = roundSeconds(seconds);
    this.recordEvent('boss_reached', seconds);
    return true;
  }

  recordBossDefeated(seconds: number): boolean {
    if (!this.currentRun || this.currentRun.bossDefeated) {
      return false;
    }
    this.currentRun.bossDefeated = true;
    if (this.currentRun.bossReachedSeconds !== null) {
      this.currentRun.bossFightDurationSeconds = roundSeconds(seconds - this.currentRun.bossReachedSeconds);
    }
    this.recordEvent('boss_defeated', seconds);
    return true;
  }

  recordDamageTaken(amount: number): void {
    if (!this.currentRun) {
      return;
    }
    this.currentRun.damageTaken += Math.max(0, amount);
  }

  completeRun(input: CompleteRunInput): PlaytestRunTelemetry | null {
    if (!this.currentRun) {
      return null;
    }

    this.currentRun.endTimestamp = this.now();
    this.currentRun.durationSeconds = roundSeconds(input.durationSeconds);
    this.currentRun.victory = input.result.victory;
    this.currentRun.score = input.result.score;
    this.currentRun.coinsEarned = input.result.coinsEarned;
    this.currentRun.playerLevel = input.result.playerLevel;
    this.currentRun.kills = input.result.kills;
    this.currentRun.eliteKills = input.result.eliteKills;
    this.currentRun.bossDefeated = input.result.bossDefeated;
    this.currentRun.remainingHp = roundSeconds(input.remainingHp);
    this.recordEvent(input.result.victory ? 'run_completed' : 'player_died', input.durationSeconds, {
      score: input.result.score,
    });
    if (!input.result.victory) {
      this.recordEvent('run_completed', input.durationSeconds, { score: input.result.score });
    }

    const completed = cloneRun(this.currentRun);
    this.completedRuns.push(completed);
    while (this.completedRuns.length > this.maxCompletedRuns) {
      this.completedRuns.shift();
    }

    this.session.runsCompleted += 1;
    if (input.result.victory) {
      this.session.victories += 1;
    } else {
      this.session.defeats += 1;
    }

    this.currentRun = null;
    this.logRunSummary(completed);
    return completed;
  }

  getCurrentRun(): PlaytestRunTelemetry | null {
    return this.currentRun ? cloneRun(this.currentRun) : null;
  }

  getCompletedRuns(): PlaytestRunTelemetry[] {
    return this.completedRuns.map((run) => cloneRun(run));
  }

  getSessionSummary(): PlaytestSessionSummary {
    return { ...this.session };
  }

  getExportJson(): string {
    return JSON.stringify({
      format: 'evolve-arena-playtest-v1',
      exportedAt: new Date(this.now()).toISOString(),
      session: this.getSessionSummary(),
      currentRun: this.getCurrentRun(),
      completedRuns: this.getCompletedRuns(),
    });
  }

  reset(): void {
    this.runCounter = 0;
    this.currentRun = null;
    this.completedRuns.length = 0;
    this.session.runsStarted = 0;
    this.session.runsCompleted = 0;
    this.session.victories = 0;
    this.session.defeats = 0;
    this.session.replays = 0;
  }

  private recordEvent(
    name: PlaytestEventName,
    seconds: number,
    payload?: Record<string, string | number | boolean>,
  ): void {
    if (!this.currentRun) {
      return;
    }
    this.currentRun.events.push({
      name,
      atSeconds: roundSeconds(seconds),
      payload,
    });
  }
}

function roundSeconds(value: number): number {
  return Math.round(value * 10) / 10;
}

function cloneRun(run: PlaytestRunTelemetry): PlaytestRunTelemetry {
  return {
    ...run,
    upgradesSelected: run.upgradesSelected.map((upgrade) => ({
      ...upgrade,
      offeredUpgradeIds: [...upgrade.offeredUpgradeIds],
    })),
    events: run.events.map((event) => ({ ...event, payload: event.payload ? { ...event.payload } : undefined })),
  };
}
