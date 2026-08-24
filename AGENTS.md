# Evolve Arena Agent Notes

## Project Purpose
- Evolve Arena is a client-only Phaser 3 hybrid-casual survival arena MVP.
- Core loop: move, auto-attack, kill enemies, collect XP, choose upgrades, defeat the boss, earn coins, replay.

## Stack
- TypeScript, Phaser 3, Vite, Vitest, ESLint, npm.
- Keep the app at the repository root. Do not create nested duplicate apps.
- Do not add a backend, authentication, multiplayer, ads, or large dependencies for MVP work.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Build: `npm run build`

## Architecture
- Keep balance in `src/game/config` and data definitions in `src/game/data`.
- Keep platform integrations behind services in `src/game/services`.
- Keep input, UI, pure systems, entities, and scenes separated.
- Use generated Phaser textures for MVP assets; do not commit copyrighted assets.

## Gameplay Priorities
- Fun, responsive controls, clarity, replayability, mobile usability, performance, maintainability, polish.
- Maintain WASD/arrow support, normalized diagonals, touch drag/joystick movement, auto-attack, XP magnet, upgrades, elites, boss telegraphs, and immediate replay.

## YouTube Playables
- Do not invent SDK calls.
- Keep local-safe behavior in `YouTubePlayablesService`.
- Add real SDK calls only after checking official Google/YouTube documentation.

## Git Safety
- Preserve unrelated user changes.
- Do not run destructive Git commands or force push.
- Before final reporting, run `git status`, `git diff --stat`, and validation scripts.
