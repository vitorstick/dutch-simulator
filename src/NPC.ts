import * as THREE from 'three';
import { PATH_HALF_LENGTH } from './World';

const NPC_COLORS     = [0x2266ff, 0xff6622, 0x22cc44, 0xcc22cc, 0xffcc22, 0x11aacc];
const BODY_HEIGHT    = 1.4;
const HEAD_RADIUS    = 0.28;
const TUMBLE_DURATION = 0.45; // seconds

/**
 * Represents a single pedestrian walking along the Amsterdam cycle path.
 *
 * Lifecycle:
 * 1. Spawned by `NPCManager` at a random position on the path.
 * 2. Walks in a fixed direction (`dir`) at a fixed `speed` each frame.
 * 3. Wraps back to the opposite end when reaching a path boundary.
 * 4. When hit by the player, `hit()` is called — `isAlive` is set to `false`
 *    and a ragdoll tumble animation plays (~`TUMBLE_DURATION` seconds).
 * 5. Once `canDispose` is `true`, `NPCManager` removes it from the scene.
 */
export class NPC {
  readonly mesh: THREE.Group;
  isAlive = true;

  private readonly speed:    number;
  private readonly dir:      1 | -1;
  private readonly bodyMesh: THREE.Mesh;
  private tumbleTimer = 0;

  constructor(
    scene:     THREE.Scene,
    speed:     number,
    direction: 1 | -1,
    x:         number,
    z:         number,
  ) {
    this.speed = speed;
    this.dir   = direction;
    this.mesh  = new THREE.Group();

    const color = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];

    // Body
    const bodyGeo      = new THREE.BoxGeometry(0.5, BODY_HEIGHT, 0.38);
    const bodyMat      = new THREE.MeshLambertMaterial({ color });
    this.bodyMesh      = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = BODY_HEIGHT / 2;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(HEAD_RADIUS, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = BODY_HEIGHT + HEAD_RADIUS;
    head.castShadow = true;
    this.mesh.add(head);

    // Hat (tourist cap)
    const hatGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.15, 8);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const hat    = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = BODY_HEIGHT + HEAD_RADIUS * 2 + 0.05;
    this.mesh.add(hat);

    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  /**
   * Advance the NPC by one frame.
   *
   * - If alive: walk along the Z-axis, wrap at path ends, apply a subtle
   *   body-bob to simulate footsteps.
   * - If dead: delegate to `_animateTumble` to play the hit animation.
   *
   * @param delta - Elapsed time in seconds since the last frame.
   */
  update(delta: number): void {
    if (!this.isAlive) {
      this._animateTumble(delta);
      return;
    }

    // Walk along path
    this.mesh.position.z += this.speed * this.dir * delta;

    // Wrap at path ends
    if      (this.mesh.position.z >  PATH_HALF_LENGTH) this.mesh.position.z = -PATH_HALF_LENGTH;
    else if (this.mesh.position.z < -PATH_HALF_LENGTH)  this.mesh.position.z =  PATH_HALF_LENGTH;

    // Walk bob
    this.bodyMesh.position.y =
      BODY_HEIGHT / 2 + Math.abs(Math.sin(this.mesh.position.z * 4)) * 0.05;
  }

  /**
   * Mark the NPC as hit by the player.
   * Idempotent — repeated calls while already dead are ignored.
   * Starts the tumble animation timer from zero.
   */
  hit(): void {
    if (!this.isAlive) return;
    this.isAlive   = false;
    this.tumbleTimer = 0;
  }

  /**
   * `true` once the tumble animation has fully played and the NPC mesh is
   * invisible. When this returns `true`, `NPCManager` will call `dispose()`
   * and remove the NPC from its internal list.
   */
  get canDispose(): boolean {
    return !this.isAlive && this.tumbleTimer >= TUMBLE_DURATION + 0.2;
  }

  /**
   * Remove the NPC's mesh group from the Three.js scene.
   * Call only after `canDispose` is `true`.
   *
   * @param scene - The scene the NPC was added to in the constructor.
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  /** Current world-space position of the NPC mesh. */
  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Plays a simple ragdoll tumble: the mesh spins 180° on the Z-axis while
   * arcing upward then falling back to ground level over `TUMBLE_DURATION`
   * seconds. The mesh is hidden once the animation completes.
   *
   * @param delta - Elapsed time in seconds since the last frame.
   */
  private _animateTumble(delta: number): void {
    this.tumbleTimer += delta;
    const t = Math.min(this.tumbleTimer / TUMBLE_DURATION, 1);

    // Spin sideways and arc upward then down
    this.mesh.rotation.z = t * Math.PI;
    this.mesh.position.y = Math.sin(t * Math.PI) * 1.2;

    if (t >= 1) {
      this.mesh.visible = false;
    }
  }
}
