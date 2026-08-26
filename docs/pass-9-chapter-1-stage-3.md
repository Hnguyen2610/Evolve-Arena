# Pass 9 Chapter 1 and Stage 3

## Scope

Pass 9 extends the existing Stage system into a lightweight Chapter 1 progression arc and adds Stage 3 content. It does not add Chapter 2, new currencies, inventory, monetization, backend services, or external analytics.

## Chapter Architecture

- `ChapterDefinition` is a small data layer over the existing `StageDefinition` system.
- Chapter 1 (`chapter-1`) contains Stage 1, Stage 2, and Stage 3 in order.
- Saves now include `clearedChapterIds`.
- Old saves that cleared Stage 1 and Stage 2 unlock Stage 3 during normalization, but do not mark Chapter 1 complete until Stage 3 is cleared.

## Stage 3

Stage 3 (`stage-3`) is `Core Forge`, the Chapter 1 finale. It keeps the same run scale as prior stages while adding battlefield pressure through Energy Nodes.

New content:

- Energy Node: destructible objective that periodically telegraphs and fires radial projectile pulses.
- Guardian: moves toward nearby Energy Nodes and visibly shields them with partial damage reduction.
- Disruptor: keeps range and fires a short telegraphed two-shot lane.
- Forge Tyrant: Chapter 1 boss using charge, radial fire, and a capped support-node summon.

## Rewards

- Stage 1 first clear: 35 coins.
- Stage 2 first clear: 55 coins.
- Stage 3 first clear: 80 coins.
- Chapter 1 completion: 120 coins.

Rewards are granted once and are applied in the same result persistence mutation as stage/chapter progression.

## QA Focus

Browser QA should verify:

- Fresh save shows Stage 1 playable, Stage 2/3 locked.
- Stage 2 victory unlocks Stage 3.
- Stage 3 can reach the Forge Tyrant boss.
- Stage 3 victory marks Chapter 1 complete and does not duplicate rewards on replay.
- Energy Nodes clean up on boss entry, death, restart, and scene shutdown.
- Stage 1 and Stage 2 pacing remain unchanged.
