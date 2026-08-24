import { describe, expect, it } from 'vitest';
import { addXp, getRequiredXp } from './LevelSystem';

describe('LevelSystem', () => {
  it('uses a growing XP curve', () => {
    expect(getRequiredXp(2)).toBeGreaterThan(getRequiredXp(1));
    expect(getRequiredXp(8)).toBeGreaterThan(getRequiredXp(4));
  });

  it('carries extra XP across level-ups', () => {
    const required = getRequiredXp(1);
    const result = addXp(0, 1, required + 5);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(5);
    expect(result.leveled).toBe(true);
  });
});
