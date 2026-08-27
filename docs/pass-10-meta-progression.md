# Pass 10 Meta Progression

## Meta Loop

Pass 10 adds a lightweight replay loop for Chapter 1 after the player has cleared the available content:

1. Open Stage Select.
2. Inspect stage mastery, per-stage score, and best clear time.
3. Replay a stage to improve mastery, score, time, and coins.
4. Spend coins on permanent upgrades.
5. Return to Stage Select with updated personal goals.

No new stages, currencies, enemies, bosses, equipment, backend, or external analytics were added.

## Stage Mastery

Mastery is a deterministic 0-3 star rating evaluated only from completed run data at Result time.

| Stage | Identity | 1-star | 2-star | 3-star |
| --- | --- | --- | --- | --- |
| Stage 1 - Neon Core | MOVE | Clear the stage | Clear under 1:58.0 | Clear under 1:58.0 and take 180 damage or less |
| Stage 2 - Rift Nexus | POSITION | Clear the stage | Clear under 1:52.0 | Clear under 1:52.0 and take 130 damage or less |
| Stage 3 - Core Forge | PRIORITIZE | Clear the stage | Clear under 1:46.0 | Clear under 1:46.0, destroy 3 Energy Nodes, and take 4 or fewer node pressure hits |

Mastery is monotonic. A weaker replay can show lower earned mastery for that run, but the saved stage mastery never downgrades.

## Stage Records

The save now keeps compact per-stage records:

- `stageRecords[stageId].bestScore`
- `stageRecords[stageId].bestClearTimeSeconds`

Best score only increases. Best clear time only improves on victories and only when the new time is lower. Defeats can update per-stage score but cannot write a clear-time record.

The existing global `bestScore` remains the global all-run best score used by score synchronization. Per-stage scores are supplementary and do not trigger score sync unless the global best also improves.

## Chapter Mastery

Stage Select aggregates Chapter 1 mastery as earned stars out of 9. If all three stages reach 3 stars, the chapter header switches to a compact mastered state.

## Save Schema

New save fields:

```json
{
  "stageMastery": {},
  "stageRecords": {}
}
```

Save normalization accepts old saves without these fields. Cleared stages from older saves migrate to at least 1-star mastery because the clear itself was already earned, but old saves are not granted 2-star or 3-star mastery automatically.

Malformed mastery and record payloads are clamped or discarded during normalization. Existing coins, permanent upgrades, stage unlocks, stage clears, chapter clears, and global best score are preserved.

## Result UX

Result now shows:

- score and rewards
- stage mastery
- per-stage best score
- best clear time
- `NEW STAGE BEST`
- `NEW BEST TIME`
- `NEW MASTERY`

These labels are shown only when the current result actually improves the saved state.

## Permanent Upgrade UX

The permanent upgrade cards keep the existing economy and structure. Their stat text now shows current-to-next improvement, and maxed upgrades show the final max value.

## Automated QA

Production preview with playtest mode was used for browser QA.

Layout screenshots were captured for:

- 390x844
- 430x932
- 844x390
- 932x430
- 1280x720
- 1920x1080

Stage Select was inspected at the required mobile portrait, mobile landscape, and desktop sizes. A landscape overlap in the mastery goal/status area was fixed, then rechecked at 844x390 and 932x430.

Result landscape QA at 844x390:

- Stage: Stage 1
- Victory: true
- Duration: 90.4s
- First level-up: 11.5s
- Boss reached: 85.0s
- Boss fight duration: 5.4s
- Score: 2356
- Mastery: 1 -> 3
- Stage record score/time improved
- Global best score remained 2600

Full chapter replay QA used one Chapter-complete save and replayed Stage 1, Stage 2, and Stage 3 sequentially:

| Stage | Victory | Duration | Score | First Level-up | Boss Reached | Boss Fight |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Stage 1 | true | 96.9s | 2405 | 13.4s | 85.0s | 11.9s |
| Stage 2 | true | 93.5s | 2421 | 15.2s | 82.0s | 11.5s |
| Stage 3 | true | 90.8s | 2882 | 13.7s | 84.0s | 6.8s |

Each stage updated only its own record entry. Chapter mastery reached 9/9 after the third replay in this controlled save.

An additional desktop Stage 1 replay produced:

- Victory: true
- Duration: 96.8s
- First level-up: 16.3s
- Boss reached: 85.0s
- Boss fight duration: 11.8s
- Score: 2269
- Mastery: 1 -> 3
- Stage record score/time improved
- Global best score remained 2600

## Remaining Limitations

- Browser QA was automated, not a broad human replayability test.
- Mastery thresholds are calibrated from previous QA notes and the automated runs above, but they still need human playtest feedback for perceived fairness.
- The long-term coin economy was not rebalanced in this pass.
- Stage 2 mastery currently uses damage taken because dedicated Rift hazard hit telemetry was not added for this focused pass.
