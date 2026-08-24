import { describe, expect, it } from 'vitest';
import { parseSaveData } from './StorageService';

describe('StorageService', () => {
  it('returns defaults for missing or corrupted saves', () => {
    expect(parseSaveData(null).coins).toBe(0);
    expect(parseSaveData('{broken').bestScore).toBe(0);
  });

  it('normalizes partial saves', () => {
    const save = parseSaveData(JSON.stringify({ bestScore: 42, coins: 15, permanentUpgrades: { damage: 2 } }));
    expect(save.bestScore).toBe(42);
    expect(save.coins).toBe(15);
    expect(save.permanentUpgrades.damage).toBe(2);
    expect(save.permanentUpgrades.health).toBe(0);
  });

  it('clamps permanent upgrade levels to supported maximums', () => {
    const save = parseSaveData(
      JSON.stringify({
        permanentUpgrades: {
          damage: 999999,
          health: -3,
          speed: 999999,
        },
      }),
    );

    expect(save.permanentUpgrades.damage).toBe(20);
    expect(save.permanentUpgrades.health).toBe(0);
    expect(save.permanentUpgrades.speed).toBe(15);
  });
});
