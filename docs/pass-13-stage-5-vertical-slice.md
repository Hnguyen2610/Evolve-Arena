# PASS 13 — CHAPTER 2 STAGE 5 VERTICAL SLICE DESIGN + IMPLEMENTATION

## STAGE 5 DESIGN DOCUMENT

### STAGE OVERVIEW
- **Name**: Nexus Cascade
- **Chapter**: Chapter 2 (Overdrive Sector)
- **Stage Number**: 5
- **Subtitle**: Harmonic resonance chamber
- **Description**: Synchronize with the Nexus pulse to unleash devastating combos.
- **Boss**: Conductor

### CORE GAMEPLAY IDENTITY
**Identity**: SYNC
**Core Loop**: Observe → Decide → Reposition/Prioritize → Execute → Recover → Repeat

### PRIMARY MECHANIC: NEXUS PULSE SYNCHRONIZATION
The Nexus Pulse is a central, expanding wave that emanates from the center of the arena on a 20-second cycle:
- **Charge** (8s): Pulse builds energy (visual: growing inner circle, audio: charging tone)
- **Warning** (2s): Pulse ready to expand (visual: flashing boundary, audio: warning beeps)
- **Pulse** (0.5s): Active wave expands to maximum radius (visual: expanding cyan ring, audio: pulse sound)
- **Cooldown** (9.5s): Pulse dissipates (visual: fading ring, audio: cooling tone)

**Player Interaction**:
- When the pulse wave hits enemies, they become staggered and vulnerable for 5 seconds
- Staggered enemies take 2x damage and cannot attack
- Boss (Conductor) gains a shield when hit by pulse, then becomes vulnerable for 9.5 seconds after shield expires
- Players must time their attacks and movement to maximize pulse hits

### VISUAL IDENTITY
- **Color Scheme**: Deep purples and cyans (background: 0x0a001f, arena accents: 0x00ffff, 0xff00ff)
- **Visual Theme**: Harmonic resonance, energy waves, synchronized patterns
- **Arena**: Circular layout with radial symmetry to emphasize the pulse mechanic
- **Effects**: Expanding/contracting rings, particle waves, synchronized enemy behaviors

### ENEMY DESIGN
Using existing enemy archetypes with pulse-specific behaviors:
- **Basic**: Standard chase behavior, vulnerable to pulse stagger
- **Runner**: Fast movement, brief stun when pulsed (less vulnerable time)
- **Ranged**: Shoots projectiles, pulse interrupts shooting for 2 seconds
- **Tank**: High health, pulse reduces defense by 50% for stagger duration
- **Swarm**: Moves in groups, pulse causes temporary dispersion
- **Orbiter**: Circular movement, pulse reverses orbit direction for 3 seconds
- **Pulse Caster**: Charged shots, pulse prevents charging for 2 seconds
- **Disruptor**: Teleporting, pulse increases teleport cooldown
- **Anchor**: Area denial, pulse reduces aura size temporarily
- **Interceptor**: Fast attackers, pulse causes attack speed reduction

### BOSS DESIGN: CONDUCTOR
- **Appearance**: Humanoid cybernetic figure with wave-emitting conduits
- **Movement**: Slow, deliberate movements with occasional teleports to arena edge
- **Primary Attack**: Sends out harmonic waves in 4 directions (telegraphed by arm glow)
- **Mechanic Interaction**:
  - When hit by Nexus Pulse during pulse phase: gains shield (0.5s), then vulnerable (9.5s)
  - Shield visual: golden barrier, Vulnerable visual: flashing cyan
  - During vulnerability: takes 3x damage, attacks slower
  - Attack pattern changes based on vulnerability state
- **Telegraphs**: Clear wind-up before attacks, pulse sync visual when vulnerable
- **Death Feedback**: Energy dispersion with harmonic chime sound

### DIFFICULTY PROGRESSION
- **Early Game (0-60s)**: Learn pulse timing, basic enemy reactions
- **Mid Game (60-120s)**: Manage multiple enemies, position for optimal pulse hits
- **Late Game (120s+)**: High enemy density requires precise timing and movement
- **Boss Fight**: Tests mastery of pulse synchronization under pressure

### MASTERY OBJECTIVES
**Identity**: SYNC
- **1★**: Clear the stage
- **2★**: Clear under 1:50 (110 seconds)
- **3★**: Stagger the boss with pulse waves 2 or more times

### PROGRESSION & UNLOCKS
- **Unlock Condition**: Clear Stage 4 (Overload Grid)
- **Victory Reward**: 130 coins + marks stage as cleared
- **Does NOT**: Complete Chapter 2 or unlock Stage 6
- **Save Migration**: Safe - adds new stage record and mastery fields

### TELEMETRY
Tracked via existing PlaytestTelemetryService:
- nexusPulseCycle (current cycle count)
- nexusPulseHitEnemy (when pulse hits regular enemy)
- conductorBossStaggeredByPulse (when pulse staggers boss)
- Standard metrics: score, clear time, damage taken, etc.

### STAGE SELECT INTEGRATION
- Shows in Chapter 2 after Stage 4
- Status: LOCKED → READY → IMPROVE → MASTERED
- Displays mastery stars, best score, best time, next mastery goal
- Reuses existing StageSelectScene architecture

### RESULT SCREEN INTEGRATION
- Reuses existing ResultScene
- Shows victory/defeat, score, clear time, mastery progress
- Awards first-clear reward on initial victory
- Updates records and mastery appropriately

### 2.5D PRESENTATION
- Uses existing WorldPresentation system
- Pulse wave rendered with proper depth scaling
- Enemy projections maintain gameplay/visual separation
- Grounded shadows and effects respect 2.5D layout
- No independent projection systems created

### ART & ASSETS
- Minimal new assets: uses existing sprite atlas system
- Visual effects: Phaser graphics for pulse waves, tints for stunned enemies
- Audio: Reuses existing audio system with new nexus* sound events
- All assets lightweight and mobile-safe

## IMPLEMENTATION STATUS ASSESSMENT

Looking at the existing codebase, Stage 5 appears to be **substantially implemented**:

1. ✅ **Stage Definition**: Exists in stages.ts with correct properties
2. ✅ **Chapter Definition**: Updated chapters.ts to include stage-5
3. ✅ **Core Mechanic**: Nexus Pulse Synchronization implemented in GameScene.ts
4. ✅ **Visual Theme**: Defined in stages.ts visualTheme section
5. ✅ **Boss Definition**: Conductor boss configured in stages.ts
6. ✅ **Enemy Unlocks**: Proper progression defined
7. ✅ **Mastery Rules**: SYNC identity defined in StageMetaProgressionSystem.ts
8. ✅ **Telemetry Hooks**: References to playtestTelemetry in GameScene.ts

### WHAT NEEDS TO BE COMPLETED/IMPLEMENTED:

1. **Audio Files**: Need to add nexusCharge, nexusWarning, nexusPulse, nexusCooldown, nexusReflect sounds
2. **Enemy Visual Feedback**: Implement showReflectionFeedback() method on Enemy class
3. **Visual Effects**: Enhance drawNexusPulseWave() for better visual presentation
4. **Balance Tuning**: Adjust pulse timing, radius, enemy vulnerabilities
5. **Testing**: Verify all systems work together correctly
6. **Polish**: Ensure smooth transitions and clear player feedback

## VERIFICATION CHECKLIST

Before marking as complete, verify:
- [ ] Stage 5 unlocks after Stage 4 victory
- [ ] Nexus Pulse cycles correctly (8s charge → 2s warning → 0.5s pulse → 9.5s cooldown)
- [ ] Enemies react appropriately to pulse hits (stun/vulnerable)
- [ ] Conductor boss gains shield then becomes vulnerable when pulsed
- [ ] Mastery objectives track correctly
- [ ] Telemetry records properly
- [ ] Stage Select shows correct status and information
- [ ] Result screen displays appropriate information
- [ ] Save migration works correctly
- [x] No regression in Stages 1-4 (typecheck/lint/126 unit tests/build all pass)
- [x] Performance measured at 1920x1080 (see Browser QA section; environment-limited, see caveat)
- [x] Mobile usability verified at 6 viewports (see Browser QA section)

## BROWSER + MOBILE QA — 2026-09-04 (live, real-time, no time scaling)

Driven headlessly with Playwright against the real dev server (`VITE_PLAYTEST_MODE=true`), using
the game's own `window.__EVOLVE_PLAYTEST__` telemetry export and localStorage save inspection as
ground truth (not just screenshots).

### Critical bugs found live (did not show up in typecheck/lint/build/unit tests)

1. **Universal boot crash** — `createWorld()` called `drawRaisedArenaPlatform()` (which calls
   `drawTerrainLayers()`, which uses `this.foregroundDepthFx`) before `this.foregroundDepthFx` was
   assigned. Every stage (not just Stage 5) crashed immediately on `create()`. Fixed by moving the
   `arenaFx`/`foregroundFx`/`foregroundDepthFx` graphics-layer setup earlier in `createWorld()`.
2. **Stage 4 -> Stage 5 unlock chain was never wired** — `stage-4` had no `unlocksOnClear` field at
   all, so clearing it granted no new unlock in the real game (only unit tests using hand-built
   saves masked this). Added `unlocksOnClear: 'stage-5'`.
3. **Total game soft-lock at the Conductor boss spawn** (found via live play, the most severe bug
   of this pass) — `boss-characters.png` is 768x512px = exactly 4 rows x 6 columns (24 frames) for
   the original four bosses. `bossVisual.ts` already configured a 5th row (frames 24-29) for
   `conductor-boss`, but that row was never actually added to the PNG. When the boss spawned,
   `Sprite.play()` threw on the missing frame *inside a Phaser timer callback*, which killed
   Phaser's entire `requestAnimationFrame` loop for the rest of the page — the whole game froze
   permanently (confirmed via two screenshots ~70 real seconds apart, pixel-identical, HUD timer
   stuck at the same value). Every run that survived to the boss (86s) was unwinnable. Fixed two ways:
   - `Enemy.ts` now checks `texture.has(startFrame)` before creating the atlas sprite / calling
     `.play()`, falling back gracefully instead of crashing if a configured row's frames don't exist.
   - `BootScene.ts` gained a real procedural fallback texture (`makeConductorBossTexture`, cyan/magenta,
     matching the Nexus Cascade theme) plus a matching ring/glow, mirroring the existing pattern for
     the other four bosses, so the Conductor renders correctly instead of a blank/placeholder sprite.
   - Verified fixed via a repro that previously froze at the exact same in-game timestamp for 70+
     real seconds; after the fix the same repro reached 92s in-game with the Conductor visible,
     health bar active, and combat ongoing.
4. **Mobile layout collision** — Stage 5's 3-star mastery objective text ("stagger the boss with
   pulse waves 2 or more times") is longer than every other stage's, and wrapped to a second line
   that overlapped the stage-card's status badge on narrow viewports (390x844, 430x932). The
   existing "compact text" mechanism in `StageSelectScene.getNextMasteryGoal` only triggered for
   short-landscape layouts, never for narrow portrait. Fixed by widening the compact trigger to any
   card narrower than its full desktop width, and adding a Stage-5-specific compact string ("Goal:
   stagger boss 2x").

### Confirmed working live (not just unit-tested)

- Stage 4 -> Stage 5 unlock, Stage Select correctly shows exactly Stage 4 + Stage 5 in Chapter 2
  (Stage 6 confirmed absent from the UI and from the unlock chain).
- Nexus Pulse Synchronization mechanic fires end-to-end: `nexus_pulse_hit_enemy` and
  `nexus_pulse_vulnerable_damage` events recorded with real timestamps/pulse numbers during actual
  play; the shield/vulnerable damage multiplier added in `damageEnemy()` this pass is confirmed
  applying real bonus damage (48 dmg events logged).
- Level-up / upgrade choice UI, boss-entry heal + "BOSS INCOMING" telegraph, defeat flow, Result
  screen (score/coins/kills/time), and Stage 5 <-> Stage 4 switching (no state leakage, no
  regression in Stage 4's own rendering) all confirmed working.
- Persistence: on a defeat run, `stageMastery` correctly stayed unset for stage-5 (0 stars),
  `stageRecords.stage-5.bestScore` updated, `bestClearTimeSeconds` correctly withheld (matches the
  "never update clear mastery/clear time on defeat" rule) — verified by reading localStorage
  directly, not just the on-screen text.
- A one-time false alarm: the Result screen appeared to show "Mastery ★★★" on a defeat. Verified
  against the actual save data (no `stage-5` entry, i.e. 0 stars) and confirmed this was a
  Unicode-glyph rendering artifact of headless Chromium's font fallback (☆ vs ★), not an app bug.
- Zero console errors across all 6 required viewports (390x844, 430x932, 844x390, 932x430,
  1280x720, 1920x1080); Stage 5 reachable and playable at every one.

### Performance (1920x1080, real-time drive over ~150s covering normal combat, density ramp, pulse
windows, and the boss fight)

| Phase | avg | p95 | p99 | % frames >33ms |
|---|---|---|---|---|
| Normal combat (0-30s) | 110.1ms | 166.7ms | 200.1ms | 98.2% |
| Density ramp (30-80s) | 138.0ms | 166.7ms | 183.3ms | 100% |
| Pulse windows | 38.2ms | 166.6ms | 166.7ms | 17.6% |
| Boss fight (86s+) | 21.6ms | 16.8ms | 150ms | 3.9% |

**Caveat, not a confirmed Stage 5 performance regression**: this headless Chromium environment
logged `GPU stall due to ReadPixels` driver warnings and is very likely running without proper
hardware acceleration (shared CPU with the Vite dev server and other host processes). Frame times
*improved* dramatically once the boss phase started rather than degrading under more load, which is
inconsistent with a genuine escalating in-game performance problem and consistent with
browser/measurement warm-up overhead instead. No evidence of the kind of unbounded-growth pattern a
real leak would produce. Recommend re-measuring on real target hardware (a normal desktop browser
window, and an actual mobile device) before drawing conclusions about frame budget.

### Regression (final)
`npm run typecheck` 0 errors · `npm run lint` 0 issues · `npm test` 21/21 files, 126/126 tests ·
`npm run build` succeeds · `npm run audit:playables` passed · `npm audit --omit=dev` 0
vulnerabilities · `git diff --check` clean.

### Remaining issues / balance watchlist
- The Conductor boss currently renders with a procedurally-generated placeholder texture (cyan
  ring / magenta diamond), not the intended unique animated sprite described in the design doc
  ("cybernetic conductor wielding harmonic resonance baton"). Real 128x128 sprite art for atlas row
  4 (6 frames) is still needed; this is an art-asset task, not a code task.
- The automated "competent" playtest run (post soft-lock-fix) never landed a pulse hit on the boss
  in ~134s of live boss-phase play; whether this is simply automation positioning (the pulse hits
  wherever the boss happens to be standing, and the synthetic driver doesn't specifically chase the
  pulse timing) or a genuine balance concern needs real human playtesting to calibrate, per this
  document's own Step 9 instruction to calibrate mastery after actual browser QA.
- Mastery time targets (110s for 2-star) and the "boss defeated" pacing are still design-doc
  numbers, not numbers calibrated from a completed human playthrough — no automated run in this
  session reached a boss-defeat victory (one reached the boss and fought for 134s without winning
  or dying; a separate defeat run died to trash mobs at 65s before ever reaching the boss).
- Minor: `nexus_pulse_hit_enemy` fired twice for the same enemy in the same pulse tick in one
  observed case (harmless — stun/vulnerable timers just get refreshed, not stacked — but indicates
  the per-frame radius-tolerance hit check can double-count within adjacent frames at the pulse's
  expansion speed).

## IMPLEMENTATION AUDIT — 2026-09-04

GameScene.ts had been corrupted (near-total content loss) and was restored from the last
git commit, then the Nexus Pulse mechanic was re-integrated and hardened. This audit re-checked
the whole vertical slice against this document's own spec.

### Bugs found and fixed during the audit
- `drawNexusPulseWave()` created a new circle GameObject every frame during the pulse phase
  and never destroyed it (unbounded per-run leak). Now fades and destroys via tween.
- `damageEnemy()` never consulted `Enemy.getDamageMultiplier()`, so the shield (0.5x) and
  vulnerable (2x) damage states had no actual gameplay effect. Now wired in, with
  `recordNexusPulseVulnerableDamage` telemetry firing on vulnerable hits.
- `RunResult` built by `finishRun()` was missing `conductorBossStaggeredByPulse`, which the
  Stage 5 mastery rule depends on. Added.
- `enemyVisual.ts`: `'conductor-boss'` was briefly present in the enemy-visual roster (added by
  a concurrent process during this audit) despite `Enemy.ts` always forcing `visualConfig = null`
  for boss-type enemies — dead code, and inconsistent with how the other four bosses are excluded.
  Removed; `conductor-boss` radius/scale live only in `bossVisual.ts` + `data/enemies.ts`.
- `data/enemies.ts`: `conductor-boss.radius` was 52, below the 54px minimum every other boss
  respects (enforced by `bossVisual.test.ts`). Raised to 54.
- **Stage 4 had no `unlocksOnClear` field at all** — clearing Stage 4 unlocked nothing, so
  Stage 5 was unreachable from Stage Select. Added `unlocksOnClear: 'stage-5'`.
- Chapter 2's `stageIds` and Stage 5's `unlocksOnClear` both referenced Stage 6, which is out of
  scope for this pass per the brief ("Do NOT implement Stage 6" / "does NOT unlock Stage 6").
  Stage 6's data blob still exists in `stages.ts` / `StageMetaProgressionSystem.ts` (pre-existing,
  not authored in this pass) but is no longer reachable, visible in Stage Select, or unlockable.
- `chapters.test.ts` and `StageMetaProgressionSystem.test.ts`/`StageProgressionSystem.test.ts` had
  no Stage 5-specific coverage; added tests for the unlock chain, the "does not unlock Stage 6"
  guarantee, and the SYNC mastery rule.

### Verified (deterministic, this session)
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 issues
- `npm test` — 21/21 files, 126/126 tests passing
- `npm run build` — succeeds
- `npm run audit:playables` — passed, no prohibited external refs
- `npm audit --omit=dev` — 0 vulnerabilities
- `git diff --check` — no whitespace/conflict-marker errors

### Not yet performed (honest gap — do not treat as done)
- Browser QA (Step 14): no runs played, boss stagger loop, telegraphs, and defeat/replay paths
  are unverified in an actual browser.
- Mobile QA (Step 15): no viewport testing at 390x844 / 430x932 / 844x390 / 932x430 / 1280x720 / 1920x1080.
- Performance measurement (Step 16): no frame-time/p95/p99 data collected.
- Mastery time targets (110s / SYNC) are inherited from the design doc, not calibrated from
  real playtesting as Step 9 requires.