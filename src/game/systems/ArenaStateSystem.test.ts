import { describe, expect, it } from 'vitest';
import type { StageArenaShiftConfig } from '../types';
import {
  getArenaSectorForPoint,
  getArenaShiftState,
  isSectorDangerous,
} from './ArenaStateSystem';

const config: StageArenaShiftConfig = {
  enabled: true,
  startSeconds: 20,
  stableMs: 1000,
  warningMs: 500,
  overloadMs: 800,
  recoveryMs: 400,
  sectors: 6,
  dangerousSectors: 2,
  damage: 9,
  damageCooldownMs: 760,
};

describe('ArenaStateSystem', () => {
  it('stays stable before the stage mechanic starts', () => {
    const state = getArenaShiftState(config, 19.9);

    expect(state.phase).toBe('stable');
    expect(state.dangerousSectors).toEqual([]);
  });

  it('moves through warning, overload, and recovery in a deterministic cycle', () => {
    expect(getArenaShiftState(config, 21.1).phase).toBe('warning');
    const overload = getArenaShiftState(config, 21.6);
    expect(overload.phase).toBe('overload');
    expect(overload.dangerousSectors).toEqual([1, 3]);
    expect(isSectorDangerous(overload, 1)).toBe(true);
    expect(getArenaShiftState(config, 22.4).phase).toBe('recovery');
  });

  it('uses forced boss shifts without changing disabled configs', () => {
    const forced = getArenaShiftState(config, 40.3, {
      startedAtMs: 40000,
      warningMs: 200,
      overloadMs: 500,
      recoveryMs: 200,
      cycleIndex: 8,
    });
    const disabled = getArenaShiftState({ ...config, enabled: false }, 40.3, {
      startedAtMs: 40000,
      warningMs: 200,
      overloadMs: 500,
      recoveryMs: 200,
      cycleIndex: 8,
    });

    expect(forced.phase).toBe('overload');
    expect(forced.cycleIndex).toBe(8);
    expect(disabled.phase).toBe('stable');
  });

  it('maps world points to the expected arena sector', () => {
    expect(getArenaSectorForPoint(200, 100, 100, 100, 6)).toBe(0);
    expect(getArenaSectorForPoint(100, 200, 100, 100, 6)).toBe(1);
  });
});
