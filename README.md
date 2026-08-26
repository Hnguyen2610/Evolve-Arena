# Evolve Arena

Evolve Arena is a Phaser 3 hybrid-casual survival action game: move, auto-attack, collect XP, choose upgrades, build synergies, clear stages, earn coins, and replay.

## Gameplay Loop

Move through Chapter 1 arenas, survive enemy waves, collect XP orbs, level up, choose one of three upgrades, fight elites, defeat the stage boss, earn first-clear rewards, and spend coins on permanent upgrades.

## Stack

- TypeScript
- Phaser 3
- Vite
- Vitest
- ESLint
- HTML5 Canvas/WebGL

## Requirements

- Node.js 20+ recommended
- npm

## Install

```bash
npm install
```

## Local Development

```bash
npm run dev
```

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:playables
```

## Controls

- Desktop: WASD or Arrow Keys
- Mobile/tablet: touch and drag to move with a dynamic joystick
- Attacks are automatic

## Implemented MVP Features

- Stage Select with Chapter 1 progression across three stages
- Stage 1: Neon Core arena with the original Apex Core boss encounter
- Stage 2: Rift Nexus arena with rift hazards, Orbiter enemies, Pulse Casters, and the Prism Warden boss
- Stage 3: Core Forge arena with Energy Nodes, Guardians, Disruptors, and the Forge Tyrant chapter boss
- One playable character
- Nine standard enemy types: Basic, Runner, Tank, Ranged, Swarm, Orbiter, Pulse Caster, Guardian, Disruptor
- Elite enemy variants
- Stage-aware boss encounters with charge, radial projectile, rift pressure, and controlled support-node patterns
- Auto-targeting projectile combat
- Player health, armor mitigation, enemy contact damage, and enemy projectiles
- XP drops, XP magnet attraction, level progression, and upgrade selection
- 16 temporary upgrades including damage, attack speed, movement, health, magnet, extra shots, piercing, crits, explosions, lifesteal, armor, and knockback
- Score, kills, elite kills, survival bonus, boss reward, coins, and best score
- One-time stage first-clear rewards, Chapter 1 completion reward, and permanent meta upgrades for damage, health, and movement speed
- Game over, victory, replay, and upgrade menu
- Procedural Phaser textures, hit flashes, bursts, floating damage, camera shake, and boss telegraphs

## Architecture Overview

- `src/game/config`: central balance, constants, Phaser config
- `src/game/data`: chapter, stage, enemy, upgrade, and save defaults
- `src/game/entities`: Phaser entity wrappers
- `src/game/input`: desktop and touch input
- `src/game/scenes`: boot, menu, gameplay, results
- `src/game/systems`: pure gameplay/progression logic
- `src/game/ui`: HUD, upgrade selection, boss health bar
- `src/game/services`: storage, audio, analytics, YouTube Playables adapter

## Persistence

Save data is versioned and accessed through `GameStorage`. Local development uses `LocalStorageGameStorage`; YouTube Playables environments use `YouTubeGameStorage` through the official `ytgame.game.loadData()` / `saveData()` APIs. The parser handles missing, malformed, old, or partial save data by falling back to safe defaults.

Persisted data:

- Best score
- Coins
- Permanent upgrade levels
- Unlocked and cleared stage IDs
- Cleared chapter IDs

## YouTube Playables Readiness

The game includes a dedicated `YouTubePlayablesService` adapter for official SDK calls, including environment detection, ready signals, cloud save, score submission, audio state, pause/resume, and language lookup. Local development remains playable without YouTube credentials.

See `docs/youtube-playables-readiness.md` for the current integration checklist and remaining Developer Portal / Test Suite steps.

## Known Limitations

- Audio uses lightweight generated Web Audio tones rather than authored sound assets.
- Official YouTube Playables Test Suite validation and Developer Portal certification have not been run locally.
