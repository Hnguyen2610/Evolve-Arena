import { UI_DEPTH, WORLD } from '../config/constants';

export const WORLD_PRESENTATION = {
  elevationDegrees: 60,
  verticalCompression: 0.5, // 60-degree elevation for strong 2.5D effect (cos(60°) = 0.5)
  horizonY: WORLD.height * 0.4, // Horizon at 40% screen height for tilted view
  platformMarginX: 96,
  platformMarginY: 74,
  platformEdgeDrop: 72,
  minDepthScale: 0.9, // Increased depth range for more noticeable scaling
  maxDepthScale: 1.1,
  entityDepthBase: UI_DEPTH.world + 6,
  entityDepthRange: 12, // Increased depth range for better entity separation
} as const;

export interface PresentedPoint {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function projectArenaPoint(x: number, y: number): PresentedPoint {
  const compressedY = WORLD_PRESENTATION.horizonY + (y - WORLD_PRESENTATION.horizonY) * WORLD_PRESENTATION.verticalCompression;
  return { x, y: compressedY };
}

export function getDepthScale(y: number, range = WORLD_PRESENTATION.maxDepthScale - WORLD_PRESENTATION.minDepthScale): number {
  const normalizedY = clamp(y / WORLD.height, 0, 1);
  return WORLD_PRESENTATION.minDepthScale + normalizedY * range;
}

export function getVisualDepth(y: number, offset = 0): number {
  const normalizedY = clamp(y / WORLD.height, 0, 1);
  return WORLD_PRESENTATION.entityDepthBase + normalizedY * WORLD_PRESENTATION.entityDepthRange + offset;
}

export function getShadowDepth(y: number): number {
  return getVisualDepth(y, -1.2);
}

export function getGroundEffectDepth(y: number, offset = 0): number {
  return getVisualDepth(y, -0.55 + offset);
}

export function getGroundedVisualY(y: number, bob = 0, lift = 0): number {
  return y + bob - lift;
}

export function createPlatformPoints(): {
  surface: PresentedPoint[];
  bottomEdge: PresentedPoint[];
  leftEdge: PresentedPoint[];
  rightEdge: PresentedPoint[];
} {
  const left = WORLD_PRESENTATION.platformMarginX;
  const right = WORLD.width - WORLD_PRESENTATION.platformMarginX;
  const top = WORLD_PRESENTATION.platformMarginY;
  const bottom = WORLD.height - WORLD_PRESENTATION.platformMarginY;
  const drop = WORLD_PRESENTATION.platformEdgeDrop;
  const topLeft = projectArenaPoint(left, top);
  const topRight = projectArenaPoint(right, top);
  const bottomRight = projectArenaPoint(right, bottom);
  const bottomLeft = projectArenaPoint(left, bottom);

  return {
    surface: [
      { x: topLeft.x, y: topLeft.y },
      { x: topRight.x, y: topRight.y },
      { x: bottomRight.x, y: bottomRight.y },
      { x: bottomLeft.x, y: bottomLeft.y },
    ],
    bottomEdge: [
      { x: bottomLeft.x, y: bottomLeft.y },
      { x: bottomRight.x, y: bottomRight.y },
      { x: bottomRight.x - 58, y: bottomRight.y + drop },
      { x: bottomLeft.x + 58, y: bottomLeft.y + drop },
    ],
    leftEdge: [
      { x: topLeft.x, y: topLeft.y },
      { x: bottomLeft.x, y: bottomLeft.y },
      { x: bottomLeft.x + 58, y: bottomLeft.y + drop },
      { x: topLeft.x + 36, y: topLeft.y + drop * 0.55 },
    ],
    rightEdge: [
      { x: topRight.x, y: topRight.y },
      { x: bottomRight.x, y: bottomRight.y },
      { x: bottomRight.x - 58, y: bottomRight.y + drop },
      { x: topRight.x - 36, y: topRight.y + drop * 0.55 },
    ],
  };
}
