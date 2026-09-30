import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPlayerVisualDirection, getPlayerVisualFrame, PLAYER_VISUAL, PLAYER_VISUAL_DIRECTIONS } from './playerVisual';

function vector(x: number, y: number): { x: number; y: number; lengthSq: () => number } {
  return {
    x,
    y,
    lengthSq: () => x * x + y * y,
  };
}

describe('playerVisual', () => {
  it('keeps humanoid sprite metadata compact and collision radius unchanged', () => {
    expect(PLAYER_VISUAL.assetPath).toBe('assets/player-parts.png');
    expect(PLAYER_VISUAL.frameWidth).toBe(96);
    expect(PLAYER_VISUAL.frameHeight).toBe(96);
    expect(PLAYER_VISUAL.collisionRadius).toBe(18);
    expect(PLAYER_VISUAL.renderScale).toBeLessThan(1);
  });

  it('ships the local humanoid sprite asset within a small playable budget', () => {
    const assetPath = `public/${PLAYER_VISUAL.assetPath}`;

    expect(existsSync(assetPath)).toBe(true);
    expect(statSync(assetPath).size).toBeLessThan(200_000);
  });

  it('maps each direction to a distinct upper/legs frame pair matching row*4+column', () => {
    expect(PLAYER_VISUAL_DIRECTIONS).toEqual(['south', 'east', 'north', 'west']);
    expect(PLAYER_VISUAL_DIRECTIONS.map((direction) => getPlayerVisualFrame(direction, PLAYER_VISUAL.upperRow))).toEqual([
      0, 1, 2, 3,
    ]);
    expect(PLAYER_VISUAL_DIRECTIONS.map((direction) => getPlayerVisualFrame(direction, PLAYER_VISUAL.legsRow))).toEqual([
      4, 5, 6, 7,
    ]);
  });

  it('maps movement vectors to cardinal humanoid facing without changing idle facing', () => {
    expect(getPlayerVisualDirection(vector(1, 0.2), 'south')).toBe('east');
    expect(getPlayerVisualDirection(vector(-1, 0.2), 'south')).toBe('west');
    expect(getPlayerVisualDirection(vector(0.2, -1), 'south')).toBe('north');
    expect(getPlayerVisualDirection(vector(0.2, 1), 'north')).toBe('south');
    expect(getPlayerVisualDirection(vector(0, 0), 'east')).toBe('east');
  });
});
