# Evolve Arena

Evolve Arena is a Phaser 3 hybrid-casual survival action game: move, auto-attack, collect XP, choose upgrades, build synergies, defeat the Apex Core, earn coins, and replay.

## Gameplay Loop

Move through the arena, survive enemy waves, collect XP orbs, level up, choose one of three upgrades, fight elites, defeat the boss, and spend earned coins on permanent upgrades.

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
```

## Controls

- Desktop: WASD or Arrow Keys
- Mobile/tablet: touch and drag to move with a dynamic joystick
- Attacks are automatic

## Implemented MVP Features

- One large arena
- One playable character
- Five standard enemy types: Basic, Runner, Tank, Ranged, Swarm
- Elite enemy variants
- Boss encounter with charge and radial projectile patterns
- Auto-targeting projectile combat
- Player health, armor mitigation, enemy contact damage, and enemy projectiles
- XP drops, XP magnet attraction, level progression, and upgrade selection
- 16 temporary upgrades including damage, attack speed, movement, health, magnet, extra shots, piercing, crits, explosions, lifesteal, armor, and knockback
- Score, kills, elite kills, survival bonus, boss reward, coins, and best score
- Permanent meta upgrades for damage, health, and movement speed
- Game over, victory, replay, and upgrade menu
- Procedural Phaser textures, hit flashes, bursts, floating damage, camera shake, and boss telegraphs

## Architecture Overview

- `src/game/config`: central balance, constants, Phaser config
- `src/game/data`: enemy, upgrade, and save defaults
- `src/game/entities`: Phaser entity wrappers
- `src/game/input`: desktop and touch input
- `src/game/scenes`: boot, menu, gameplay, results
- `src/game/systems`: pure gameplay/progression logic
- `src/game/ui`: HUD, upgrade selection, boss health bar
- `src/game/services`: storage, audio, analytics, YouTube Playables adapter

## Persistence

Save data is versioned and accessed through `GameStorage`, with a `LocalStorageGameStorage` implementation. The parser handles missing, malformed, old, or partial save data by falling back to safe defaults.

Persisted data:

- Best score
- Coins
- Permanent upgrade levels

## YouTube Playables Readiness

The game includes a dedicated `YouTubePlayablesService` adapter with local fallback behavior for initialization, lifecycle pause/resume hooks, score submission, and save/load extension points. It intentionally does not call unofficial or invented YouTube APIs.

## Known Limitations

- Audio uses lightweight generated Web Audio tones rather than authored sound assets.
- The YouTube Playables adapter is local-safe only until official SDK onboarding details are available.
- Art is procedural MVP art, not final production art.
