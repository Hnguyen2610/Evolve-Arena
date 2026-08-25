# Automated Playtest Pass 7A.5

## Scope

This pass measured the current Pass 7A build without changing balance or visuals. Tests used production preview builds, browser automation, normal keyboard/mouse input, and existing playtest telemetry. No HP, damage, XP, enemy, boss, or clock values were manipulated.

Machine-readable run data:

- `docs/automated-playtest-7a5-runs.json`
- `docs/automated-playtest-7a5-extra-good.json`

Temporary screenshots were captured outside source control:

- `C:\Users\jvb\AppData\Local\Temp\evolve-arena-7a5-screens`

## Methodology

Completed run sample:

- Poor: 10 completed runs
- Average: 10 completed runs
- Good: 10 completed runs
- Total valid completed runs: 30
- Invalid automation startup failures excluded: 1 Chrome DevTools startup timeout

The original target was 45 runs. Runtime and browser-process stability made the minimum acceptable 30-run sample more practical for this pass.

Profiles varied movement timing, direction, pauses, upgrade choice randomness, and upgrade priority. The bots used normal input and clicked visible upgrade cards. They did not manipulate gameplay state.

## Balance Results

| Metric | Poor | Average | Good |
|---|---:|---:|---:|
| Runs | 10 | 10 | 10 |
| Win Rate | 40% | 60% | 50% |
| Boss Reach Rate | 60% | 80% | 60% |
| Boss Win Rate | 40% | 60% | 50% |
| Median Duration | 98.8s | 96.8s | 92.4s |
| Median First Level Up | 12.5s | 13.5s | 13.8s |
| Median End Level | 5 | 5 | 5 |
| Median Damage Taken | 264.2 | 269.5 | 250.8 |
| Median Victory HP | 61.2 | 115.5 | 151.6 |
| Median Boss Fight | 15.8s | 12.5s | 8.7s |

Interpretation:

- Automated evidence suggests Pass 7A removed the old extreme of consistent easy wins with roughly 200-250 HP remaining.
- Poor runs can still high-roll and win, but victory HP is much lower.
- Good runs show better victory HP and shorter boss fights when they win.
- The win-rate ordering is not monotonic: average outperformed good in this sample.

## Skill Differentiation

Classification: WEAK.

Skill differentiation is visible in victory HP and boss fight duration, but not cleanly in win rate or boss reach rate. The results suggest the current game is strongly affected by movement pathing, upgrade offers, and early damage snowball. Automated profiles are not human players, but the signal is useful: skill helps, yet build RNG and pathing variance are still large.

## Upgrade Findings

Highest offer-to-pick patterns:

- Damage: offered 29, picked 24, offer-to-pick 82.8%, win rate when picked 100%.
- Projectile Count: offered 11, picked 7, offer-to-pick 63.6%, win rate when picked 100%.
- Attack Speed: offered 32, picked 17, offer-to-pick 53.1%, win rate when picked 92.3%.

Defensive upgrades:

- Armor: offered 16, picked 5, offer-to-pick 31.3%, win rate when picked 60%.
- Max HP: offered 24, picked 4, offer-to-pick 16.7%, win rate when picked 25%.
- Lifesteal: offered 14, picked 1, offer-to-pick 7.1%, win rate when picked 0%.

Patterns:

- Offensive upgrades dominate winning automation runs.
- Defensive upgrades do not appear to create the previous near-invulnerability problem.
- Lifesteal no longer looks dominant in this sample.
- Damage and Projectile Count may be too mandatory, but this is correlation, not proof of causation.

## Replay Stability

Target was 15 sequential replay transitions if practical. A first automation attempt stalled after one transition due the automation not re-clicking Play Again reliably. A corrected replay stress completed 5 sequential runs:

- Completed: 5 runs
- Replay count reached: 4
- Run IDs progressed from `run-1` to `run-5`
- Results: 3 victories, 2 defeats
- No runtime exceptions observed
- No duplicated telemetry pattern observed
- No stale score/HP/runId observed in telemetry
- CDP heap samples varied from about 9.6 MB to 31.1 MB JS heap used; this is not enough to prove memory stability, but no obvious runaway object/state duplication appeared in the 5-run chain.

## Visual Audit Scores

| Category | Score |
|---|---:|
| First Impression | 7 |
| Depth | 5 |
| Motion | 5 |
| Combat Impact | 6 |
| Enemy Variety | 6 |
| Player Identity | 5 |
| Progression Visualization | 3 |
| Arena Evolution | 3 |
| Boss Spectacle | 6 |
| Mobile Presentation | 6 |
| Overall Visual Interest | 5 |

## Visual Evidence

Menu:

- The title, Play button, typography, and upgrade panels feel coherent.
- The background is visually clean but static: grid, large circles, and faint arcs.
- First impression is much better than prototype, but not yet premium.

Gameplay timeline:

- At 10s, 30s, 60s, and 80s the arena background is almost unchanged.
- The player silhouette barely changes despite leveling and selecting upgrades.
- Most time progression is communicated by HUD numbers and enemy count, not by visual escalation.
- If HUD were removed, 30s, 60s, and 80s screenshots would be hard to distinguish except for enemy density.

Boss:

- Apex Core has the strongest visual identity because of scale, yellow contrast, ring, and boss HP bar.
- Boss entrance is readable.
- The arena itself does not visibly react enough to the boss phase.
- Boss spectacle is good in isolated screenshots but not sustained by environment transformation.

Mobile:

- Portrait upgrade cards are readable and visually strong.
- Landscape level-up fits, but it occupies nearly all visual space.
- Mobile gameplay preserves clarity, but the same flatness and static background issues remain.

## Why It May Feel Too 2D

The feedback likely means "flat / static / icon-like", not literally "must be 3D".

Concrete causes:

- Weak depth separation: background, enemies, XP, projectiles, and player mostly sit on one perceived plane.
- Static arena: grid and rings do not evolve over time.
- Limited player evolution: upgrades change stats more than appearance.
- Flat procedural sprites: enemies are distinguishable, but many read as colored symbols at gameplay scale.
- Limited environmental motion: the arena does not pulse, parallax, tilt, brighten, or react to run intensity.
- Sparse foreground effects: no persistent depth cues like drifting particles, shadows, or screen-space layering.
- Escalation is numerical/object-density driven, not visual-state driven.

## Highest-Value Visual Improvements

HIGH VALUE / LOW COST:

- Add upgrade-driven player aura/projectile visual tiers.
- Add subtle entity ground glows/shadows to improve layering.
- Add run-time arena intensity pulses at 30s, 60s, 80s, and boss.
- Add stronger spawn/death variation without increasing object count too much.
- Add boss-phase arena tint/pulse and warning-state background reaction.

HIGH VALUE / MEDIUM COST:

- Add layered parallax background bands or foreground particles.
- Add pseudo-3D squash/tilt/scale animation for player, enemies, and boss.
- Add stronger elite/boss scale and silhouette animation.
- Add hit-stop or short impact freeze on crits/boss hits.
- Add visual build identity for major upgrade families.

LOW PRIORITY:

- Full 3D rewrite.
- Large external sprite packs.
- Heavy post-processing/shader framework.
- New maps/stages before visual depth of the core arena is improved.

## 2D / 2.5D / 3D Recommendation

KEEP 2D - improve depth and motion.

The current Phaser architecture, short-run format, bundle constraints, and mobile/Playables target do not justify a 3D rewrite. The problem is perceived production value, not dimensionality itself. A focused 2D/2.5D-style pass can address the user feedback more cheaply and safely.

## Performance

No reliable FPS measurement was collected. Browser runs and 5-run replay stress did not show fatal degradation, crashes, or obvious telemetry duplication. JS heap samples during replay ranged roughly from 9.6 MB to 31.1 MB used; treat this as a rough smoke signal only.

## Playables Regression

Validated by build/audit and playtest-mode browser usage:

- `firstFrameReady`/`gameReady`: no startup regression observed during browser runs.
- Telemetry export: available only in playtest mode.
- No external telemetry provider added.
- Playables audit found no prohibited external URLs.
- Replay telemetry increments run IDs and replay count.

## Remaining Balance Risks

- Good automated profile did not clearly outperform average by win rate.
- Damage, Attack Speed, and Projectile Count look disproportionately correlated with wins.
- Early bad upgrade paths can die before boss even with average/good movement.
- Boss pressure is meaningful, but victory still depends heavily on offense high-rolls.
- Human touch-control data is still required before a real balance pass.

## Recommendation

Primary next pass: PASS 7A.6 - VISUAL DEPTH & GAME FEEL POLISH.

Reason:

- Mechanics are good enough for limited testing but not perfectly data-balanced.
- The most actionable current human feedback is visual: boring/simple/too flat.
- Automated balance data is mixed, but not severe enough to justify immediate retuning before addressing visual interest.

After visual depth improvements, run limited external human playtest, then use real telemetry for Pass 7B data-driven balance.
