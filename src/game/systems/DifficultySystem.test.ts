import { describe, expect, it } from 'vitest';
import { getDifficulty } from './DifficultySystem';

describe('DifficultySystem', () => {
  it('preserves the stage 1 enemy unlock curve', () => {
    expect(getDifficulty(0, 1, 'stage-1').enemyTypes).toEqual(['basic']);
    expect(getDifficulty(10, 1, 'stage-1').enemyTypes).toEqual(['basic', 'runner']);
    expect(getDifficulty(42, 1, 'stage-1').enemyTypes).toEqual(['basic', 'runner', 'tank', 'ranged']);
    expect(getDifficulty(58, 1, 'stage-1').enemyTypes).toEqual(['basic', 'runner', 'tank', 'ranged', 'swarm']);
  });

  it('introduces stage 2 enemies without changing the default stage', () => {
    expect(getDifficulty(32, 1, 'stage-2').enemyTypes).toContain('orbiter');
    expect(getDifficulty(65, 1, 'stage-2').enemyTypes).toContain('pulse-caster');
    expect(getDifficulty(65, 1).enemyTypes).not.toContain('pulse-caster');
  });

  it('introduces stage 3 guardian and disruptor pressure without changing earlier stages', () => {
    expect(getDifficulty(28, 1, 'stage-3').enemyTypes).toContain('guardian');
    expect(getDifficulty(58, 1, 'stage-3').enemyTypes).toContain('disruptor');
    expect(getDifficulty(58, 1, 'stage-1').enemyTypes).not.toContain('guardian');
    expect(getDifficulty(58, 1, 'stage-2').enemyTypes).not.toContain('disruptor');
  });

  it('introduces stage 4 anchor and interceptor pressure without changing chapter 1 stages', () => {
    expect(getDifficulty(40, 1, 'stage-4').enemyTypes).toContain('anchor');
    expect(getDifficulty(56, 1, 'stage-4').enemyTypes).toContain('interceptor');
    expect(getDifficulty(70, 1, 'stage-1').enemyTypes).not.toContain('anchor');
    expect(getDifficulty(70, 1, 'stage-3').enemyTypes).not.toContain('interceptor');
  });
});
