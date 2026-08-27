# Pass 10.1 Progression Difficulty

## Problem

Pass 10 QA showed Chapter-complete HIGH accounts finishing Stage 1-3 quickly and often with very high remaining HP. This pass checks whether permanent progression removes meaningful gameplay risk and separates survivability, offense, speed, and boss-entry recovery.

## Current Permanent Formulas

Source authority is `src/game/config/balance.ts`.

Before tuning:

| Tier | Permanent Levels | Damage | Max HP | Speed |
| --- | --- | ---: | ---: | ---: |
| Fresh | damage 0, health 0, speed 0 | 24.00 | 240 | 255.0 |
| Low | damage 2, health 1, speed 1 | 26.88 | 250 | 261.4 |
| Mid | damage 4, health 2, speed 2 | 29.76 | 260 | 267.8 |
| High | damage 8, health 4, speed 4 | 35.52 | 280 | 280.5 |

After tuning:

| Tier | Permanent Levels | Damage | Max HP | Speed |
| --- | --- | ---: | ---: | ---: |
| Fresh | damage 0, health 0, speed 0 | 24.00 | 240 | 255.0 |
| Low | damage 2, health 1, speed 1 | 25.92 | 250 | 261.4 |
| Mid | damage 4, health 2, speed 2 | 27.84 | 260 | 267.8 |
| High | damage 8, health 4, speed 4 | 31.68 | 280 | 280.5 |

Final formulas:

- Permanent Damage: `baseDamage * (1 + damageLevel * 0.04)`
- Permanent Health: `baseMaxHp + healthLevel * 10`
- Permanent Speed: `baseSpeed * (1 + speedLevel * 0.025)`

## Account Tiers

The controlled tiers were:

- Fresh: damage 0, health 0, speed 0
- Low: damage 2, health 1, speed 1
- Mid: damage 4, health 2, speed 2
- High: damage 8, health 4, speed 4

## Test Methodology

- Production preview with `VITE_PLAYTEST_MODE=true`.
- Chrome CDP with normal keyboard/mouse input only.
- No time scaling, invincibility, HP manipulation, direct enemy kills, forced boss spawn, or damage manipulation.
- Seeded `Math.random` before game load.
- Paired seeds: `4101`, `4102`.
- Same movement policy and same deterministic upgrade preference policy across account tiers.
- Primary baseline sample: 24 valid runs, 0 invalid.
- Ablation sample: 4 valid Stage 3 runs, 0 invalid.
- Post-change validation sample: 12 valid runs, 0 invalid.

The bot is an average/competent automation profile. It keeps moving and picks reasonable upgrades, but it is not a human touch-control study.

## Baseline Matrix

Before tuning:

| Stage | Tier | Win Rate | Median Duration | Median Damage | Median Remaining HP % | Median HP Before Boss | Median HP After Boss | Median Recovery | Median Boss Fight |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Stage 1 | Fresh | 100% | 103.2s | 127.3 | 74.2% | 166.1 | 231.3 | 65.2 | 18.2s |
| Stage 1 | Low | 100% | 100.6s | 129.7 | 83.8% | 194.4 | 250.0 | 55.6 | 15.6s |
| Stage 1 | Mid | 100% | 96.8s | 67.4 | 92.8% | 228.8 | 260.0 | 31.3 | 11.8s |
| Stage 1 | High | 100% | 97.8s | 47.2 | 92.1% | 262.8 | 280.0 | 17.3 | 12.8s |
| Stage 2 | Fresh | 100% | 98.9s | 83.8 | 82.9% | 197.4 | 240.0 | 42.6 | 16.9s |
| Stage 2 | Low | 100% | 98.5s | 164.4 | 62.5% | 220.3 | 264.0 | 43.8 | 16.5s |
| Stage 2 | Mid | 100% | 97.9s | 95.7 | 79.3% | 254.6 | 288.0 | 33.4 | 15.9s |
| Stage 2 | High | 100% | 96.0s | 86.8 | 82.9% | 272.9 | 294.0 | 21.1 | 14.0s |
| Stage 3 | Fresh | 100% | 107.7s | 170.9 | 48.6% | 225.9 | 240.0 | 14.1 | 23.7s |
| Stage 3 | Low | 100% | 99.4s | 92.2 | 82.6% | 217.2 | 264.0 | 46.8 | 15.4s |
| Stage 3 | Mid | 100% | 102.6s | 108.7 | 75.2% | 235.4 | 274.0 | 38.7 | 18.6s |
| Stage 3 | High | 100% | 98.6s | 46.5 | 90.4% | 260.5 | 280.0 | 19.6 | 14.6s |

## Survivability Findings

Health scaling was not the primary cause. HIGH accounts had 280 max HP versus Fresh 240, but HIGH often reached boss with already high HP and received only small boss-entry recovery. HIGH Stage 3 median HP before boss recovery was 260.5, and recovery was only 19.6.

Health-only Stage 3 ablation ended at 66.8% HP with a 23.4s boss fight, which is stronger than Fresh but not clearly trivial.

## DPS Findings

Permanent Damage and in-run projectile/offense upgrades were the main risk. Baseline HIGH Stage 3 had low median damage taken, high remaining HP, and shorter boss fights. The strongest signal came from ablation:

| Ablation | Victory | Duration | Damage Taken | Remaining HP % | Recovery | Boss Fight | Notable Upgrades |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Damage-only High | true | 92.2s | 25.3 | 92.5% | 7.2 | 8.2s | projectile-count, projectile-count |
| Health-only High | true | 107.4s | 144.6 | 66.8% | 51.5 | 23.4s | damage |
| Speed-only High | true | 115.7s | 242.8 | 35.5% | 70.0 | 31.7s | max-hp, armor |
| Full High | true | 96.9s | 65.3 | 88.6% | 33.4 | 12.9s | attack-speed, damage |

Damage-only High was the clearest trivialization signal, especially combined with Extra Shot.

## Ablation Findings

Primary: Damage scaling lowered exposure time.  
Secondary: In-run Extra Shot / Attack Speed high-rolls can also collapse boss exposure, including on Fresh.  
Minor: Health and Speed help, but the isolated ablations did not explain the strongest high-HP fast-kill outcomes by themselves.

## Hypotheses

1. H1 - Permanent Damage caused progressed accounts to erase threat by reducing enemy and boss exposure time. Confidence: HIGH.
2. H2 - In-run projectile-count and attack-speed high-rolls can independently make runs too easy. Confidence: MEDIUM.
3. H3 - Permanent Health contributes to forgiveness but is not the root cause. Confidence: MEDIUM.
4. H4 - Boss-entry recovery is not the primary cause for HIGH accounts. Confidence: HIGH.
5. H5 - Permanent Speed helps avoidance but did not dominate the ablation sample. Confidence: MEDIUM.

## Changes

| Variable | Before | After | Reason |
| --- | ---: | ---: | --- |
| Permanent Damage effect per level | 0.06 | 0.04 | Reduce progressed-account offense without harming Fresh base stats. |
| Menu permanent Damage text | hardcoded 6% text | derives from `effectPerLevel` | Keep UI accurate after formula changes. |
| Playtest telemetry | no boss-entry HP fields | added HP before/after/recovery/max HP | Distinguish pre-boss health from boss-entry recovery. |
| Playtest telemetry | no final max HP field | added `maxHp` | Allow remaining HP percentage to be reported accurately. |

No base HP, permanent Health, permanent Speed, boss HP, boss damage, stage content, or mastery thresholds were changed.

## Validation Matrix

After tuning:

| Stage | Tier | Win Rate | Median Duration | Median Damage | Median Remaining HP % | Median HP Before Boss | Median HP After Boss | Median Recovery | Median Boss Fight |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Stage 1 | Fresh | 100% | 95.1s | 69.3 | 92.2% | 192.9 | 240.0 | 47.2 | 10.1s |
| Stage 1 | Mid | 100% | 99.7s | 139.9 | 80.7% | 197.7 | 263.5 | 65.8 | 14.7s |
| Stage 1 | High | 100% | 96.1s | 47.6 | 94.7% | 262.3 | 294.0 | 31.7 | 11.1s |
| Stage 3 | Fresh | 100% | 95.0s | 125.8 | 76.8% | 161.9 | 231.9 | 70.0 | 11.0s |
| Stage 3 | Mid | 100% | 99.6s | 91.2 | 88.4% | 238.2 | 274.0 | 35.8 | 15.6s |
| Stage 3 | High | 100% | 103.2s | 41.6 | 92.9% | 258.4 | 280.0 | 21.7 | 19.2s |

Post-change Stage 3 HIGH boss fights were 17.0s and 21.4s in the paired validation sample, improved from the recent 5.4s/6.8s watch item and from the Damage-only ablation's 8.2s.

## Mastery Regression

Mastery thresholds remain coherent:

- Stage 1 Fresh/Mid/High can still clear under 118s in the sampled runs.
- Stage 3 Fresh/Mid/High can still clear under 106s in most sampled runs, but this is automation-biased and includes strong upgrade picks.
- Stage 2 was not retuned, and baseline Stage 2 data remains within the Pass 10 mastery target.

No mastery thresholds were changed.

## Mobile QA

High-progression Stage 3 start smoke was run at:

- 390x844
- 430x932
- 844x390
- 932x430

All four viewports started Stage 3. HUD and player visuals remained readable. One 844x390 capture happened during a Level Up overlay; no gameplay HUD overlap was observed in the gameplay captures.

## Performance

Post-change HIGH Stage 3 browser frame samples:

- Seed 4101: average 17.4ms, p95 17.1ms, p99 33.4ms, >33ms 240, >50ms 11.
- Seed 4102: average 16.8ms, p95 16.8ms, p99 17.2ms, >33ms 28, >50ms 4.

These were gathered while multiple Chrome workers had been used for QA, so the first sample should be treated as noisy. No crash or runaway slowdown was observed.

## Remaining Unknowns

- The bot is not a real human and may overperform on keyboard movement.
- Touch-control difficulty still needs human validation.
- Extra Shot / projectile-count high-rolls can still create very fast Fresh and Mid boss fights.
- Win rate was 100% in the automated samples, so the game may still be easy for competent keyboard play.
- Economy pricing was not retuned after the permanent Damage value reduction.
