# YouTube Playables Readiness

This document tracks repository-side readiness for YouTube Playables. It does not replace the official YouTube Playables Test Suite or Developer Portal certification.

## Implemented

- The official Playables SDK script is loaded in `index.html` before the Vite game module.
- Playables SDK usage is isolated in `src/game/services/YouTubePlayablesService.ts`.
- `firstFrameReady()` and `gameReady()` are idempotent, with `firstFrameReady()` guaranteed before `gameReady()`.
- Startup ownership is centralized in `BootScene`: it renders a visible splash, waits for the first post-render event, signals `firstFrameReady()`, initializes platform storage, loads the save once, then starts `MenuScene` with the loaded save.
- `MenuScene` renders synchronously from the startup save and calls `gameReady()` only after PLAY and Permanent Upgrades are visible and interactable.
- Local development uses `LocalStorageGameStorage`.
- YouTube Playables environments use `YouTubeGameStorage`, backed by `ytgame.game.loadData()` and `ytgame.game.saveData()`.
- Cloud save blocks `saveData()` until a successful `loadData()` completes.
- Malformed, missing, old, or partial save data is normalized through the existing save parser.
- Save failures are best-effort and do not crash gameplay.
- New best scores are tracked as a single pending best-score synchronization value. The game sends `ytgame.engagement.sendScore({ value })` only after a matching save checkpoint succeeds. Failed `saveData()` or failed `sendScore()` keeps the pending best score for a later safe checkpoint such as result save, pause save, or permanent-upgrade save.
- YouTube audio state is respected through `ytgame.system.isAudioEnabled()` and `ytgame.system.onAudioEnabledChange()`.
- Playables pause/resume uses one app-level coordinator subscribed to `ytgame.system.onPause()` and `ytgame.system.onResume()`.
- On platform pause, the coordinator disables global input, pauses shared audio, performs a best-effort save checkpoint, and sleeps the Phaser game loop. On resume it restores input/audio and wakes the game loop without changing scene or gameplay mode ownership.
- Page Visibility API is not used as the Playables lifecycle authority.
- The Playable remains a single-page Phaser application with no account UI, external links, or third-party analytics.
- `npm run audit:playables` checks the built `dist/` bundle for preflight size, path, filename, SDK-ordering, save-size limits, external URLs, and obvious network API patterns. The only allowed production external script URL is the official Playables SDK.
- Detailed run telemetry is gated behind `VITE_PLAYTEST_MODE=true`. It remains local/in-memory and logs structured summaries for manual playtesting only. It is not written into YouTube cloud save and does not send data to an analytics service.

## Verified Locally

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run audit:playables`
- Local browser smoke tests for menu, play, movement, combat, XP, level-up, boss, result, replay, storage reload, resize/orientation, and touch/mouse input.
- Unit coverage for pending best-score retry behavior, startup ordering, lifecycle state ownership, and playtest telemetry.

## Startup Sequence

Expected local/Playables startup sequence:

```text
BootScene renders splash/loading frame
-> Phaser post-render fires
-> firstFrameReady()
-> platform initialize/loadData through storage abstraction
-> MenuScene receives loaded save and renders interactable menu
-> gameReady()
```

`loadData()` must happen after the first visible splash frame and before `gameReady()`. `MenuScene` should not perform a second startup load when Boot has already provided a save.

## Playtest Telemetry

When `VITE_PLAYTEST_MODE=true`, the local playtest telemetry service records bounded, anonymous run summaries:

- run id and local timestamps
- gameplay duration in seconds
- victory/defeat, score, coins earned, player level, kills, elite kills
- first level-up time
- boss reached time, boss defeated state, boss fight duration when available
- damage taken and remaining HP
- upgrade selections with level before/after, selection time, and offered upgrade ids
- session counts for runs started, runs completed, victories, defeats, and replays

Gameplay duration comes from the run's game elapsed time, so platform pause time does not inflate duration. The service does not collect names, emails, account data, location, device fingerprints, YouTube identity, or other personal data.

The current telemetry export path is structured console output in playtest mode. Playtest builds also expose a read-only `window.__EVOLVE_PLAYTEST__` inspection API for local QA. Normal production builds do not emit playtest summaries and do not expose the inspection API.

## Later Analysis Format

After real external tester sessions, summarize collected playtest records with:

- number of runs
- completion rate
- boss reach rate
- boss win rate
- median run duration
- median first level-up time
- median level at boss
- replay rate
- upgrade pick rates and offer-to-pick rates

Do not fabricate these values before real playtest data exists.

## Requires YouTube Developer Portal

- Official Playables Test Suite validation.
- Ingested bundle measurement by YouTube tooling.
- YouTube desktop test environment.
- YouTube Android test environment.
- YouTube iOS test environment.
- Final certification review.

Developer Portal access may require an onboarded or invited YouTube channel. Do not mark these items as passed until they are actually performed in the official environment.

## Local Preflight

Run:

```bash
npm run build
npm run audit:playables
```

The audit script is a local preflight only. Passing it does not guarantee YouTube certification.
