import { describe, expect, it } from 'vitest';
import { cloneDefaultSave } from '../services/StorageService';
import { buyPermanentUpgrade, canBuyPermanentUpgrade, getPermanentUpgradeCost } from './ProgressionSystem';

describe('ProgressionSystem', () => {
  it('uses increasing upgrade costs', () => {
    expect(getPermanentUpgradeCost('damage', 3)).toBeGreaterThan(getPermanentUpgradeCost('damage', 0));
  });

  it('spends coins and increments permanent upgrades', () => {
    const save = cloneDefaultSave();
    save.coins = 500;
    expect(canBuyPermanentUpgrade(save, 'health')).toBe(true);
    const next = buyPermanentUpgrade(save, 'health');
    expect(next.permanentUpgrades.health).toBe(1);
    expect(next.coins).toBeLessThan(save.coins);
  });
});
