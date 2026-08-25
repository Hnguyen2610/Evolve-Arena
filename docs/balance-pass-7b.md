# Balance Pass 7B

## Dataset

- Baseline source: `docs/automated-playtest-7a5-runs.json`.
- Baseline raw file entries: 30.
- Baseline valid runs analyzed programmatically: 29.
- Baseline invalid entry: 1 good-profile run, seed `712505`, timed out waiting for Chrome DevTools.
- Extra baseline reference: `docs/automated-playtest-7a5-extra-good.json`, 1 additional good-profile loss, not merged into the main 29-run aggregate.
- New candidate validation: 15 attempted browser automation runs at 1280x720.
- New valid runs: 14.
- New invalid run: 1 poor-profile timeout, seed `710503`.
- New browser methodology: production preview, `VITE_PLAYTEST_MODE=true`, Chrome CDP, keyboard/mouse input only, no stat cheats, no time scaling.

## Statistical Limitations

- This is automated evidence, not a human preference study.
- The baseline report described 30 valid runs, but the raw JSON currently contains 29 valid run objects plus 1 CDP timeout.
- The new 15-run sample is intentionally small; repeated candidate samples showed noisy poor win-rate swings before the final boss-heal adjustment.
- The reconstructed automation harness is not guaranteed identical to the Pass 7A.5 bot.
- Headless 3-worker frame timing is noisy; single-run frame timing is more useful for performance interpretation.

## Baseline Findings

- Valid baseline win rate: poor 40%, average 60%, good 55.6%.
- Supporting skill metrics were stronger than win rate: good median damage taken 250.4 versus poor 264.2, and good median boss fight 8.7s versus poor 15.8s.
- Damage and Attack Speed looked attractive but not purely causal: Damage offered-not-picked runs still won 60%.
- Projectile Count was the clearest high-roll signal: 5 runs contained it and all 5 won; it also doubles nominal projectile DPS at level 1.
- Low-offense baseline builds were non-viable in the 29 valid runs: 4 samples, 0 wins.
- Mostly-offense baseline builds were concentrated: 19 samples, 78.9% win rate.

## Hypotheses

1. H1 - Attack Speed is the safest offensive multiplier to trim. Confidence: HIGH.
   - It multiplies DPS, projectile density, lifesteal throughput, and proc frequency.
2. H2 - Max HP has low opportunity value at +24. Confidence: MEDIUM.
   - It was offered 24 times and picked 4 times in baseline; +24 is only 9.6% of base 250 HP.
3. H3 - Magnet is under-valued but can improve indirect progression without raw damage. Confidence: MEDIUM.
   - It was offered 23 times and picked 4 times in baseline.
4. H4 - Boss entry recovery erases too many pre-boss mistakes in some candidate samples. Confidence: MEDIUM.
   - Poor/low-offense wins reappeared during candidate testing until entry heal was reduced.
5. H5 - Upgrade RNG explains some profile inversion. Confidence: MEDIUM.
   - Baseline had 9 runs never offered Damage, 7 never offered Attack Speed, and 20 never offered Projectile Count.

## Changes

| Variable | Before | After | Reason |
| --- | ---: | ---: | --- |
| Attack Speed upgrade multiplier | `1.16x` | `1.14x` | Reduce multiplicative runaway without making the upgrade feel weak. |
| Max HP upgrade | `+24` | `+28` | Improve defensive opportunity value modestly without restoring old tank scaling. |
| Magnet upgrade | `+55` | `+70` | Improve utility/XP catch-up value without direct combat damage. |
| Boss entry heal | `+110` | `+90` | Preserve boss transition recovery while keeping earlier mistakes meaningful. |

## Before / After Automated Results

| Metric | Baseline Poor | New Poor | Baseline Avg | New Avg | Baseline Good | New Good |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Valid runs | 10 | 4 | 10 | 5 | 9 | 5 |
| Win rate | 40% | 25% | 60% | 100% | 55.6% | 100% |
| Boss reach | 60% | 75% | 80% | 100% | 66.7% | 100% |
| Median duration | 98.8s | 97.4s | 96.8s | 101.3s | 93.5s | 98.2s |
| Median damage taken | 264.2 | 318.7 | 269.5 | 78.6 | 250.4 | 58.3 |
| Median victory HP | 61.2 | 128.0 | 115.5 | 201.4 | 151.6 | 241.5 |
| Median boss fight | 15.8s | 16.9s | 12.5s | 16.3s | 8.7s | 13.2s |
| Median first level-up | 12.5s | 10.4s | 13.5s | 11.3s | 13.6s | 12.1s |

## Upgrade Analysis

Final candidate sample:

| Upgrade | Offers | Picks | Offer-to-pick | Runs Containing | Wins Containing | Median First Pick |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Damage | 14 | 14 | 100% | 9 | 7 | 30.5s |
| Attack Speed | 16 | 8 | 50% | 8 | 7 | 54.8s |
| Projectile Count | 10 | 8 | 80% | 6 | 6 | 20.6s |
| Armor | 7 | 1 | 14.3% | 1 | 1 | 52.3s |
| Max HP | 10 | 4 | 40% | 4 | 3 | 82.5s |
| Lifesteal | 10 | 2 | 20% | 2 | 1 | 33.5s |
| Magnet | 16 | 4 | 25% | 4 | 4 | 52.7s |

## Build Combination Analysis

- Final valid builds: 14.
- Mostly offense: 8.
- Balanced offense + defense: 2.
- Utility present: 8.
- Low offense: 3.
- Successful builds included heavy offense, projectile-oriented, offense + utility, offense + defense, and one good-profile utility-heavy win.
- Offense remains attractive, but the exact Damage + Attack Speed + Projectile Count trio was not required for every success.

## DPS Scaling Analysis

Actual formula remains multiplicative:

```text
effective DPS ~= damage * attackSpeed * projectileCount * expectedCritMultiplier
```

After tuning:

- Base expected DPS: 39.74.
- Attack Speed level 3: 58.88, 1.48x base; previously 62.03, 1.56x base.
- Damage 2 + Attack Speed 2 + Projectile Count 1: 143.82, 3.62x base; previously 148.92, 3.75x.
- High-roll offense model: 365.97, 9.21x base; previously 385.58, 9.70x.

Projectile Count is still the biggest single nominal DPS spike because level 1 changes 1 projectile to 2 projectiles.

## Defense Analysis

- Armor is mathematically useful and was not buffed: at base armor 2, one Armor upgrade saves roughly 2 HP per representative non-swarm hit, while still respecting the minimum 1 damage floor.
- Max HP moved from +24 to +28. This is now 11.2% of base HP plus immediate capped healing.
- Lifesteal stayed at 0.014 because high-DPS lifesteal can become nonlinear sustain; the baseline only had 1 pick, so the sample is too thin for a strong buff.
- Boss entry heal moved from +110 to +90 so defensive mistakes before boss are less fully erased.

## RNG Findings

- Baseline upgrade RNG materially affected outcomes: 20 of 29 valid runs never saw Projectile Count.
- Final candidate still shows RNG influence: Projectile Count appeared in only 6 of 14 valid runs containing it.
- No bad-luck protection or deterministic offer system was added because the evidence was noisy and value tuning solved the clearest issues more simply.

## Skill Differentiation

IMPROVED BUT UNCERTAIN.

- Final win rate separated poor from average/good in valid runs: poor 25%, average/good 100%.
- Damage taken showed strong skill separation: poor 318.7 median, average 78.6, good 58.3.
- Victory HP also separated: poor 128.0, average 201.4, good 241.5.
- The sample is too small and has one poor timeout, so this should not be treated as production-level proof.

## Build Diversity

IMPROVED.

Final sample had utility-present wins, balanced wins, projectile-heavy wins, and high-offense wins. Pure/mostly defensive builds are still not a primary route, which is acceptable for a short survival action MVP.

## Offense Dependency

HIGH.

Offense remains the best and most picked category, especially Damage and Projectile Count. However, the final sample no longer required the exact top-three offense package in every win.

## Boss Balance

- Boss remains killable by strong and balanced builds.
- Low-offense/utility-heavy good-profile builds can still win, but boss fights stretch to roughly 34s.
- Poor profile can still win with strong offense, but failed 3 of 4 valid runs after boss entry heal was reduced.

## Pacing

- First level-up stayed within target: final medians 10.4s poor, 11.3s average, 12.1s good.
- Typical successful run remained around 95-120s.
- Boss spawn timing was not changed.

## Performance

- 3-worker automated sample frame p95: 50.1ms median per profile. This is treated as noisy because three headless Chrome workers were running full games concurrently.
- Single-run performance smoke after tuning: good win at 94.2s, frame p95 16.8ms, boss fight 9.2s.
- No fatal slowdown, crash, duplicate telemetry, or runaway restart behavior was observed in browser automation.

## Mobile QA

Viewport smoke was performed at:

- 390x844
- 430x932
- 844x390
- 932x430
- 1280x720
- 1920x1080

All six viewports rendered MenuScene, accepted PLAY input, and entered GameScene. Portrait and short-landscape screenshots were inspected temporarily; no Menu overlap was observed in the checked screens. The smoke used automated mouse/CDP input, not a real human thumb.

## Visual Regression

Pass 7A.6 visual behavior remained intact in smoke checks:

- Menu backdrop and permanent upgrade panels rendered.
- Player aura/rings rendered in-game.
- HUD remained readable in portrait and short landscape.
- No visual balance-specific regression was observed.

## Playables Regression

- Existing playtest telemetry remained gated behind `VITE_PLAYTEST_MODE`.
- Replay smoke after a leveled run passed: good profile reached level 4, first level-up 12.8s, ResultScene PLAY AGAIN started telemetry `run-2`.
- No external analytics or prohibited URLs were added.

## Validation

Baseline before balance changes:

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: pass
- `npm run build`: pass
- `npm run audit:playables`: pass
- `npm audit --omit=dev`: pass

Final validation results are recorded in the final assistant report for this pass.

## Git

No commit was created because `AGENTS.md` says not to auto-commit or push. See final report for current branch, status, and diff summary.

## Remaining Unknowns

- True human touch-control difficulty.
- Whether average/good 100% automated win rate is too high for real players.
- Whether Projectile Count should eventually get soft offer balancing.
- Whether utility-heavy wins feel satisfying or too slow to humans.
- Whether the poor-profile timeout represents a CDP harness issue or a rare long-run edge case.

## Recommended Next Step

LIMITED HUMAN BALANCE PLAYTEST
