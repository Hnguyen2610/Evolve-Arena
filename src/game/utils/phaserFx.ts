import Phaser from 'phaser';

type FxComponent = Phaser.GameObjects.Components.FX;

interface FxTarget extends Phaser.GameObjects.GameObject {
  preFX?: FxComponent | null;
  postFX?: FxComponent | null;
}

export function supportsBuiltInFx(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

export function addGlowFx(
  scene: Phaser.Scene,
  target: FxTarget,
  color: number,
  outerStrength: number,
  innerStrength = 0,
): Phaser.FX.Glow | null {
  if (!supportsBuiltInFx(scene) || !target.preFX) {
    return null;
  }

  try {
    return target.preFX.addGlow(color, outerStrength, innerStrength, false);
  } catch {
    return null;
  }
}

export function addShadowFx(
  scene: Phaser.Scene,
  target: FxTarget,
  color: number,
  intensity: number,
): Phaser.FX.Shadow | null {
  if (!supportsBuiltInFx(scene) || !target.preFX) {
    return null;
  }

  try {
    return target.preFX.addShadow(0, 4, 0.08, 0.55, color, 3, intensity);
  } catch {
    return null;
  }
}
