# Pass 11.2 Humanoid Player Prototype

## Goal

Pass 11.2 tests whether replacing the abstract geometric player body with a reusable humanoid sprite improves Evolve Arena's production value while preserving gameplay, collision, upgrades, VFX, and Playables constraints.

## Before

Before this pass, the player was primarily a procedural circular/energy marker: orb body, inner core, cyan glow, aura rings, and upgrade-driven orbit effects. It was readable, but it did not strongly communicate "human survivor" at gameplay scale.

## Art Direction

The prototype uses an original stylized top-down cyber-survivor: dark neutral armor, white armor plates, cyan energy visor/boots/rifle glow, small magenta accents, and a compact energy rifle. The silhouette prioritizes head, torso, legs, arms, weapon, facing, and motion over facial detail.

## Asset

| Asset | Format | Dimensions | Frames | Size |
| --- | --- | ---: | ---: | ---: |
| `public/assets/player-cyber-survivor.png` | PNG spritesheet | 576x384 | 24 | 15,688 bytes |

Each frame is 96x96. The sheet contains 4 directions with 2 idle frames and 4 run frames per direction.

## Animation

- Idle: 2-frame loop per direction at 3 FPS plus subtle breathing/bob from the existing `Player` update.
- Run: 4-frame loop per direction at 10 FPS plus restrained bob/squash while moving.
- Hurt: brief white tint, alpha dip, and squash on the humanoid sprite only.
- Facing: 4-direction movement-facing (`south`, `east`, `north`, `west`), not arbitrary 360-degree rotation.

## Physics

Gameplay collision stayed authoritative on the `Player` physics sprite. The humanoid sprite is a separate visual layer.

- Before hitbox: circle radius 18 on the player physics sprite.
- After hitbox: circle radius 18 on the same player physics sprite.
- Rendered humanoid frame: 96x96 at 0.74 scale, approximately 71x71 visual frame footprint.

## VFX Integration

Existing progression VFX were preserved:

- Aura and energy field remain below/around the humanoid.
- Glow and soft ground shadow remain.
- Armor ring, magnet ring, lifesteal cue, projectile-count orbit nodes, and upgrade evolution effects remain.
- The humanoid body sits inside the existing VFX stack rather than replacing the game's progression language.

## Responsive QA

Production preview with `VITE_PLAYTEST_MODE=true` was tested through Chrome CDP.

| Viewport | Result |
| --- | --- |
| 1280x720 | Stage 1, Stage 3, and Stage 4 gameplay captures passed visual inspection. |
| 1920x1080 | Stage 4 smoke started and sprite remained readable. |
| 390x844 | Stage 4 portrait smoke started; player readable and not hidden by HUD. |
| 430x932 | Stage 4 portrait smoke started; player readable and not hidden by HUD. |
| 844x390 | Stage 4 short-landscape smoke started; player readable and not hidden by HUD. |
| 932x430 | Stage 4 short-landscape smoke started; player readable and not hidden by HUD. |

## Performance / Bundle

Baseline Playables audit before this pass: 1,629,721 total dist bytes.

After humanoid asset:

- Total dist bytes: 1,647,256.
- Delta: +17,535 bytes.
- JS bundle: 1,630,485 bytes in the audited normal build.
- Character PNG: 15,688 bytes.

Headless production-preview frame checks after this pass:

| Scenario | Avg | P95 | P99 | >50ms |
| --- | ---: | ---: | ---: | ---: |
| Stage 1 to boss | 17.0ms | 16.8ms | 33.3ms | 0 |
| Stage 3 upgrade-heavy/boss | 16.9ms | 16.8ms | 33.3ms | 0 |
| Stage 4 overload/Grid Sentinel | 17.0ms | 16.8ms | 33.3ms | 0 |

## Before / After Scores

| Category | Before | After |
| --- | ---: | ---: |
| Player Identity | 5 | 8 |
| Silhouette Readability | 6 | 7 |
| Motion | 6 | 7 |
| Grounding | 7 | 7 |
| Combat Readability | 7 | 7 |
| Upgrade Readability | 7 | 7 |
| Mobile Readability | 7 | 7 |
| Overall Production Value | 6 | 7 |

## Style Compatibility

The humanoid player plus geometric enemies looks intentionally stylized enough for a vertical slice. The player is now clearly the hero unit, while enemies still read as abstract arena threats. The mismatch is visible, but not broken; it mostly highlights that enemy and boss art would need a later migration if the game moves toward a less abstract art direction.

## Remaining Problems

- The sprite is still lightweight prototype art, not premium hand-painted store-quality animation.
- Details are intentionally simplified; the rifle/facing reads, but facial/body detail is minimal at gameplay scale.
- The enemy roster remains geometric, so the game's art direction now sits between character-led and abstract arcade.
- No real touch-device human QA was performed.

## Recommendation

Prototype verdict: `STRONG IMPROVEMENT`.

Recommended next step: `PASS 11.3 - ENEMY & BOSS ART MIGRATION`.

Rationale: player identity clearly improved, animation reads at gameplay scale, mobile remained readable, Playables bundle impact is low, and the biggest remaining visual mismatch is now the geometric enemy/boss roster.
