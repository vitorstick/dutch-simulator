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
  // Public-facing active camera (either orthographic or perspective)
  camera: THREE.Camera;

  private ortho: THREE.OrthographicCamera;
  private third: THREE.PerspectiveCamera;

  private mode: 'iso' | 'third' = 'third';

  private shakeTimer    = 0;
  private shakeStrength = 0;

  // Current (smoothed) up vector in world XZ space
  private readonly currentUp = new THREE.Vector3(0, 0, -1);
  private readonly targetUp  = new THREE.Vector3(0, 0, -1);

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    this.ortho = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
       VIEW_SIZE,         -VIEW_SIZE,
      0.1, 500
    );
    this.ortho.position.set(0, CAM_HEIGHT, 0);
    this.ortho.up.set(0, 0, -1);
    this.ortho.lookAt(0, 0, 0);

    this.third = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
    this.third.position.set(0, 2.4, 5.6);
    this.third.lookAt(0, 1, 0);

    this.camera = this.third;
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
    if (this.mode === 'iso') {
      // Smoothly interpolate camera.up toward the current path forward vector
      this.targetUp.set(pathDir.dirX, 0, pathDir.dirZ);
      this.currentUp.lerp(this.targetUp, Math.min(delta * 5, 1)).normalize();

      this.ortho.position.set(target.x, target.y + CAM_HEIGHT, target.z);

      if (this.shakeTimer > 0) {
        this.shakeTimer -= delta;
        const s = this.shakeStrength;
        this.ortho.position.x += (Math.random() - 0.5) * s;
        this.ortho.position.y += (Math.random() - 0.5) * s * 0.5;
      }

      this.ortho.up.copy(this.currentUp);
      this.ortho.lookAt(target);
      this.camera = this.ortho;
    } else {
      // Third-person: place camera behind the player along the path direction
      const back = new THREE.Vector3(-pathDir.dirX, 0, -pathDir.dirZ).normalize();
      const thirdPos = new THREE.Vector3().copy(target)
        .addScaledVector(back, 5.6) // distance behind player
        .add(new THREE.Vector3(0, 2.2, 0)); // slight height above player

      // Smoothly interpolate the third-person camera towards the target
      const lerpT = Math.min(delta * 8, 1);
      this.third.position.lerp(thirdPos, lerpT);
      this.third.lookAt(target.x, target.y + 0.9, target.z);

      if (this.shakeTimer > 0) {
        this.shakeTimer -= delta;
        const s = this.shakeStrength * 0.4;
        this.third.position.x += (Math.random() - 0.5) * s;
        this.third.position.y += (Math.random() - 0.5) * s * 0.5;
      }

      this.camera = this.third;
    }
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
    this.ortho.left  = -VIEW_SIZE * aspect;
    this.ortho.right =  VIEW_SIZE * aspect;
    this.ortho.updateProjectionMatrix();

    this.third.aspect = aspect;
    this.third.updateProjectionMatrix();
  }

  /** Toggle between isometric and third-person views. Returns the new mode. */
  toggleMode(): 'iso' | 'third' {
    this.mode = this.mode === 'iso' ? 'third' : 'iso';
    this.camera = this.mode === 'iso' ? this.ortho : this.third;
    return this.mode;
  }

  /** Read-only access to the current camera mode. */
  getMode(): 'iso' | 'third' { return this.mode; }
}
