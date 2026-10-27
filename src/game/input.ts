/**
 * Rise of the Raccoons! - Input Controller
 * Handles touch/mouse dragging and keyboard inputs (WASD / Arrow keys).
 * Seamlessly prioritizes keyboard to prevent jitter when both are used.
 */

import { InputState } from './types';

export class InputController {
  private state: InputState = {
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      shift: false,
      space: false,
    },
    isDragging: false,
    dragTarget: null,
    joystick: {
      active: false,
      x: 0,
      y: 0,
      distance: 0,
    },
    lastInputSource: 'none',
    keyboardActiveTimer: 0,
  };

  private canvasElement: HTMLCanvasElement | null = null;
  private onPauseRequested?: () => void;
  private onActionRequested?: () => void;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  public attach(
    canvas: HTMLCanvasElement,
    callbacks?: { onPause?: () => void; onAction?: () => void }
  ) {
    this.canvasElement = canvas;
    if (callbacks?.onPause) this.onPauseRequested = callbacks.onPause;
    if (callbacks?.onAction) this.onActionRequested = callbacks.onAction;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  public detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    if (this.canvasElement) {
      this.canvasElement.removeEventListener('pointerdown', this.handlePointerDown);
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvasElement = null;
  }

  private handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      e.preventDefault();
      this.onPauseRequested?.();
      return;
    }

    if (key === ' ' || key === 'space') {
      e.preventDefault();
      this.state.keys.space = true;
      this.state.isSpeedBoosted = true;
      this.onActionRequested?.();
    } else if (key === 'enter') {
      this.onActionRequested?.();
    }

    let isMoveKey = false;
    if (key === 'w' || key === 'arrowup') {
      this.state.keys.up = true;
      isMoveKey = true;
    }
    if (key === 's' || key === 'arrowdown') {
      this.state.keys.down = true;
      isMoveKey = true;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.state.keys.left = true;
      isMoveKey = true;
    }
    if (key === 'd' || key === 'arrowright') {
      this.state.keys.right = true;
      isMoveKey = true;
    }
    if (key === 'shift') {
      this.state.keys.shift = true;
      this.state.isSpeedBoosted = true;
    }

    if (isMoveKey) {
      this.state.lastInputSource = 'keyboard';
      this.state.keyboardActiveTimer = 0.35; // Keep keyboard priority alive
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (key === 'w' || key === 'arrowup') this.state.keys.up = false;
    if (key === 's' || key === 'arrowdown') this.state.keys.down = false;
    if (key === 'a' || key === 'arrowleft') this.state.keys.left = false;
    if (key === 'd' || key === 'arrowright') this.state.keys.right = false;
    if (key === ' ' || key === 'space') {
      this.state.keys.space = false;
      this.state.isSpeedBoosted = this.state.keys.shift || this.state.joystick.isBoosted || false;
    }
    if (key === 'shift') {
      this.state.keys.shift = false;
      this.state.isSpeedBoosted = this.state.keys.space || this.state.joystick.isBoosted || false;
    }
  }

  private handleBlur() {
    // Clear all held inputs on window blur to avoid stuck movement
    this.state.keys.up = false;
    this.state.keys.down = false;
    this.state.keys.left = false;
    this.state.keys.right = false;
    this.state.keys.shift = false;
    this.state.keys.space = false;
    this.state.isSpeedBoosted = false;
    this.state.isDragging = false;
    this.state.dragTarget = null;
    this.state.joystick = {
      active: false,
      x: 0,
      y: 0,
      distance: 0,
    };
    this.state.keyboardActiveTimer = 0;
  }

  private getProportionalCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.canvasElement) return null;
    const rect = this.canvasElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }

  private handlePointerDown(e: PointerEvent) {
    // If joystick is active, let joystick handle movement
    if (this.state.joystick.active) return;

    try {
      this.canvasElement?.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    const coords = this.getProportionalCoords(e.clientX, e.clientY);
    if (!coords) return;

    this.state.isDragging = true;
    this.state.dragTarget = coords;
    
    // Only switch to drag source if keyboard isn't actively pressed
    if (!this.hasActiveKeyboardMove()) {
      this.state.lastInputSource = 'drag';
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.state.isDragging || this.state.joystick.active) return;
    const coords = this.getProportionalCoords(e.clientX, e.clientY);
    if (!coords) return;

    this.state.dragTarget = coords;

    if (!this.hasActiveKeyboardMove()) {
      this.state.lastInputSource = 'drag';
    }
  }

  private handlePointerUp(e?: PointerEvent) {
    if (e && this.canvasElement) {
      try {
        if (this.canvasElement.hasPointerCapture(e.pointerId)) {
          this.canvasElement.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
    this.state.isDragging = false;
    this.state.dragTarget = null;
  }

  public setJoystickVector(x: number, y: number, active: boolean, isBoosted = false, isHoldingInPlace = false) {
    if (!active) {
      this.state.joystick = { active: false, x: 0, y: 0, distance: 0, isBoosted: false, isHoldingInPlace: false };
      this.state.isSpeedBoosted = this.state.keys.shift || false;
      return;
    }

    if (x === 0 && y === 0) {
      // Touch is pressed down in place without dragging
      this.state.joystick = {
        active: true,
        x: 0,
        y: 0,
        distance: 0,
        isBoosted,
        isHoldingInPlace: true,
      };
      this.state.isSpeedBoosted = isBoosted || this.state.keys.shift || false;
      this.state.lastInputSource = 'joystick';
      this.state.isDragging = false;
      this.state.dragTarget = null;
      return;
    }

    // 8-Way directional quantization: snap to Up, Down, Left, Right, and 45-degree diagonals
    const dist = Math.min(1.0, Math.hypot(x, y));
    const rawAngle = Math.atan2(y, x);
    const step = Math.PI / 4; // 45 degrees
    const snappedAngle = Math.round(rawAngle / step) * step;

    const cosVal = Math.cos(snappedAngle);
    const sinVal = Math.sin(snappedAngle);
    const quantX = Math.abs(cosVal) < 0.05 ? 0 : Math.round(cosVal * 1000) / 1000;
    const quantY = Math.abs(sinVal) < 0.05 ? 0 : Math.round(sinVal * 1000) / 1000;

    this.state.joystick = {
      active: true,
      x: quantX,
      y: quantY,
      distance: dist,
      isBoosted,
      isHoldingInPlace: false,
    };
    this.state.isSpeedBoosted = isBoosted || this.state.keys.shift || false;
    this.state.lastInputSource = 'joystick';
    // Clear canvas drag so joystick takes clean priority
    this.state.isDragging = false;
    this.state.dragTarget = null;
  }

  public setSpeedBoost(isBoosted: boolean) {
    this.state.isSpeedBoosted = isBoosted;
  }

  public hasActiveKeyboardMove(): boolean {
    return (
      this.state.keys.up ||
      this.state.keys.down ||
      this.state.keys.left ||
      this.state.keys.right
    );
  }

  public update(dt: number) {
    if (this.hasActiveKeyboardMove()) {
      this.state.keyboardActiveTimer = 0.25;
    } else if (this.state.keyboardActiveTimer > 0) {
      this.state.keyboardActiveTimer = Math.max(0, this.state.keyboardActiveTimer - dt);
    }
  }

  public getState(): InputState {
    return this.state;
  }
}
