# Phaser Built-In FX Evaluation

## Version And Renderer

- Installed Phaser version: 3.90.0.
- Project renderer config: `Phaser.AUTO` in `src/game/config/gameConfig.ts`.
- Built-in FX are WebGL-only in Phaser. Runtime code now gates FX with `scene.game.renderer.type === Phaser.WEBGL`.
- Browser benchmark ran in Chrome with a WebGL-capable canvas.

## FX Evaluated

### Glow

Kept.

Glow is applied only to:

- player sprite;
- boss sprite;
- elite sprites.

It is not applied to normal enemies or projectiles because those object counts can spike during dense gameplay.

### Shadow

Kept.

Shadow is applied only to:

- player sprite;
- boss sprite.

Procedural ellipse ground glows remain the primary low-cost depth cue for enemy crowds.

### Bloom

Rejected for runtime.

Bloom was tested only on player and boss with low steps, but the combined FX pass caused a significant frame-time regression in the high-density benchmark. Bloom is not kept in source.

### Vignette

Rejected for runtime.

Camera vignette was tested for boss danger emphasis, but the full-screen post-process contributed to unacceptable frame-time cost. Boss danger remains represented by procedural arena rings, telegraphs, and color-phase escalation.

## Benchmark

Production preview, desktop 1280x720, automated movement/upgrade picks, frame samples from the final 24 seconds of a high-density run.

| Build | Estimated FPS | Avg Frame | p95 | p99 | >33ms | >50ms |
|---|---:|---:|---:|---:|---:|---:|
| Before built-in FX | 60.00 | 16.67ms | 16.80ms | 16.80ms | 0 | 0 |
| Glow + Shadow + Bloom + Vignette trial | 29.02 | 34.45ms | 50.00ms | 50.10ms | 501 | 30 |
| Final Glow + Shadow only | 59.79 | 16.72ms | 16.70ms | 16.80ms | 4 | 0 |

Benchmark artifacts were written outside source control:

- `C:\Users\jvb\AppData\Local\Temp\evolve-arena-fx-bench-before.json`
- `C:\Users\jvb\AppData\Local\Temp\evolve-arena-fx-bench-after.json`
- `C:\Users\jvb\AppData\Local\Temp\evolve-arena-fx-bench-after-reduced.json`

## Decision

Keep built-in FX as enhancement layers only:

- Glow for a small number of important energy objects.
- Shadow for primary entities only.
- No Bloom.
- No camera Vignette.

The priority remains silhouette, motion, depth, progression, and arena evolution. Built-in FX are only a small enhancement over the procedural visual pass.
