import { COIN_BALANCE } from '../config/balance';

export function calculateScoreBonus(survivalSeconds: number, kills: number, eliteKills: number): number {
  return Math.floor(survivalSeconds * 2 + kills * 3 + eliteKills * 40);
}

export function calculateCoins(
  score: number,
  kills: number,
  victory: boolean,
  bossDefeated: boolean,
): number {
  const base = Math.floor(score / COIN_BALANCE.scoreDivisor) + Math.floor(kills / COIN_BALANCE.killDivisor);
  return Math.max(5, base + (victory ? COIN_BALANCE.victoryBonus : 0) + (bossDefeated ? 25 : 0));
}
