import * as THREE from 'three';
import { clamp } from './utils';
import { CYCLE_PATH_HALF_WIDTH, PATH_HALF_LENGTH } from './World';

const MAX_SPEED    = 12;
const ACCELERATION = 22;
const FRICTION     = 18;

/**
 * Represents the player-controlled cyclist.
 *
 * Responsibilities:
 * - Builds the bicycle + rider 3D mesh procedurally.
 * - Reads keyboard input (WASD / arrow keys) each frame.
 * - Applies momentum-based movement physics (acceleration + friction).
 * - Constrains the cyclist to the cycle path bounds.
 * - Rotates the mesh to always face the direction of travel.
 */
export class Player {
  readonly mesh: THREE.Group;
  private readonly velocity = new THREE.Vector3();
  private readonly keys     = new Set<string>();

  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp:   (e: KeyboardEvent) => void;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this._buildMesh();
    scene.add(this.mesh);

    this._onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code);
    this._onKeyUp   = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  /** Current world-space position of the cyclist (centre of the mesh group). */
  get position(): THREE.Vector3 { return this.mesh.position; }

  /**
   * Advance the player by one frame.
   *
   * @param delta - Elapsed time in seconds since the last frame.
   *
   * Each call:
   * 1. Samples active keys and builds a normalised input vector.
   * 2. Applies acceleration in the input direction, or friction when coasting.
   * 3. Clamps velocity to `MAX_SPEED`.
   * 4. Moves the mesh and clamps it inside the cycle-path boundaries.
   * 5. Rotates the mesh to face the current velocity direction.
   */
  update(delta: number): void {
    // ── Input ──────────────────────────────────────────────────────────────
    const input = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    input.z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  input.z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  input.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) input.x += 1;

    if (input.lengthSq() > 0) {
      input.normalize();
      this.velocity.x += input.x * ACCELERATION * delta;
      this.velocity.z += input.z * ACCELERATION * delta;
    } else {
      const speed = this.velocity.length();
      if (speed > 0) {
        const decel = Math.min(FRICTION * delta, speed);
        this.velocity.multiplyScalar(1 - decel / speed);
      }
    }

    // ── Clamp speed ────────────────────────────────────────────────────────
    const speed = this.velocity.length();
    if (speed > MAX_SPEED) this.velocity.multiplyScalar(MAX_SPEED / speed);

    // ── Move ───────────────────────────────────────────────────────────────
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.z += this.velocity.z * delta;

    // ── Constrain to cycle path ────────────────────────────────────────────
    this.mesh.position.x = clamp(
      this.mesh.position.x,
      -CYCLE_PATH_HALF_WIDTH + 0.5,
       CYCLE_PATH_HALF_WIDTH - 0.5,
    );
    this.mesh.position.z = clamp(
      this.mesh.position.z,
      -PATH_HALF_LENGTH + 1,
       PATH_HALF_LENGTH  - 1,
    );

    // ── Face movement direction ────────────────────────────────────────────
    if (this.velocity.lengthSq() > 0.5) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }
  }

  /**
   * Teleport the cyclist back to the spawn origin and clear all motion.
   * Called at the start of each level.
   */
  reset(): void {
    this.mesh.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.keys.clear();
  }

  /**
   * Clean up global event listeners.
   * Must be called if the Player instance is ever destroyed to avoid memory leaks.
   */
  dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // ─── Mesh construction ─────────────────────────────────────────────────────

  /**
   * Procedurally build the full bicycle + rider mesh and attach it to `this.mesh`.
   *
   * Structure overview:
   * ┌─ Wheels (front & rear)
   * │    TorusGeometry tyre  (black)
   * │    TorusGeometry rim   (chrome, smaller radius)
   * │    CylinderGeometry hub (chrome, axle width)
   * │    rotation.z = PI/2 so the torus ring stands upright in the YZ plane,
   * │    meaning the wheel rolls along the Z axis (forward direction).
   * │
   * ├─ Diamond frame  (6 CylinderGeometry tubes via _tube())
   * │    seat tube  · down tube  · top tube
   * │    chain stay · seat stay  · fork (chrome)
   * │
   * ├─ Handlebar
   * │    stem (chrome) + wide flat Dutch city-bike bar
   * │
   * ├─ Saddle + seat post
   * │
   * ├─ Rear rack  (Amsterdam omafiets style: rail + platform)
   * │
   * └─ Rider
   *      hips · torso (orange jersey) · head (skin) · helmet (orange)
   *      arms (tubes from shoulders to handlebar grips)
   *
   * All positions are expressed in the mesh's local space.
   * The bike faces the −Z direction by default; rotation is applied by
   * `update()` via `this.mesh.rotation.y`.
   */
  private _buildMesh(): void {
    const orangeMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    const blackMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const skinMat   = new THREE.MeshLambertMaterial({ color: 0xffcc88 });
    const saddleMat = new THREE.MeshLambertMaterial({ color: 0x1a1008 });
    const rackMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const armMat    = new THREE.MeshLambertMaterial({ color: 0xff7722 });

    const WR = 0.34; // wheel radius = hub axle height

    // ── Key frame joints (bike faces -Z direction) ──────────────────────────
    const RA = new THREE.Vector3(0, WR,   0.50);  // rear axle
    const FA = new THREE.Vector3(0, WR,  -0.50);  // front axle
    const BB = new THREE.Vector3(0, 0.32, 0.08);  // bottom bracket (pedal spindle)
    const ST = new THREE.Vector3(0, 0.90, 0.18);  // seat tube top / saddle rail
    const HT = new THREE.Vector3(0, 0.74, -0.42); // head tube top (stem)
    const HB = new THREE.Vector3(0, 0.48, -0.36); // head tube bottom / fork crown

    // ── Wheels ──────────────────────────────────────────────────────────────
    // TorusGeometry default ring is in XY plane (hole along Z).
    // rotation.y = PI/2 → hole faces along X = wheel axle direction.
    const tireGeo = new THREE.TorusGeometry(WR,        0.075, 6, 18);
    const rimGeo  = new THREE.TorusGeometry(WR * 0.72, 0.025, 6, 18);
    const hubGeo  = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);

    for (const axlePos of [RA, FA]) {
      const tire = new THREE.Mesh(tireGeo, blackMat);
      const rim  = new THREE.Mesh(rimGeo,  chromeMat);
      const hub  = new THREE.Mesh(hubGeo,  chromeMat);
      tire.rotation.z = Math.PI / 2; // ring into YZ plane, axle along X
      rim.rotation.z  = Math.PI / 2;
      hub.rotation.z  = Math.PI / 2; // hub axis along X
      tire.position.copy(axlePos);
      rim.position.copy(axlePos);
      hub.position.copy(axlePos);
      tire.castShadow = true;
      this.mesh.add(tire, rim, hub);
    }

    // ── Diamond frame ───────────────────────────────────────────────────────
    this._tube(BB, ST,  0.050, orangeMat); // seat tube
    this._tube(BB, HB,  0.052, orangeMat); // down tube
    this._tube(ST, HT,  0.042, orangeMat); // top tube
    this._tube(BB, RA,  0.036, orangeMat); // chain stay
    this._tube(ST, RA,  0.034, orangeMat); // seat stay
    this._tube(HB, FA,  0.040, chromeMat); // fork

    // ── Handlebar ───────────────────────────────────────────────────────────
    const hbarTop = new THREE.Vector3(0, 0.93, -0.43);
    this._tube(HT, hbarTop, 0.022, chromeMat); // stem
    this._tube(                                // Dutch upright bar
      new THREE.Vector3(-0.30, 0.93, -0.43),
      new THREE.Vector3( 0.30, 0.93, -0.43),
      0.022, chromeMat,
    );

    // ── Saddle & seat post ───────────────────────────────────────────────────
    const saddleGeo = new THREE.BoxGeometry(0.12, 0.04, 0.36);
    const saddle    = new THREE.Mesh(saddleGeo, saddleMat);
    saddle.position.set(ST.x, ST.y + 0.04, ST.z);
    this.mesh.add(saddle);
    this._tube(ST, new THREE.Vector3(ST.x, ST.y + 0.1, ST.z), 0.022, chromeMat);

    // ── Rear rack (Amsterdam omafiets style) ─────────────────────────────────
    this._tube(ST, new THREE.Vector3(0, ST.y, RA.z), 0.018, rackMat);
    const rackGeo  = new THREE.BoxGeometry(0.30, 0.025, 0.28);
    const rackPlat = new THREE.Mesh(rackGeo, rackMat);
    rackPlat.position.set(0, ST.y + 0.02, (ST.z + RA.z) * 0.5);
    this.mesh.add(rackPlat);

    // ── Rider ────────────────────────────────────────────────────────────────
    // Hips (on saddle)
    const hipsGeo = new THREE.BoxGeometry(0.26, 0.18, 0.20);
    const hips    = new THREE.Mesh(hipsGeo, orangeMat);
    hips.position.set(0, ST.y + 0.16, ST.z - 0.02);
    hips.castShadow = true;
    this.mesh.add(hips);

    // Torso (slight forward lean — city bike upright posture)
    const torsoGeo = new THREE.BoxGeometry(0.28, 0.52, 0.22);
    const torso    = new THREE.Mesh(torsoGeo, orangeMat);
    torso.position.set(0, ST.y + 0.54, ST.z - 0.06);
    torso.rotation.x  = 0.20;
    torso.castShadow  = true;
    this.mesh.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.17, 8, 7);
    const head    = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, ST.y + 1.01, ST.z - 0.18);
    head.castShadow = true;
    this.mesh.add(head);

    // Helmet (half-sphere cap)
    const helmetGeo = new THREE.SphereGeometry(0.20, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmet    = new THREE.Mesh(helmetGeo, orangeMat);
    helmet.position.set(0, ST.y + 1.10, ST.z - 0.18);
    this.mesh.add(helmet);

    // Arms from shoulders to handlebar grips
    const shoulderL = new THREE.Vector3( 0.15, ST.y + 0.74, ST.z - 0.08);
    const shoulderR = new THREE.Vector3(-0.15, ST.y + 0.74, ST.z - 0.08);
    this._tube(shoulderL, new THREE.Vector3( 0.26, 0.93, -0.43), 0.044, armMat);
    this._tube(shoulderR, new THREE.Vector3(-0.26, 0.93, -0.43), 0.044, armMat);
  }

  /**
   * Add a cylindrical tube between two world-space points to `this.mesh`.
   *
   * Used throughout `_buildMesh` to construct every strut of the bicycle frame,
   * the fork, handlebar stem, seat post, rack rail, and rider arms.
   *
   * @param from   - Start point of the tube (local space).
   * @param to     - End point of the tube (local space).
   * @param radius - Radius of the cylinder in world units.
   * @param mat    - Lambert material to apply to the mesh.
   *
   * Implementation note: Three.js `CylinderGeometry` is aligned along +Y by
   * default, so `quaternion.setFromUnitVectors(UP, dir)` is used to rotate it
   * to the correct orientation without any Euler angle gimbal issues.
   */
  private _tube(
    from:   THREE.Vector3,
    to:     THREE.Vector3,
    radius: number,
    mat:    THREE.MeshLambertMaterial,
  ): void {
    const dir    = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    if (length < 0.001) return;
    const mid  = new THREE.Vector3().lerpVectors(from, to, 0.5);
    const geo  = new THREE.CylinderGeometry(radius, radius, length, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    mesh.castShadow = true;
    this.mesh.add(mesh);
  }
}
