# Pass 10.1.1 Offensive Power Curve

## Problem

Pass 10.1 reduced permanent Damage from `+6%` per level to `+4%` per level and showed improved High-progression Stage 3 boss fights. Remaining fast wins were tied to in-run offense high-rolls, especially Extra Shot combined with Damage or Attack Speed.

This pass investigates in-run offensive scaling only. Permanent Damage, Health, Speed, base HP, base armor, boss entry recovery, enemy damage, boss HP, stage content, mastery thresholds, and progression rewards were not retuned.

## Current Formulas

Source authority:

- `src/game/config/balance.ts`
- `src/game/data/upgrades.ts`
- `src/game/scenes/GameScene.ts`

Base player offense:

| Stat | Value |
| --- | ---: |
| Base projectile damage | 24 |
| Base fire rate | 1.5 attacks/s |
| Base projectile count | 1 |
| Base projectile spread | 12 degrees |
| Base critical chance | 6% |
| Base critical damage | 1.8x |
| Permanent Damage | `baseDamage * (1 + damageLevel * 0.04)` |

In-run upgrades:

| Upgrade | Current formula |
| --- | --- |
| Damage | `stats.damage *= 1.18` |
| Attack Speed | `stats.attackSpeed *= 1.14` |
| Extra Shot | `stats.projectileCount += 1` |

Before this pass, every player projectile in a volley used full `stats.damage`, rolled critical independently, had its own pierce hit tracking, and healed through Lifesteal independently. Because boss hitboxes are large and target selection prioritizes the active boss, Extra Shot could behave like a near-direct single-target DPS multiplier when multiple spread projectiles connected.

## Theoretical DPS

Simplified nominal DPS:

```text
damage per projectile * attacks per second * projectile count * expected hit efficiency
```

This model excludes player movement, target switching, pierce, overkill, Energy Nodes, and missed spread shots. It is useful for ranking multipliers, not for predicting exact clear time.

Before tuning, Extra Shot had linear nominal single-target scaling if all projectiles hit:

| Projectile count | Nominal volley damage |
| ---: | ---: |
| 1 | 1.00x |
| 2 | 2.00x |
| 3 | 3.00x |
| 4 | 4.00x |
| 5 | 5.00x |

Representative multiplier comparison before tuning:

| Build | Relative nominal DPS |
| --- | ---: |
| Base | 1.00x |
| Damage 1 | 1.18x |
| Damage 2 | 1.39x |
| Damage 3 | 1.64x |
| Attack Speed 1 | 1.14x |
| Attack Speed 2 | 1.30x |
| Attack Speed 3 | 1.48x |
| Extra Shot 1, if both hit | 2.00x |
| Extra Shot 2, if all hit | 3.00x |
| Extra Shot 3, if all hit | 4.00x |
| Damage 2 + Attack Speed 2 + Extra Shot 1 | 3.62x |
| Damage 3 + Attack Speed 3 + Extra Shot 3 | 9.74x |

Projectile Count was therefore the dominant single upgrade family in theory. Attack Speed and Damage were healthy alone but multiplied the Projectile Count spike.

## Boss Hit Efficiency

Browser baseline data supported the theoretical concern. In Stage 3 MID runs, sub-13s Forge Tyrant fights were concentrated in runs that actually selected Extra Shot:

| Profile | Seed | Picked offense | Boss fight |
| --- | ---: | --- | ---: |
| Damage | 5101 | critical-damage, damage, projectile-count, piercing | 9.1s |
| Attack Speed + Projectile | 5101 | projectile-size, projectile-size, projectile-count | 10.5s |
| Attack Speed + Projectile | 5102 | projectile-speed, projectile-count, projectile-size | 12.2s |
| Full Offense | 5101 | projectile-size, damage, projectile-count, damage | 9.0s |

Comparable runs without Extra Shot were usually slower:

| Profile | Seed | Picked offense | Boss fight |
| --- | ---: | --- | ---: |
| Balanced | 5101 | attack-speed, attack-speed, critical-chance | 19.3s |
| Balanced | 5102 | attack-speed, magnet, critical-chance, piercing | 19.2s |
| Attack Speed | 5102 | attack-speed, projectile-speed, projectile-speed | 22.5s |
| Damage + Attack Speed | 5101 | damage, damage, attack-speed, attack-speed | 15.9s |
| Damage + Attack Speed | 5102 | damage, critical-chance, damage, attack-speed | 12.7s |

One Attack Speed-heavy run timed out at 139.7s with the boss still alive, despite reaching the boss at 84.0s. That run selected only one Attack Speed plus critical/projectile-size support. This indicates Attack Speed alone was not the dominant collapse source in this sample.

## Lifesteal Interaction

Lifesteal was not picked in the valid high-roll samples above, so this pass did not retune Lifesteal. Source review still shows offensive scaling amplifies Lifesteal throughput because healing is based on final damage dealt per projectile hit. Reducing Extra Shot single-target damage also indirectly reduces worst-case Lifesteal boss sustain without changing Lifesteal's own value.

## Hypotheses

Before tuning:

1. H1 - Extra projectiles deal full single-target damage and cause excessive boss scaling. Confidence: HIGH.
2. H2 - Attack Speed is healthy alone but multiplies Extra Shot too strongly. Confidence: MEDIUM.
3. H3 - Damage remains attractive but is not the primary source by itself. Confidence: LOW to MEDIUM.

## Balance Changes

Only one offensive tuning change was made.

| Area | Before | After | Rationale |
| --- | ---: | ---: | --- |
| Extra Shot projectile visuals | Adds real projectiles | Adds real projectiles | Preserve player expectation and visual power. |
| 2-projectile volley effective damage | 2.00x | 1.62x | Keep first Extra Shot exciting without near-doubling boss DPS. |
| 3-projectile volley effective damage | 3.00x | 2.116x | Preserve crowd coverage while reducing boss collapse. |
| 4-projectile volley effective damage | 4.00x | 2.5128x | Apply diminishing single-target value. |
| 5-projectile volley effective damage | 5.00x | 2.83024x | Cap high-roll runaway without hiding projectiles. |

Implementation:

```text
effectiveCount = 1 + 0.62 + 0.62*0.8 + 0.62*0.8^2 ...
perProjectileDamageScale = effectiveCount / projectileCount
```

Critical hits remain explicit projectile data, so critical visuals and damage labels still work after per-projectile damage scaling. No Attack Speed or Damage values were changed.

## Post-Change Results

Method:

- Production preview with `VITE_PLAYTEST_MODE=true`.
- Chrome CDP browser automation.
- Keyboard/mouse input only.
- No direct stat cheats, forced upgrades, forced boss spawns, time scaling, damage injection, invincibility, or enemy kills.
- Upgrade choices were selected only from normally offered Upgrade UI cards.
- Same movement bot and paired seeds where practical.

Primary paired Stage 3 MID comparison:

| Profile | Seed | Victory | Duration | Boss fight | Damage taken | HP/max | Nodes destroyed / pressure | Picks |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Balanced | 5101 | true | 94.9s | 10.9s | 114.5 | 186.9/260 | 3 / 6 | projectile-count, projectile-speed, projectile-count, critical-chance |
| Balanced | 5102 | true | 100.2s | 16.2s | 266.4 | 63.6/260 | 3 / 4 | attack-speed, attack-speed, critical-chance, critical-chance |
| Projectile-heavy | 5101 | true | 103.9s | 19.9s | 218.1 | 111.9/260 | 2 / 2 | magnet, damage, projectile-speed, projectile-speed |
| Projectile-heavy | 5102 | true | 102.6s | 18.6s | 175.7 | 141.1/260 | 4 / 2 | piercing, piercing, damage, magnet |
| Full offense | 5101 | true | 105.5s | 21.5s | 221.3 | 106.2/260 | 4 / 4 | projectile-speed, critical-chance, projectile-size |
| Full offense | 5102 | true | 95.5s | 11.5s | 129.4 | 176.9/260 | 1 / 0 | damage, projectile-count, attack-speed |

Additional high-roll check:

| Stage | Tier | Profile | Seed | Victory | Duration | Boss fight | Picks |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| Stage 3 | Mid | Full offense | 5103 | true | 97.3s | 13.3s | projectile-size, attack-speed, projectile-count, critical-chance |

The important post-change high-roll result is that `damage + projectile-count + attack-speed` remained strong at 11.5s, but did not produce a sub-8s or near-instant Forge Tyrant kill. Runs with two Extra Shot picks still felt powerful at 10.9s, while the boss and Energy Node pressure remained visible.

## Fresh Regression

| Stage | Tier | Profile | Seed | Victory | Duration | First level-up | Boss fight | Damage taken | HP/max | Picks |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Stage 1 | Fresh | Balanced | 6101 | true | 94.3s | 13.5s | 9.3s | 155.9 | 174.1/240 | projectile-count, critical-chance, attack-speed, damage |
| Stage 3 | Fresh | Balanced | 6103 | true | 109.0s | 16.1s | 25.0s | 206.3 | 109.4/268 | damage, critical-damage, max-hp |

Fresh Stage 1 remained fast and killable with a good offense roll. Fresh Stage 3 remained winnable, but its 25.0s boss fight shows that the change did not over-buff Fresh offense or erase late-stage pressure.

## High Progression Regression

| Stage | Tier | Profile | Seed | Victory | Duration | Boss fight | Damage taken | HP/max | Picks |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Stage 3 | High | Balanced | 7103 | true | 97.2s | 13.2s | 83.8 | 222.3/280 | critical-chance, magnet, damage, damage |
| Stage 3 | High | Full offense | 7104 | true | 99.5s | 15.5s | 159.0 | 153.5/280 | piercing, projectile-size, attack-speed, attack-speed |

High accounts still feel stronger and clear Stage 3 quickly, but the sampled fights did not bypass all mechanics.

## Stage 1 / Stage 2 Regression

| Stage | Tier | Profile | Seed | Victory | Duration | Boss fight | Damage taken | HP/max | Picks |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Stage 1 | Mid | Balanced | 8101 | false | 99.4s | n/a | 406.4 | 0/316 | max-hp, critical-chance, max-hp, projectile-count |
| Stage 1 | Mid | Full offense | 8103 | true | 96.3s | 11.3s | 273.4 | 76.6/260 | critical-chance, projectile-count, projectile-speed, damage |
| Stage 2 | Mid | Balanced | 8102 | true | 98.0s | 16.0s | 235.8 | 104.2/260 | piercing, critical-chance, attack-speed |
| Stage 2 | Mid | Full offense | 8104 | true | 101.3s | 19.3s | 168.1 | 158.1/260 | critical-chance, projectile-speed, piercing |

The Stage 1 balanced defeat was a low-offense/defensive RNG sample and does not by itself indicate the Projectile Count change made early bosses too durable. The offense-friendly Stage 1 and both Stage 2 smokes cleared normally.

## Mastery Regression

Mastery thresholds were not changed.

Observed achievable clears after tuning:

- Stage 1 Fresh: 94.3s, damage 155.9, victory.
- Stage 1 Mid full offense: 96.3s, victory.
- Stage 2 Mid balanced: 98.0s, victory.
- Stage 3 Mid full offense: 95.5s and 97.3s, victories.
- Stage 3 High balanced: 97.2s, victory.

Stage 3 three-star still depends on Node behavior. The samples included Stage 3 runs with at least 3 Nodes destroyed and low pressure, but not every build satisfied that objective. This is acceptable for mastery replay goals.

## Performance

High-offense browser frame samples were gathered from production preview in the same automation environment. These are useful for regression comparison, not device-level FPS claims.

| Run | Avg frame | p95 | p99 | >33ms | >50ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stage 3 MID Full offense seed 5102 | 17.1ms | 16.8ms | 33.4ms | 258 | 0 |
| Stage 3 MID Full offense seed 5103 | 17.5ms | 33.2ms | 33.4ms | 453 | 0 |
| Stage 1 MID Full offense seed 8103 | 17.7ms | 33.3ms | 33.4ms | 321 | 6 |
| Stage 2 MID Full offense seed 8104 | 22.6ms | 33.4ms | 50.0ms | 2978 | 40 |

No crash or runaway projectile/object failure was observed. Some frame samples were noisy in headless Chrome, especially the Stage 2 run, but there was no persistent >50ms collapse in the primary Stage 3 high-offense samples.

## Validation

Baseline before tuning:

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test -- --run`: pass, 90 tests
- `npm run build`: pass
- `npm run audit:playables`: pass
- `npm audit --omit=dev`: pass, 0 vulnerabilities

Targeted checks after implementation:

- `npm run typecheck`: pass
- `npm test -- --run src/game/config/balance.test.ts`: pass, 8 tests
- `npm run lint`: pass
- Playtest-mode production build: pass

Final validation is recorded in the assistant final report for this pass.

## Remaining Unknowns

- The automation bot is not a human touch player.
- Upgrade RNG can prevent a named profile from receiving its intended upgrades; runs are analyzed by actual picks, not just profile label.
- The Stage 1 MID balanced defeat should be watched in human playtests, but the follow-up offense smoke cleared normally.
- The exact Extra Shot coefficients may need human feel tuning after external playtest feedback.
