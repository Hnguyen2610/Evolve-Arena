# Pass 11 Chapter 2 Foundation and Stage 4

## Scope

Pass 11 opens Chapter 2 with one vertical-slice stage. It does not add Stage 5, Stage 6, Chapter 2 completion, new currencies, new permanent upgrades, equipment, backend services, monetization, or external analytics.

Chapter 1 balance is intentionally left unchanged. Stage 1, Stage 2, and Stage 3 keep their existing enemies, rewards, bosses, permanent upgrade values, and in-run upgrade scaling.

## Chapter 2

Chapter 2 (`chapter-2`) is `Overdrive Sector`. It unlocks only after `chapter-1` is cleared.

The chapter currently contains:

- Stage 4 (`stage-4`): `Overload Grid`

Chapter 2 is intentionally marked in progress. Clearing Stage 4 grants its stage first-clear reward and mastery/records, but does not add `chapter-2` to `clearedChapterIds`.

## Stage 4

Stage 4 identity is `ADAPT`: the player must react to changing arena sectors while maintaining normal survival combat pressure.

New content:

- Arena overload sectors: deterministic warning, overload, and recovery phases.
- Anchor: semi-stationary ranged pressure that fires a telegraphed burst.
- Interceptor: fast dash enemy with a short lane telegraph.
- Grid Sentinel: Stage 4 boss that combines existing charge/radial patterns with overload-grid pressure.

Stage 4 first-clear reward is 105 coins, higher than Stage 3's 80 coins but below a full new-chapter economy layer.

## Save and Progression

Stage 4 availability derives from `clearedChapterIds: ['chapter-1']`, not from old stage-only saves.

Migration behavior:

- Old saves with Stage 1 and Stage 2 cleared still unlock Stage 3.
- Saves with `chapter-1` cleared unlock Stage 4.
- Saves with Stage 1/2/3 cleared but no `chapter-1` marker do not infer Chapter 1 completion.
- Stage 4 victory does not complete Chapter 2.

## Mastery and Telemetry

Stage 4 mastery:

- 1 star: clear the stage.
- 2 stars: clear under 1:54.0.
- 3 stars: clear under 1:54.0 with 3 or fewer overload hits and at least 2 overload events.

Telemetry now records:

- `arenaShifts`
- `overloadEvents`
- `overloadHits`
- `overloadDamageTaken`

These are included in run completion data and exposed through the existing playtest inspection API.

## QA Notes

Browser QA should cover:

- Fresh saves: Chapter 2 visible but locked.
- Chapter 1 completed saves: Chapter 2 tab available and Stage 4 playable.
- Stage 4 defeat and victory result flows.
- Stage 4 replay returns to Stage 4.
- Stage Select switching between Chapter 1 and Chapter 2.
- Mobile portrait and short-landscape Stage Select layout.
- Overload warning readability and damage fairness.
- Grid Sentinel boss overlap with overload sectors.

Remaining limitation: Stage 4 is a vertical slice, not a complete Chapter 2 arc.
