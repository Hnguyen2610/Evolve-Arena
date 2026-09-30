# Pass 14 - RESPONSIVE 2.5D FRAMING & STAGE SELECT LAYOUT FIXES - Completion Summary

## Overview
This pass responded to a real playtest report (screenshots from a live, non-fullscreen Firefox
window) showing two concrete visual defects: a large, disproportionate black dead-zone below the
arena during gameplay, and the Stage Select subtitle text overlapping the first stage card. Both
were reproduced, root-caused with pixel-level evidence (not guesswork), fixed, and re-verified.

## Completed Tasks

### 1. Root-Caused the Black Dead-Zone Below the Arena
- Reproduced the report across multiple desktop window sizes (1920x1080, 1280x720, 1600x900,
  1911x943) using the same automated flow at each size.
- Ruled out canvas/DOM sizing as the cause: `canvas.width/height` matched `window.innerWidth/Height`
  exactly in every case.
- Sampled actual pixel RGB values down a vertical strip at each size instead of relying on visual
  impression. This showed the defect wasn't unique to any one window size — it was present at every
  size tested, just far more dominant (15-25% of the frame) at some sizes than others (a thin sliver
  at 1920x1080), which is why it read as "some sizes are broken, others aren't."
- Found the actual cause: the 2.5D vertical compression (`WorldPresentation.verticalCompression`)
  pulls the platform's *visual* footprint toward the horizon (projected center ≈ world Y 720), but
  the camera follows the player's *raw* gameplay Y (starts at 800, world center). That constant
  ~80-unit mismatch meant the camera was never actually centered on the platform, leaving far more
  empty space below it than above — at one reproduced size the imbalance measured 188.5px below vs
  28.5px above (6.6x), which is exactly what the report described ("more empty space below than
  above").

### 2. Fixed the Camera Framing
- Derived a `CAMERA_FOLLOW_OFFSET_Y` in `GameScene.ts` directly from `WorldPresentation`'s own
  `projectArenaPoint`/`platformMarginY` constants (not a hand-tuned magic number), and applied it via
  Phaser's `startFollow(..., offsetX, offsetY)`. This keeps the platform's *visual* center aligned
  with the camera's center regardless of viewport size, without modifying `WorldPresentation` itself.
- Re-verified with the same pixel-sampling method: the dark dead-zone shrank from 15-25% of the frame
  down to ~5% (just the natural bottom margin) at every previously-broken size.

### 3. Fixed the Stage Select Subtitle/Card Overlap
- Root cause: the first stage card's Y position was a fixed offset (`titleY + 154`) from the title,
  independent of how tall the chapter subtitle text actually rendered. On narrower windows the
  subtitle (which includes the chapter's full name, mastery status, and description) wraps to two
  lines, and the fixed offset put the card's top edge *above* where the wrapped text's second line
  actually ended.
- Fixed by capturing the subtitle `Text` object and reading its real rendered `.height` after
  creation, then computing the card start position as `max(original offset, subtitle bottom edge +
  margin)`. This is a no-op at normal widths (single-line subtitle) and only pushes cards down when
  the text genuinely needs the room.
- Re-verified at a width narrow enough to force the two-line wrap (matching the reported scenario):
  the card now sits cleanly below both subtitle lines with no overlap.

## Technical Details

### Files Modified
1. `src/game/scenes/GameScene.ts` - added `PLATFORM_VISUAL_CENTER_Y` / `CAMERA_FOLLOW_OFFSET_Y`
   (derived from existing `WorldPresentation` constants) and applied it to the main camera's
   `startFollow` call.
2. `src/game/scenes/StageSelectScene.ts` - `startY` for the stage card list is now derived from the
   chapter subtitle text's actual rendered height instead of a fixed offset.

### Key Systems Utilized
- **Existing `WorldPresentation.projectArenaPoint`**: reused to derive the camera offset instead of
  hand-picking a pixel value, so the fix stays correct if the compression tuning ever changes.
- **Phaser `Camera.startFollow` offsetX/offsetY**: the existing, intended mechanism for this kind of
  framing correction — no custom camera math was written.
- **Pixel-level screenshot sampling (`pngjs`)**: used as ground truth throughout instead of relying
  on visual impression alone, which is what caught that the defect existed at *every* size, not just
  the ones that looked obviously broken.

### Design Principles Maintained
1. **No `WorldPresentation` rewrite**: the fix lives in `GameScene.ts` as a camera-framing decision
   that *consumes* WorldPresentation's existing output; the core 2.5D system itself is untouched.
2. **Backward-compatible layout math**: the Stage Select fix only changes behavior when the subtitle
   actually wraps; normal (single-line) layouts render identically to before.
3. **Evidence over assumption**: every claim in this pass is backed by either a reproduced
   screenshot, sampled pixel data, or both — not visual guesswork.

## Verification
- ✅ All tests pass (126/126)
- ✅ TypeScript compilation clean
- ✅ ESLint clean
- ✅ Production build successful
- ✅ Black dead-zone reproduced and fixed at 4 desktop sizes, confirmed via pixel sampling
  (15-25% of frame -> ~5% at every previously-broken size)
- ✅ Stage Select overlap reproduced (2-line subtitle wrap) and fixed, confirmed via screenshot

## Conclusion
Both reported visual defects were real, reproducible bugs — not device- or browser-specific
oddities — and both are now fixed with a measured, evidence-based root cause rather than a cosmetic
patch. The arena now stays visually centered under the camera at any desktop window size, and the
Stage Select screen no longer clips its own text under the first stage card when the subtitle needs
two lines.
