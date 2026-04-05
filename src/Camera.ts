import * as THREE from 'three';

const VIEW_SIZE = 16;                             // orthographic half-height (world units)
const CAM_OFFSET = new THREE.Vector3(2, 45, 5);   // near-top-down GTA retro angle

/**
 * Near-top-down orthographic camera that follows the player, inspired by the
 * retro GTA 1 / 2 "overhead" perspective.
 *
 * `CAM_OFFSET` is `(2, 45, 5)` — almost directly above with a very slight
 * forward tilt so depth is readable without a true isometric angle.
 *
 * Also handles screen-shake by randomly displacing the camera position for a
 * short duration after a hit event.
 */
export class IsoCamera {
  readonly camera: THREE.OrthographicCamera;
  private shakeTimer    = 0;
  private shakeStrength = 0;

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
       VIEW_SIZE,         -VIEW_SIZE,
      0.1, 500
    );
    this.camera.position.copy(CAM_OFFSET);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Move the camera to track `target` and apply any active screen shake.
   *
   * @param delta  - Elapsed time in seconds since the last frame.
   * @param target - World-space position to centre the view on (player position).
   */
  update(delta: number, target: THREE.Vector3): void {
    this.camera.position.set(
      target.x + CAM_OFFSET.x,
      target.y + CAM_OFFSET.y,
      target.z + CAM_OFFSET.z,
    );

    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const s = this.shakeStrength;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
    }

    this.camera.lookAt(target);
  }

  /**
   * Trigger a screen-shake effect.
   *
   * @param strength - Maximum pixel offset per axis per frame during shake.
   *                   Defaults to `0.9` world units.
   */
  shake(strength = 0.9): void {
    this.shakeStrength = strength;
    this.shakeTimer    = 0.18;
  }

  /**
   * Recalculate the camera frustum to match the current window aspect ratio.
   * Must be called whenever the browser window is resized.
   */
  resize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left  = -VIEW_SIZE * aspect;
    this.camera.right =  VIEW_SIZE * aspect;
    this.camera.updateProjectionMatrix();
  }
}
