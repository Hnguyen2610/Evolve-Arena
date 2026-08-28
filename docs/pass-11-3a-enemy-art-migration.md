# Pass 11.3A Enemy Art Migration

## Goal

Pass 11.3A migrates current non-boss enemies from primitive geometric bodies to a shared sprite-based sci-fi enemy roster. The goal is to reduce the mismatch introduced by the humanoid player prototype while preserving gameplay, collisions, balance, stage logic, and Playables compatibility.

## Art Direction

The new roster follows the Pass 11.2 player style: compact top-down forms, dark armor/materials, strong silhouettes, restrained neon accents, and lightweight looping animation. Roles are separated by body shape first, then color: humanoid raiders, fast creatures, heavy machines, drones, shield units, rail units, planted anchors, and objective pylons.

## Enemy Roster

| Enemy | Gameplay Role | Visual Concept | Silhouette |
| --- | --- | --- | --- |
| Basic | Common baseline pressure | Corrupted light arena trooper | Medium humanoid with short weapon arm |
| Runner | Fast melee pressure | Lean cyber hunter creature | Forward-leaning narrow body with long limbs |
| Tank | Slow durable threat | Heavy armored brute machine | Wide shoulders and thick core |
| Ranged | Ranged pressure | Rifle gunner unit | Medium body with projecting weapon |
| Swarm | Numerous small unit | Compact skitter drone | Small core with four bright legs |
| Orbiter | Stage 2 positioning pressure | Floating ring drone | Round ring body with orbit pods |
| Pulse Caster | Stage 2 pulse pressure | Floating caster core | Bright circular caster shell and core |
| Guardian | Stage 3 node protector | Shield sentinel | Wide body with side shield plates |
| Disruptor | Stage 3 lane pressure | Railgun specialist | Narrow unit with long barrel |
| Anchor | Stage 4 overload pressure | Stabilizer machine | Low body with four stabilizer legs |
| Interceptor | Stage 4 dash pressure | Blade sprinter machine | Aggressive directional blade form |
| Energy Node | Stage objective | Anchored energy pylon | Gold ring and vertical crystal core |

## Assets

| Enemy | Asset | Dimensions | Frames | File Size |
| --- | --- | ---: | ---: | ---: |
| Basic | `public/assets/enemy-characters.png` row 0 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Runner | `public/assets/enemy-characters.png` row 1 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Tank | `public/assets/enemy-characters.png` row 2 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Ranged | `public/assets/enemy-characters.png` row 3 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Swarm | `public/assets/enemy-characters.png` row 4 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Orbiter | `public/assets/enemy-characters.png` row 5 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Pulse Caster | `public/assets/enemy-characters.png` row 6 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Guardian | `public/assets/enemy-characters.png` row 7 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Disruptor | `public/assets/enemy-characters.png` row 8 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Anchor | `public/assets/enemy-characters.png` row 9 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Interceptor | `public/assets/enemy-characters.png` row 10 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |
| Energy Node | `public/assets/enemy-characters.png` row 11 | 320x960 atlas, 80x80 frames | 4 | 9,559 bytes total atlas |

## Architecture

Enemy gameplay remains authoritative in `Enemy`, Arcade physics, `EnemyRuntimeData`, and enemy definitions. The new sprite is a separate presentation child created only when the non-boss visual atlas exists. The hidden physics sprite still owns collision, movement, hit radius, body state, AI, and pooling behavior. The visual sprite mirrors position, facing, scale pulse, hit feedback, and active/visible state.

Enemy visual configuration lives in `src/game/config/enemyVisual.ts`. Adding a future non-boss enemy now requires a gameplay definition plus a visual config/atlas row, without duplicating entity rendering logic.

## Gameplay Lock

No intentional changes were made to enemy HP, speed, damage, AI, spawn timing, collision radii, XP, rewards, stages, bosses, player stats, progression, or balance. `GameScene` now calls `enemy.showHitFeedback()` so the sprite body flashes instead of tweening the hidden physics body.

## Stage 1 QA

Chrome headless production preview captured Stage 1 at 64.7s, level 4, 36 kills, and 41.47 damage taken. Basic, Ranged, and Tank are more readable than the geometric baseline; Runner still reads mostly through movement plus lean silhouette; Swarm remains small and does not dominate projectile readability.

## Stage 2 QA

Stage 2 was captured at 72.9s, level 4, 42 kills, and 69.64 damage taken. Orbiter and Pulse Caster remain readable against the rift background. Existing projectile/charge cues remained stronger than sprite detail.

## Stage 3 QA

Stage 3 was captured at 66.0s, level 4, 32 kills, and 10.32 damage taken. Guardian reads as a defensive unit next to the node, Disruptor keeps a clear long-weapon silhouette, and the node link/priority text remained readable.

## Stage 4 QA

Stage 4 was captured at 72.2s during overload with level 4, 39 kills, 76.37 damage taken, and 3 overload events. Anchor and Interceptor silhouettes were visible without overpowering safe/danger sector telegraphs. A second Stage 4 capture reached boss warning at 84.2s with 46 kills and 125.35 damage taken.

## Responsive QA

Screenshots were captured and visually inspected from a production preview. Temporary screenshots were not committed to source.

| Viewport | Scenario | Result |
| --- | --- | --- |
| 1280x720 | Stage 1-4 late-wave and Stage 4 boss warning | Passed visual inspection |
| 1920x1080 | Stage 4 overload at 38.8s | Sprite readable; headless frame pacing was slower |
| 390x844 | Stage 4 overload at 38.9s | Player and projectile readability preserved |
| 430x932 | Stage 4 overload at 38.0s | Enemy scale acceptable; no HUD obstruction observed |
| 844x390 | Stage 4 overload at 38.0s | Landscape telegraphs remained readable |
| 932x430 | Stage 4 overload at 38.6s | Landscape telegraphs remained readable |

## Before / After Scores

| Category | Before | After |
| --- | ---: | ---: |
| Enemy Identity | 4 | 7 |
| Role Readability | 6 | 7 |
| Silhouette Variety | 5 | 7 |
| Motion | 6 | 7 |
| Combat Readability | 8 | 8 |
| Player Separation | 8 | 8 |
| Stage Cohesion | 7 | 8 |
| Mobile Readability | 7 | 8 |
| Overall Production Value | 7 | 7.8 |

## Bundle

Pass 11.2 baseline Playables audit total: 1,647,256 bytes. Pass 11.3A audited total after enemy atlas and integration code: 1,660,870 bytes. Delta: +13,614 bytes. Total non-boss enemy character art size: 9,559 bytes.

## Performance

Actual Chrome headless production-preview measurements after the final art scale pass:

| Scenario | Avg | P95 | P99 | >33ms | >50ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stage 1 dense wave, 1280x720, 64.7s | 16.8ms | 16.8ms | 16.8ms | 23 | 0 |
| Stage 2 mixed wave, 1280x720, 72.9s | 16.7ms | 16.8ms | 16.8ms | 9 | 0 |
| Stage 3 Guardian/Disruptor, 1280x720, 66.0s | 16.8ms | 16.8ms | 16.8ms | 30 | 0 |
| Stage 4 overload, 1280x720, 72.2s | 17.0ms | 16.8ms | 33.3ms | 78 | 0 |
| Stage 4 boss warning, 1280x720, 84.2s | 16.8ms | 16.8ms | 16.8ms | 26 | 0 |
| Stage 4 overload, 1920x1080, 38.8s | 25.4ms | 33.4ms | 33.4ms | 795 | 1 |
| Stage 4 overload, 390x844, 38.9s | 16.7ms | 16.7ms | 16.8ms | 0 | 0 |
| Stage 4 overload, 430x932, 38.0s | 16.7ms | 16.7ms | 16.8ms | 0 | 0 |
| Stage 4 overload, 844x390, 38.0s | 16.7ms | 16.8ms | 16.8ms | 0 | 0 |
| Stage 4 overload, 932x430, 38.6s | 16.7ms | 16.7ms | 16.8ms | 0 | 0 |

The 1920x1080 result appears tied to headless Chrome frame pacing at the larger surface; mobile and 1280x720 captures remained stable.

## Boss Mismatch

Bosses intentionally remain geometric in this pass. Against the sprite player and sprite enemy roster, the four bosses now read as the primary remaining placeholder mismatch. Their attack telegraphs remain readable, but Pass 11.3B should give Apex Core, Prism Warden, Forge Tyrant, and Grid Sentinel distinct boss-scale character/machine identities.

## Remaining Art Issues

- Basic and Ranged are improved but still relatively simple compared with the player sprite.
- Runner is readable mostly by lean and speed; it could use a stronger creature head/claw treatment in a later art revision.
- Interceptor and Anchor are clearly machine-like, but still closer to symbolic top-down icons than premium illustrated enemies.
- Boss mismatch is now more noticeable because regular enemies no longer use the old geometric bodies.
