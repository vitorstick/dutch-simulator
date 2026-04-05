import * as THREE from 'three';

const VIEW_SIZE  = 16;   // orthographic half-height (world units)
const CAM_HEIGHT = 45;   // metres above player

/**
 * Near-top-down orthographic camera that follows the player.
 *
 * The camera's `up` vector smoothly rotates to align with the current path
 * direction so that "forward on screen" always matches "forward on the path".
 * Screen-shake is triggered on hit events.
 */
export class IsoCamera {
  readonly camera: THREE.OrthographicCamera;
  private shakeTimer    = 0;
  private shakeStrength = 0;

  // Current (smoothed) up vector in world XZ space
  private readonly currentUp = new THREE.Vector3(0, 0, -1);
  private readonly targetUp  = new THREE.Vector3(0, 0, -1);

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
       VIEW_SIZE,         -VIEW_SIZE,
      0.1, 500
    );
    this.camera.position.set(0, CAM_HEIGHT, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Move the camera to track `target`, orient the view to face the current
   * path direction, and apply any active screen shake.
   *
   * @param delta   - Elapsed time in seconds since the last frame.
   * @param target  - World-space player position to centre the view on.
   * @param pathDir - Current unit direction of the path (dirX, dirZ).
   */
  update(
    delta:   number,
    target:  THREE.Vector3,
    pathDir: { dirX: number; dirZ: number },
  ): void {
    // Smoothly interpolate camera.up toward the current path forward vector
    this.targetUp.set(pathDir.dirX, 0, pathDir.dirZ);
    this.currentUp.lerp(this.targetUp, Math.min(delta * 5, 1)).normalize();

    this.camera.position.set(target.x, target.y + CAM_HEIGHT, target.z);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const s = this.shakeStrength;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
    }

    this.camera.up.copy(this.currentUp);
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
