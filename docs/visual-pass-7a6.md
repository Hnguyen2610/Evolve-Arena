# Visual Pass 7A.6

## Visual Problems

Pass 7A.5 found that the 10s, 30s, 60s, and 80s gameplay frames looked too similar without the HUD. The main weaknesses were static arena presentation, weak perceived depth, limited player evolution, flat entity motion, and boss spectacle that did not fully carry into the arena.

## Changes

- Added upgrade-driven player evolution visuals in `Player`:
  - total upgrade levels increase aura size, glow intensity, and energy field scale;
  - offensive upgrades increase pulse cadence and brightness;
  - projectile-count and total upgrade growth create orbiting energy nodes;
  - armor, magnet, and lifesteal levels enable family-specific rings.
- Added entity grounding:
  - player and enemies now have sci-fi ground glows/shadows;
  - elite and boss overlays hide correctly when entities are disabled/destroyed.
- Added arena evolution:
  - 0-30s remains calm and cyan;
  - 30-60s adds green energy scan activity and phase pulse;
  - 60s-boss adds red/pink volatile rings, cracks, and extra foreground particles;
  - boss phase shifts the arena to yellow/red warning energy around Apex Core.
- Added lightweight motion richness:
  - player gets subtle squash/lean/pulse while moving;
  - enemy behavior types use different visual rhythm;
  - boss glow/ring becomes more unstable at lower HP.
- Improved combat feel:
  - projectile trails scale visually with projectile power/size;
  - hits can create small impact flashes;
  - enemy death burst color/count varies by enemy type;
  - lifesteal creates a restrained return-energy cue when active.
- Improved boss event quality:
  - boss warning triggers an arena shockwave;
  - materialization adds layered rings;
  - charge/radial wind-ups add clearer local energy;
  - boss defeat now has overload rings and layered spark bursts.
- Added subtle ambient motion to Menu and Result backdrops to better match gameplay energy.

## Performance Considerations

The arena phase overlay uses two persistent `Graphics` objects that are cleared and redrawn each frame instead of creating new geometry continuously. Foreground particles are deterministic dots drawn into a graphics layer. Extra spawned spark objects are cooldown-limited by phase and self-destroy through tweens.

Combat VFX are short-lived and restrained. Normal hits only create a small flash probabilistically; major hits, elites, and boss events receive stronger effects. No external assets, shader framework, network request, or new dependency was added.

## Before / After Audit

| Category | Before | After |
|---|---:|---:|
| First Impression | 7 | 8 |
| Depth | 5 | 7 |
| Motion | 5 | 7 |
| Combat Impact | 6 | 7 |
| Enemy Variety | 6 | 7 |
| Player Identity | 5 | 7 |
| Progression Visualization | 3 | 6 |
| Arena Evolution | 3 | 7 |
| Boss Spectacle | 6 | 8 |
| Mobile Presentation | 6 | 7 |
| Overall Visual Interest | 5 | 7 |

## Screenshot Evidence

Screenshots were captured outside source control under:

`C:\Users\jvb\AppData\Local\Temp\evolve-arena-7a6-final`

Observed final frames:

- Desktop 1280x720: menu, 10s, 30s, 60s, 80s, level-up, boss entrance, boss fight, result.
- Portrait 390x844: menu, gameplay, evolved player, level-up, boss, result.
- Landscape 844x390: menu, gameplay, evolved player, boss, result, level-up.
- Smoke viewports: 430x932 and 932x430 gameplay.

Timeline readability is now acceptable: 10s, 60s, 80s, and boss frames can be roughly ordered without relying on HUD because arena color/intensity and boss-phase rings now escalate. Player evolution readability is acceptable but still limited by upgrade RNG and procedural icon-scale art.

## Remaining Limitations

- The game remains procedural geometric 2D art. It is richer and more alive, but not premium character-art production.
- Player evolution is readable at mid/advanced upgrade counts, but individual build identities are still subtle during chaotic mobile play.
- Automated screenshots can place the player near the viewport edge because the bot drives into world bounds; human movement may frame the player more naturally.
- No real human mobile touch playtest was performed in this pass.
- Balance was intentionally not retuned. Existing Pass 7A.5 skill differentiation remains a separate issue.

## Recommendation

Next step: LIMITED HUMAN VISUAL PLAYTEST.

The visual pass improved the main 7A.5 weakness enough to stop doing speculative visual-only passes for now. A small human review should decide whether procedural 2D is acceptable or whether paid/custom art investment is warranted.
