import type { StageArenaShiftConfig } from '../types';

export type ArenaShiftPhase = 'stable' | 'warning' | 'overload' | 'recovery';

export interface ArenaShiftState {
  enabled: boolean;
  phase: ArenaShiftPhase;
  cycleIndex: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  dangerousSectors: number[];
}

export interface ForcedArenaShift {
  startedAtMs: number;
  warningMs: number;
  overloadMs: number;
  recoveryMs: number;
  cycleIndex: number;
}

export function getArenaShiftState(
  config: StageArenaShiftConfig,
  elapsedSeconds: number,
  forcedShift: ForcedArenaShift | null = null,
): ArenaShiftState {
  if (!config.enabled || elapsedSeconds < config.startSeconds) {
    return stableState(config);
  }

  const elapsedMs = elapsedSeconds * 1000;
  if (forcedShift) {
    const forcedState = getForcedShiftState(config, elapsedMs, forcedShift);
    if (forcedState) {
      return forcedState;
    }
  }

  const cycleMs = getCycleMs(config);
  const shiftedMs = elapsedMs - config.startSeconds * 1000;
  const cycleIndex = Math.floor(shiftedMs / cycleMs);
  const cycleElapsed = shiftedMs % cycleMs;

  if (cycleElapsed < config.stableMs) {
    return makeState(config, 'stable', cycleIndex, cycleElapsed, config.stableMs - cycleElapsed);
  }
  const afterStable = cycleElapsed - config.stableMs;
  if (afterStable < config.warningMs) {
    return makeState(config, 'warning', cycleIndex, afterStable, config.warningMs - afterStable);
  }
  const afterWarning = afterStable - config.warningMs;
  if (afterWarning < config.overloadMs) {
    return makeState(config, 'overload', cycleIndex, afterWarning, config.overloadMs - afterWarning);
  }
  const afterOverload = afterWarning - config.overloadMs;
  return makeState(config, 'recovery', cycleIndex, afterOverload, config.recoveryMs - afterOverload);
}

export function getDangerousArenaSectors(config: StageArenaShiftConfig, cycleIndex: number): number[] {
  const sectorCount = Math.max(1, Math.floor(config.sectors));
  const dangerCount = Math.min(sectorCount - 1, Math.max(0, Math.floor(config.dangerousSectors)));
  const start = positiveModulo(cycleIndex * 2 + 1, sectorCount);
  const sectors: number[] = [];

  for (let index = 0; index < dangerCount; index += 1) {
    sectors.push((start + index * 2) % sectorCount);
  }

  return sectors.sort((a, b) => a - b);
}

export function getArenaSectorForPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  sectors: number,
): number {
  const sectorCount = Math.max(1, Math.floor(sectors));
  const angle = positiveModulo(Math.atan2(y - centerY, x - centerX), Math.PI * 2);
  return Math.min(sectorCount - 1, Math.floor((angle / (Math.PI * 2)) * sectorCount));
}

export function isSectorDangerous(state: ArenaShiftState, sector: number): boolean {
  return state.phase === 'overload' && state.dangerousSectors.includes(sector);
}

function getForcedShiftState(
  config: StageArenaShiftConfig,
  elapsedMs: number,
  forcedShift: ForcedArenaShift,
): ArenaShiftState | null {
  const forcedElapsed = elapsedMs - forcedShift.startedAtMs;
  if (forcedElapsed < 0) {
    return null;
  }
  if (forcedElapsed < forcedShift.warningMs) {
    return makeState(config, 'warning', forcedShift.cycleIndex, forcedElapsed, forcedShift.warningMs - forcedElapsed);
  }
  const afterWarning = forcedElapsed - forcedShift.warningMs;
  if (afterWarning < forcedShift.overloadMs) {
    return makeState(config, 'overload', forcedShift.cycleIndex, afterWarning, forcedShift.overloadMs - afterWarning);
  }
  const afterOverload = afterWarning - forcedShift.overloadMs;
  if (afterOverload < forcedShift.recoveryMs) {
    return makeState(config, 'recovery', forcedShift.cycleIndex, afterOverload, forcedShift.recoveryMs - afterOverload);
  }
  return null;
}

function makeState(
  config: StageArenaShiftConfig,
  phase: ArenaShiftPhase,
  cycleIndex: number,
  phaseElapsedMs: number,
  phaseRemainingMs: number,
): ArenaShiftState {
  return {
    enabled: config.enabled,
    phase,
    cycleIndex,
    phaseElapsedMs,
    phaseRemainingMs: Math.max(0, phaseRemainingMs),
    dangerousSectors: phase === 'stable' || phase === 'recovery' ? [] : getDangerousArenaSectors(config, cycleIndex),
  };
}

function stableState(config: StageArenaShiftConfig): ArenaShiftState {
  return {
    enabled: config.enabled,
    phase: 'stable',
    cycleIndex: -1,
    phaseElapsedMs: 0,
    phaseRemainingMs: 0,
    dangerousSectors: [],
  };
}

function getCycleMs(config: StageArenaShiftConfig): number {
  return Math.max(1, config.stableMs + config.warningMs + config.overloadMs + config.recoveryMs);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
