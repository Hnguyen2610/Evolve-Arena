# Pass 11.1 Stage 4 Hardening

## Scope

Pass 11.1 validates the Stage 4 `ADAPT` mechanic without adding content or changing the stage architecture. The pass focuses on arena-sector fairness, telemetry observability, mobile smoke coverage, and replay/stage-switching stability.

## Baseline Arena State

Stage 4 remains `Overload Grid` in `chapter-2`.

Baseline arena shift config:

- Start: 20s.
- Cycle: 11.8s stable, 1.45s warning, 3.3s overload, 2.6s recovery.
- Sectors: 6 total, 2 dangerous per cycle.
- Damage: 10 raw damage per tick with 760ms cooldown.
- Boss spawn: 84s.

The first standard warning begins around 31.8s and the first overload begins around 33.25s. Boss patterns can force shorter warning and overload windows.

## Fixes

- Aligned the visual arena warning wedges with the actual damage-sector mapping. The previous rendering formula rotated danger wedges by 90 degrees relative to `getArenaSectorForPoint`.
- Added `getArenaSectorBounds` so rendering and sector tests share the same angle convention.
- Added `overloadDamageTaken` to run results and playtest telemetry.
- Added dangerous-sector and cycle-index payloads to `arena_shift` and `overload_started` playtest events.

## Regression Tests

- `ArenaStateSystem` now verifies that the midpoint of each rendered sector wedge maps back to the same damage sector.
- `PlaytestTelemetryService` now verifies overload damage aggregation plus dangerous-sector and cycle-index payloads.
- Result and stage-mastery persistence fixtures include the new `overloadDamageTaken` field.

## Browser QA

Production preview was tested with `VITE_PLAYTEST_MODE=true` using Chrome DevTools Protocol.

Desktop full-run batch at 1280x720:

| Profile | Runs | Wins | Median duration | Median boss fight | Median damage | Median HP left | Median overload hits | Median overload damage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Non-adaptive | 3 | 3 | 113.2s | 29.2s | 227.0 | 45.4% | 9 | 72 |
| Late-reaction | 3 | 3 | 126.4s | 42.4s | 210.7 | 36.3% | 15 | 120 |
| Adaptive | 3 | 3 | 127.4s | 43.4s | 241.3 | 24.5% | 15 | 120 |

Observed shared facts:

- Boss spawn timing: 84.0s in all 9 full runs.
- First level-up timing range: 12.4s to 16.2s.
- All 9 runs reached and defeated Grid Sentinel.
- Desktop frame summary stayed near 60 FPS in the headless production preview; p95 frame time was 16.8ms across all runs, with rare p99 spikes around 33.3ms and 0-2 frames above 50ms per run.

Mobile smoke after automatic upgrade selection:

| Viewport | Stage 4 started | Warning seen | Overload seen | Duration reached | Canvas |
| --- | --- | --- | --- | ---: | --- |
| 390x844 | yes | yes | yes | 42.0s | 390x844 |
| 430x932 | yes | yes | yes | 41.9s | 430x932 |
| 844x390 | yes | yes | yes | 41.1s | 844x390 |
| 932x430 | yes | yes | yes | 41.8s | 932x430 |

Stage switching smoke successfully started this sequence without stage-id leakage:

`stage-4 -> stage-1 -> stage-3 -> stage-4 -> stage-2 -> stage-4 -> stage-1 -> stage-4`.

## Mechanic Classification

Current classification: meaningful pressure, but not yet proven as a strong adaptation differentiator by automated bots.

The fixed sector alignment removes an unfair readability problem. The desktop batch shows Stage 4 applies real pressure: median remaining HP ranged from 24.5% to 45.4% and overload damage made up a large share of damage taken. However, the automated adaptive movement profile did not outperform generic or late movement in this batch, so future human playtesting should still watch whether players feel rewarded for reading warning sectors.

## Remaining Limitations

- The automated adaptive bot chooses safe sectors from telemetry but does not reason about its exact world position, enemy body blocks, or boss pressure. Treat its profile comparison as a pressure signal, not a human-skill substitute.
- No numeric Stage 4 balance tuning was applied after the sector fairness fix. Increasing raw overload damage would likely punish weak and late profiles before proving the adaptation loop is clearer.
- Browser QA was performed through automated CDP playtesting, not manual touch-device play.
