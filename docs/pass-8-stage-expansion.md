# Pass 8 Stage Expansion

## Scope

Pass 8 adds a small stage system and Stage 2 content while preserving Stage 1 as the default run.

## Stage System

- Stage 1 (`stage-1`): Neon Core, unlocked by default.
- Stage 2 (`stage-2`): Rift Nexus, unlocked by clearing Stage 1.
- Save data now stores `unlockedStageIds` and `clearedStageIds`.
- Result persistence marks cleared stages only on victory.
- Telemetry records `stageId` for each run.

## Stage 2 Content

- New stage palette and arena theme.
- Orbiter enemy: circles/flanks while pressuring the player.
- Pulse Caster enemy: telegraphs briefly, then fires a three-shot pulse.
- Rift hazard: delayed warning zone, then one damage pulse if the player remains inside.
- Prism Warden boss: Stage 2 boss variant with distinct colors, rotating radial projectile offsets, and rift pressure.
- Stage 2 uses lower enemy density than its first implementation pass so the added hazard/caster complexity does not prevent reaching the boss.

## Stage 1 Preservation

Stage 1 keeps the previous boss spawn timing, enemy unlock curve, spawn multiplier, max enemy bonus, elite chance bonus, and boss entry heal. Regression tests cover the default Stage 1 difficulty curve.

Stage 2 currently spawns the Prism Warden at 82 seconds. This gives the new rift pressure time to matter while avoiding repeated pre-boss deaths at roughly 75-84 seconds observed during automated browser QA.

## Validation Notes

Automated coverage was added for:

- Stage unlock/clear progression.
- Result persistence unlock behavior.
- Storage normalization for stage progress.
- Telemetry `stageId`.
- Stage 1 and Stage 2 difficulty unlock curves.

Final browser QA observations from headless Chrome/CDP with `VITE_PLAYTEST_MODE=true`:

- Stage Select rendered without scroll overflow at 1280x720, 1920x1080, 390x844, 430x932, 844x390, and 932x430.
- Fresh save Stage 2 locked click did not start a run.
- Stage 1 first level-up was observed at 14.6 seconds.
- Stage 2 first level-up was observed at 13.6 seconds.
- Stage 2 boss reached was observed at 82.0 seconds.
- Browser error capture reported no runtime errors.

## Pass 8.1 Full-Run Validation

Additional headless Chrome/CDP validation was run with profile-based saves and telemetry-driven upgrade selection:

- Poor/static Stage 2 defeat: 101.5 seconds, boss reached at 82.0 seconds, player died during boss.
- Poor/static Stage 2 defeat: 67.7 seconds, player died before boss.
- Good/offense Stage 2 victory: 87.4 seconds, boss reached at 82.0 seconds, boss fight 5.4 seconds.
- Good/offense Stage 2 victory: 86.2 seconds, boss reached at 82.0 seconds, boss fight 4.2 seconds, `stage-2` persisted in `clearedStageIds`.
- Average/offense Stage 2 victory: 89.0 seconds, boss reached at 82.0 seconds, boss fight 7.0 seconds.
- Stage 1 locked-save victory: 94.1 seconds, boss reached at 85.0 seconds, Stage 2 persisted in `unlockedStageIds`.
- Reload persistence check: a Stage 1 victory-shaped persisted save reloaded, Stage Select accepted Stage 2, and telemetry started `stageId: stage-2`.
- Stage 2 victory replay check: Play Again started `run-2` with `stageId: stage-2` and `replay_started`.
- Stage 2 victory stage-switch check: Result to Stage Select to Stage 1 started `run-2` with `stageId: stage-1`.

No browser runtime errors were captured during these Pass 8.1 runs.

Browser QA should verify:

- Fresh save: Stage 1 playable, Stage 2 locked.
- Stage 1 victory: Stage 2 unlock message and Stage Select availability.
- Stage 2: Orbiter/Pulse Caster readability, rift telegraphs, Prism Warden encounter.
- Replay from Result uses the same stage.
