# YouTube Playables Readiness

This document tracks repository-side readiness for YouTube Playables. It does not replace the official YouTube Playables Test Suite or Developer Portal certification.

## Implemented

- The official Playables SDK script is loaded in `index.html` before the Vite game module.
- Playables SDK usage is isolated in `src/game/services/YouTubePlayablesService.ts`.
- `firstFrameReady()` and `gameReady()` are idempotent, with `firstFrameReady()` guaranteed before `gameReady()`.
- Local development uses `LocalStorageGameStorage`.
- YouTube Playables environments use `YouTubeGameStorage`, backed by `ytgame.game.loadData()` and `ytgame.game.saveData()`.
- Cloud save blocks `saveData()` until a successful `loadData()` completes.
- Malformed, missing, old, or partial save data is normalized through the existing save parser.
- Save failures are best-effort and do not crash gameplay.
- New best scores are sent through `ytgame.engagement.sendScore({ value })` after the persisted best score is updated.
- YouTube audio state is respected through `ytgame.system.isAudioEnabled()` and `ytgame.system.onAudioEnabledChange()`.
- Playables pause/resume uses `ytgame.system.onPause()` and `ytgame.system.onResume()`.
- Page Visibility API is not used as the Playables lifecycle authority.
- The Playable remains a single-page Phaser application with no account UI, external links, or third-party analytics.
- `npm run audit:playables` checks the built `dist/` bundle for preflight size, path, filename, SDK-ordering, and save-size limits.

## Verified Locally

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run audit:playables`
- Local browser smoke tests for menu, play, movement, combat, XP, level-up, boss, result, replay, storage reload, resize/orientation, and touch/mouse input.

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
