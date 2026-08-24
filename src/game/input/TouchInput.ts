import Phaser from 'phaser';
import { UI_DEPTH } from '../config/constants';

export class TouchInput {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private activePointerId: number | null = null;
  private origin = new Phaser.Math.Vector2();
  private vector = new Phaser.Math.Vector2();
  private radius = 58;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.base = scene.add.circle(0, 0, this.radius, 0xffffff, 0.12).setScrollFactor(0).setDepth(UI_DEPTH.hud);
    this.knob = scene.add.circle(0, 0, 22, 0xffffff, 0.45).setScrollFactor(0).setDepth(UI_DEPTH.hud + 1);
    this.hide();

    scene.input.on('pointerdown', this.handleDown, this);
    scene.input.on('pointermove', this.handleMove, this);
    scene.input.on('pointerup', this.handleUp, this);
    scene.input.on('pointerupoutside', this.handleUp, this);
  }

  getVector(): Phaser.Math.Vector2 {
    return this.vector.clone();
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handleDown, this);
    this.scene.input.off('pointermove', this.handleMove, this);
    this.scene.input.off('pointerup', this.handleUp, this);
    this.scene.input.off('pointerupoutside', this.handleUp, this);
    this.base.destroy();
    this.knob.destroy();
  }

  private handleDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null || this.scene.scale.width > 900 && pointer.x > this.scene.scale.width * 0.58) {
      return;
    }

    this.activePointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
    this.vector.set(0, 0);
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    const delta = new Phaser.Math.Vector2(pointer.x - this.origin.x, pointer.y - this.origin.y);
    const distance = Math.min(this.radius, delta.length());
    this.vector = delta.lengthSq() > 4 ? delta.clone().normalize().scale(distance / this.radius) : new Phaser.Math.Vector2();
    const knobPosition = this.origin.clone().add(this.vector.clone().scale(this.radius));
    this.knob.setPosition(knobPosition.x, knobPosition.y);
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.vector.set(0, 0);
    this.hide();
  }

  private hide(): void {
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }
}
