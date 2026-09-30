import { describe, expect, it } from 'vitest';
import { UI_DEPTH, WORLD } from '../config/constants';
import {
  createPlatformPoints,
  getDepthScale,
  getGroundedVisualY,
  getShadowDepth,
  getVisualDepth,
  projectArenaPoint,
  projectY,
  WORLD_PRESENTATION,
} from './WorldPresentation';

describe('WorldPresentation', () => {
  it('compresses arena-space vertical distance without changing x', () => {
    const top = projectArenaPoint(300, 200);
    const bottom = projectArenaPoint(300, 1400);

    expect(top.x).toBe(300);
    expect(bottom.x).toBe(300);
    expect(bottom.y - top.y).toBeLessThan(1200);
    expect(bottom.y - top.y).toBeCloseTo(1200 * WORLD_PRESENTATION.verticalCompression, 5);
  });

  it('sorts lower world-space actors in front of higher actors below HUD depth', () => {
    const high = getVisualDepth(220);
    const low = getVisualDepth(1320);

    expect(low).toBeGreaterThan(high);
    expect(low).toBeLessThan(UI_DEPTH.effects);
    expect(low).toBeLessThan(UI_DEPTH.hud);
  });

  it('keeps shadows behind their character depth', () => {
    const y = WORLD.height * 0.72;

    expect(getShadowDepth(y)).toBeLessThan(getVisualDepth(y));
  });

  it('scales lower screen actors slightly larger for depth without affecting gameplay position', () => {
    expect(getDepthScale(WORLD.height)).toBeGreaterThan(getDepthScale(0));
    expect(getGroundedVisualY(WORLD_PRESENTATION.horizonY, 3, 12)).toBe(WORLD_PRESENTATION.horizonY + 3 - 12);
  });

  it('projects an entity\'s visual Y toward the horizon the same way the arena background is projected', () => {
    expect(getGroundedVisualY(1200, 0, 0)).toBeCloseTo(projectY(1200), 5);
    expect(getGroundedVisualY(1200, 0, 0)).toBeLessThan(1200);
  });

  it('builds a raised platform with bottom edge below the visual surface', () => {
    const platform = createPlatformPoints();
    const bottomSurfaceY = platform.surface[2].y;
    const bottomEdgeY = platform.bottomEdge[2].y;

    expect(platform.surface).toHaveLength(4);
    expect(bottomEdgeY).toBeGreaterThan(bottomSurfaceY);
  });

  it('has correct elevation degrees and horizonY', () => {
    expect(WORLD_PRESENTATION.elevationDegrees).toBe(60);
    expect(WORLD_PRESENTATION.horizonY).toBe(WORLD.height * 0.4);
  });
});
