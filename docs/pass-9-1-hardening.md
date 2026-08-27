# Pass 9.1 - Chapter 1 Hardening QA

Date: 2026-08-26

Scope: Chapter 1 progression integrity, Stage 3 stress QA, reward idempotency, mobile layout smoke, and production-preview validation. No new content or broad architecture changes were made in this pass.

## Fresh Save Chapter 1 Progression

Production preview was built with `VITE_PLAYTEST_MODE=true` and tested in Chrome at 1280x720.

| Run | Result | Duration | First Level | Boss Spawn | Boss Fight | Level | Coins | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Stage 1 fresh | Victory | 116.5s | 10.8s | 85.0s | 31.5s | 4 | 98 | Stage 2 unlocked after reload |
| Stage 2 lineage | Victory | 109.9s | 13.7s | 82.0s | 27.9s | 4 | 99 | Stage 3 unlocked after reload |
| Stage 3 lineage | Victory | 103.7s | 15.0s | 84.0s | 19.7s | 4 | 100 | Chapter 1 completed after reload |

Final fresh-lineage save after Stage 3:

- `unlockedStageIds`: `stage-1`, `stage-2`, `stage-3`
- `clearedStageIds`: `stage-1`, `stage-2`, `stage-3`
- `clearedChapterIds`: `chapter-1`
- `coins`: 587
- `bestScore`: 2464

Reward integrity matched the expected first-clear path:

- Stage 1 run coins 98 + first-clear 35 = 133 total.
- Stage 2 prior 133 + run coins 99 + first-clear 55 = 287 total.
- Stage 3 prior 287 + run coins 100 + first-clear 80 + chapter clear 120 = 587 total.

## Stage 3 Automated Samples

Stage 3 was sampled from an unlocked setup with small permanent upgrades (`damage: 1`, `speed: 1`) using actual browser input and telemetry export.

| Profile | Result | Duration | Boss Fight | Level | Coins |
| --- | --- | ---: | ---: | ---: | ---: |
| poor-1 | Victory | 107.3s | 23.3s | 4 | 102 |
| poor-2 | Victory | 112.2s | 28.2s | 4 | 101 |
| average-1 | Victory | 97.4s | 13.4s | 4 | 101 |
| average-2 | Victory | 108.3s | 24.3s | 4 | 103 |
| good-1 | Victory | 97.0s | 13.0s | 5 | 105 |
| good-2 | Victory | 102.3s | 18.3s | 5 | 104 |

Balance note: Stage 3 is consistently clearable by the automation profiles used here. This is not treated as a hardening regression because the profiles still choose upgrades intentionally, but it should be checked by human playtest before adding more content.

## Stage 3 Mechanics

Fresh Stage 3 telemetry:

- Energy Nodes spawned: 4
- Energy Nodes destroyed: 3
- Energy Node pressure hits: 6
- Boss reached: 84.0s
- Boss defeated: 103.7s

Replay with an already completed Chapter 1 save produced a Stage 3 victory at 96.9s and did not emit a duplicate `chapter_completed` event.

## Compatibility And Switching

Old-save smoke checks:

- Minimal old save with no cleared stages did not start locked Stage 3.
- Legacy save with Stage 1 and Stage 2 cleared derived Stage 3 availability correctly.
- Save with Stage 1/2/3 cleared but missing `clearedChapterIds` kept Stage 3 available; chapter completion remains explicit and is not inferred during normalization.

Stage switching stress through Stage Select succeeded for:

`stage-1 -> stage-2 -> stage-3 -> stage-1 -> stage-3`

## Mobile And Layout Smoke

Screenshots were visually inspected and then removed for:

- 390x844
- 430x932
- 844x390
- 932x430
- 1920x1080

Observed result:

- Menu permanent upgrade panels did not overlap the controls/instructions in 844x390.
- Stage Select cards remained readable in portrait and short landscape.
- Stage 3 selection was visually clear in both portrait and landscape layouts.

## Performance

Late-run frame sampling in production preview stayed stable in the measured runs:

- Fresh Stage 1 late p95: 16.8ms, p99: 16.9ms, frames over 33ms: 0
- Fresh Stage 2 late p95: 16.8ms, p99: 16.8ms, frames over 33ms: 0
- Fresh Stage 3 late p95: 16.8ms, p99: 16.8ms, frames over 33ms: 0
- Stage 3 sample late p95 values observed at 16.8ms with no >33ms frames in captured samples.

## Limitations

- Browser pause/resume with a mocked `ytgame` SDK was attempted, but the mock did not register SDK lifecycle listeners in the production bundle. Existing unit coverage remains the source of validation for the lifecycle coordinator.
- Mobile QA was layout/start smoke plus screenshot inspection, not full mobile touch victory runs.
- No human playtest was performed in this pass.
