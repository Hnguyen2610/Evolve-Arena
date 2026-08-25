# Balance Pass 7A

## Baseline

Original source values before this pass:

- Base player HP: 260
- Base armor: 4
- Movement speed: 255
- Player damage / attack speed: 24 / 1.58
- XP curve: base 54, growth 1.42
- Boss spawn: 85s
- Contact cooldown: 650ms
- Ranged cooldown: 1800ms
- Boss charge cooldown: 5200ms
- Boss radial cooldown: 7300ms
- Enemy damage: basic 5, runner 5, tank 10, ranged 6, swarm 3
- Boss HP / damage: 650 / 10
- Boss radial projectile: 12 shots, 245 speed, 0.72x boss damage
- Original boss entrance recovery: full heal to max HP
- Defensive upgrades: Max HP +28 and heal, Armor +3, Lifesteal +0.018

With base armor 4, representative effective damage was:

- Basic / runner contact: 1
- Tank contact: 6
- Ranged projectile: 2
- Swarm contact: 1
- Boss contact: 6
- Boss radial projectile: 3.2

## Changes

- Base HP: 260 -> 250
  - Slightly lowers mistake budget without punishing onboarding.
- Boss entrance recovery: full heal -> +110 HP, capped at max HP
  - Preserves a readable boss transition but no longer erases all 0-85s mistakes.
- Boss damage: 10 -> 12
  - Makes boss contact and radial pressure matter more.
- Boss charge damage: same as contact -> 1.45x boss damage
  - Charge is telegraphed, so eating it should be meaningfully worse than minor contact.
- Max HP upgrade: +28 -> +24
  - Keeps the defensive pick attractive but lowers total tank stacking.
- Armor upgrade: +3 -> +2
  - Reduces flat-reduction snowballing against small enemy hits.
- Lifesteal upgrade: +0.018 -> +0.014
  - Keeps sustain viable while reducing nonlinear scaling with projectile and AoE builds.

Final representative effective damage with base armor 4:

- Basic / runner contact: 1
- Tank contact: 6
- Ranged projectile: 2
- Swarm contact: 1
- Boss contact: 8
- Boss charge contact: 13.4
- Boss radial projectile: 4.64

## QA

Baseline controlled browser QA before tuning:

- Poor movement / still: defeat at 83.0s, level 4, damage taken 265.2, boss not reached.
- Better movement / circle: victory at 96.3s, level 5, boss fight 11.3s, damage taken 281.0, HP remaining 175.0.
- Prior Pass 6 automated runs were all victories with approximately 220, 248, and 202 HP remaining.

Iteration notes:

- Iteration 1: HP 220, armor 1, boss heal +40.
  - Too harsh. Better movement died at 59.1s before boss.
- Iteration 2: HP 240, armor 2, boss heal +70.
  - Still too harsh. Better movement died at 53.9s before boss.
- Iteration 3: HP 250, armor 3, boss heal +70.
  - Still over-pressured late pre-boss. Better movement died around 81-84s.
- Iteration 4: HP 250, armor 4, boss heal +110, defensive upgrade reductions, boss damage/charge tuning.
  - Poor movement after boss tuning: defeat at 68.2s in one run with weak/no-movement behavior.
  - Better movement after final tuning: victory at 108.0s, level 5, boss reached 85.0s, boss fight 23.0s, damage taken 255.4, HP remaining 104.6.

The final controlled QA no longer reproduces the old pattern of easy wins with roughly 200-250 HP remaining. Automation is not human playtest data.

## Known Unknowns

- True human win rate and early churn.
- Touch-control difficulty versus keyboard movement.
- Whether defensive builds remain attractive enough across many upgrade RNG paths.
- Lifesteal performance in high-roll projectile-count / piercing / AoE builds.
- Boss fairness for new players who do not yet understand charge and radial telegraphs.
