# AGENTS.md

## Project

**Evolve Arena** is a lightweight hybrid-casual survival action game built for the web and intended to be compatible with **YouTube Playables**.

Official repository:

`https://github.com/Hnguyen2610/Evolve-Arena`

The game should prioritize fast onboarding, satisfying combat, replayability, mobile usability, performance, and maintainable architecture.

---

## Tech Stack

Use the existing repository stack. Unless the repository already defines something different, prefer:

- TypeScript
- Phaser 3
- Vite
- HTML5 Canvas/WebGL
- npm

Do not introduce a backend for the MVP.

Do not add authentication, multiplayer infrastructure, cloud services, or unnecessary dependencies unless explicitly requested.

Use the package manager already established by the repository lockfile.

---

## Repository Rules

Treat this repository as the single source of truth.

Before making significant changes:

```bash
git status
git branch --show-current
git remote -v
```

Preserve existing working code where practical.

Do not create a duplicate nested application such as:

```text
Evolve-Arena/
  evolve-arena/
    package.json
```

unless the repository intentionally uses that structure.

Do not overwrite unrelated user changes.

Do not use destructive Git commands unless explicitly required and safe.

Avoid:

```bash
git reset --hard
git clean -fd
git checkout .
git push --force
```

Never rewrite remote history or discard unrelated work.

---

## Working Method

For substantial tasks, follow this loop:

```text
INSPECT
↓
UNDERSTAND
↓
PLAN
↓
IMPLEMENT
↓
RUN
↓
TEST
↓
FIX
↓
RETEST
↓
REVIEW DIFF
```

Do not stop after planning when implementation was requested.

Do not assume code works because it compiles.

When a failure occurs, investigate the root cause and fix it before continuing where reasonably possible.

---

## Architecture

Keep gameplay systems modular.

Prefer clear separation between:

- scenes
- entities
- gameplay systems
- input
- UI
- configuration/data
- persistence
- platform integrations

A reasonable structure is:

```text
src/
├── main.ts
└── game/
    ├── config/
    ├── scenes/
    ├── entities/
    ├── systems/
    ├── input/
    ├── ui/
    ├── data/
    └── services/
```

Do not force this structure if the repository already has a better consistent architecture.

Avoid turning `GameScene` into a god class.

Keep balancing values in centralized configuration/data files instead of scattering magic numbers across gameplay code.

---

## TypeScript Rules

Prefer strict TypeScript.

- Avoid `any`.
- Avoid routine use of `@ts-ignore`.
- Use explicit domain types for game state, entities, upgrades, saves, and configuration.
- Keep functions and classes focused.
- Prefer composition over oversized inheritance hierarchies.
- Avoid unnecessary global mutable state.
- Remove dead code and unused imports.

Fix type errors instead of weakening compiler settings merely to make validation pass.

---

## Gameplay Principles

The core loop is:

```text
MOVE
↓
AUTO ATTACK
↓
KILL ENEMIES
↓
COLLECT XP
↓
LEVEL UP
↓
CHOOSE UPGRADE
↓
BECOME STRONGER
↓
FIGHT HARDER WAVES
↓
BOSS
↓
SCORE
↓
META PROGRESSION
↓
REPLAY
```

Priorities:

1. Fun
2. Responsive controls
3. Gameplay clarity
4. Replayability
5. Mobile usability
6. Performance
7. Maintainability
8. Visual polish

Target experience:

- First meaningful interaction: under 5 seconds
- First meaningful reward: under 15 seconds
- First level-up: approximately 8–15 seconds
- Boss encounter: approximately 90 seconds
- Typical run: approximately 60–120 seconds
- Replay should be immediate

If technically correct gameplay feels poor, improve the gameplay rather than preserving a weak implementation.

---

## Controls

Desktop should support:

- WASD
- Arrow Keys

Normalize diagonal movement.

Mobile must support a practical one-thumb control scheme such as:

- dynamic virtual joystick
- drag-to-move

The player should not need a dedicated attack button for the base gameplay loop.

Prevent accidental page scrolling or browser gestures from interfering with gameplay where appropriate.

---

## Responsive Design

The game must remain usable across:

- desktop landscape
- mobile portrait
- mobile landscape
- tablet

Do not design only for 1920×1080.

Important HUD elements must remain readable and inside safe areas.

Consider:

- responsive canvas sizing
- `touch-action`
- overscroll handling
- CSS safe-area insets

Desktop success does not imply mobile success.

---

## Combat

Combat should be primarily automatic.

Typical flow:

```text
find target
↓
attack cooldown
↓
fire projectile
↓
collision
↓
damage
↓
feedback
↓
enemy death
↓
XP + score
```

Provide clear but efficient feedback:

- hit flash
- knockback
- particles
- floating damage numbers
- XP attraction
- subtle camera shake
- boss telegraphs

Avoid excessive visual noise and avoid sacrificing FPS for effects.

---

## Enemy Design

Enemy types should differ behaviorally, not only numerically.

Expected categories may include:

- Basic
- Runner
- Tank
- Ranged
- Swarm
- Elite
- Boss

Avoid unfair spawning directly on top of the player.

Difficulty should escalate gradually and remain readable.

---

## Upgrade System

Level-up should pause active gameplay and present meaningful choices.

Prefer 3 valid upgrade choices.

Do not offer maxed-out upgrades.

Upgrades should support build variety and synergy.

Examples:

- Damage
- Attack Speed
- Movement Speed
- Max Health
- Magnet Range
- Additional Projectile
- Projectile Size
- Piercing
- Critical Chance
- Explosion on Kill
- Lifesteal
- Knockback

Upgrade data should be data-driven where practical.

---

## Persistence

Do not tightly couple gameplay to `localStorage`.

Use a storage abstraction.

Example:

```ts
interface GameStorage {
  load(): Promise<GameSaveData>;
  save(data: GameSaveData): Promise<void>;
}
```

Local development can use `localStorage`.

Persist at least:

- save version
- best score
- coins
- permanent upgrades

Handle missing, malformed, partial, or outdated save data gracefully.

A corrupted save must not permanently break game startup.

---

## YouTube Playables

Keep YouTube-specific behavior isolated behind a dedicated adapter/service such as:

`YouTubePlayablesService`

Gameplay code should not directly depend on global YouTube SDK objects.

The local game must continue to work when the YouTube Playables SDK is unavailable.

Do not invent YouTube SDK methods.

When implementing real integration, consult the latest official Google/YouTube Playables documentation.

Platform-specific integration should be replaceable without rewriting core gameplay.

---

## Pause and Lifecycle

Pause/resume behavior must be reliable.

Pause should stop relevant gameplay systems including:

- enemy spawning
- enemy AI
- combat
- projectiles
- gameplay timers
- boss attacks
- progression timers

Resume must restore normal execution cleanly.

Design pause/resume so YouTube lifecycle events can reuse the same mechanism later.

---

## Performance

Target:

- approximately 60 FPS on modern desktop hardware
- stable gameplay on mid-range mobile hardware

Avoid:

- unnecessary per-frame allocations
- unbounded arrays
- duplicate event listeners
- orphaned timers
- excessive physics bodies
- uncontrolled particle creation
- expensive target searches every frame when avoidable
- memory leaks across scene restarts

Use Phaser groups or pooling where beneficial for frequently created objects such as:

- projectiles
- enemies
- XP orbs
- damage labels
- particles

Do not build an unnecessarily complex custom engine for this.

---

## Restart Safety

Repeated runs must not degrade performance or duplicate behavior.

On scene shutdown/restart, clean up:

- timers
- event listeners
- scene events
- physics objects
- temporary state
- UI overlays
- audio hooks
- references
- pools where necessary

Test repeated restart flows when changing scene lifecycle code.

---

## Audio

Keep audio behind a small reusable service.

Support:

- mute
- pause
- resume

Missing audio assets must not block the rest of the MVP.

---

## Analytics

Do not add an external analytics provider unless explicitly requested.

A small internal analytics abstraction may expose events such as:

- `game_started`
- `game_over`
- `victory`
- `boss_reached`
- `boss_defeated`
- `upgrade_selected`
- `run_duration`
- `player_level`

Keep analytics decoupled from gameplay logic.

---

## Monetization

Do not integrate unofficial advertising or payment APIs.

Keep future monetization hooks isolated.

Possible future rewarded-ad use cases:

- one revive per run
- double post-run coins

Do not make monetization required for core gameplay.

---

## Security

Never commit:

- API keys
- access tokens
- passwords
- private credentials
- secrets

Do not put secrets in client-side code.

If future configuration requires environment variables, provide `.env.example` with placeholder values only.

---

## Dependencies

Prefer Phaser, browser APIs, and small focused utilities before adding new dependencies.

Do not add large libraries for trivial behavior.

After dependency changes, validate a clean install and production build.

---

## Tests

Automated tests are most valuable for pure game logic, including:

- XP thresholds
- upgrade filtering
- maximum upgrade levels
- scoring
- difficulty scaling
- permanent upgrade pricing
- save defaults
- save migrations
- corrupted save recovery

Do not overinvest in unit-testing Phaser rendering internals.

---

## Validation

Before completing a meaningful implementation task, run the scripts that exist in the repository.

Typical commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

At minimum, the production build should succeed unless a genuine external blocker prevents it.

Do not invent successful test results.

If a script does not exist, report that accurately instead of pretending it ran.

---

## Browser and Mobile QA

When browser or visual tooling is available, use it for gameplay changes.

Check:

- startup
- movement
- combat
- XP
- upgrades
- boss
- game over
- victory
- replay
- desktop layout
- mobile portrait
- mobile landscape

Do not claim visual playtesting was completed unless it was actually performed.

---

## Git Review

Before finishing a substantial task, inspect:

```bash
git status
git diff --stat
```

Review changed files for:

- debug leftovers
- console spam
- dead code
- temporary assets
- accidental generated files
- unresolved required TODOs
- unused dependencies
- credentials

Do not claim code was committed or pushed unless Git confirms it.

Never force push.

---

## Definition of Done

A gameplay task is not done merely because it compiles.

For applicable features, confirm:

### Technical

- dependencies install
- dev server can start
- TypeScript validation passes where configured
- production build succeeds
- no obvious fatal runtime errors

### Gameplay

- controls work
- combat works
- enemies behave correctly
- XP works
- leveling works
- upgrades actually alter gameplay
- score/progression works
- game-over and replay work

### Platform

- desktop remains usable
- mobile remains usable
- responsive UI remains readable
- YouTube-specific behavior stays behind platform abstraction

### Quality

- controls feel responsive
- gameplay remains understandable under pressure
- effects improve feedback rather than obscure it
- restart is quick
- no obvious state leakage occurs between runs

---

## README

Keep `README.md` accurate.

When relevant, document:

- game overview
- stack
- setup
- development command
- build command
- tests
- controls
- architecture
- implemented features
- persistence
- YouTube Playables readiness
- known limitations

Do not add generic filler documentation.

---

## Agent Completion Behavior

When asked to implement a feature:

- inspect the repository first
- make reasonable implementation decisions autonomously
- modify the actual repository
- run relevant validation
- fix errors introduced by the change
- report only checks actually performed

Do not stop after giving architecture advice unless the user specifically asked only for advice.

Do not output large replacement code snippets when the task is to modify the repository and direct workspace access is available.

Prefer delivering a working repository state over explaining how the user could implement it themselves.
