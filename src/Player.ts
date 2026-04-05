import * as THREE from 'three';
import { clamp } from './utils';
import { CYCLE_PATH_HALF_WIDTH, PATH_HALF_LENGTH } from './World';

const MAX_SPEED    = 12;
const ACCELERATION = 22;
const FRICTION     = 18;
const RIDE_HEIGHT  = 1.5; // wheel axle height

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

  get position(): THREE.Vector3 { return this.mesh.position; }

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

  reset(): void {
    this.mesh.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.keys.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // ─── Mesh construction ─────────────────────────────────────────────────────

  private _buildMesh(): void {
    // Bike frame
    const frameGeo = new THREE.BoxGeometry(0.45, 0.55, 0.85);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const frame    = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y  = RIDE_HEIGHT;
    frame.castShadow  = true;
    this.mesh.add(frame);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.x = Math.PI / 2;
    frontWheel.position.set(0, 0.35, 0.45);
    frontWheel.castShadow = true;
    this.mesh.add(frontWheel);

    const backWheel = frontWheel.clone();
    backWheel.position.set(0, 0.35, -0.45);
    this.mesh.add(backWheel);

    // Rider torso — Dutch national orange jersey
    const torsoGeo = new THREE.BoxGeometry(0.38, 0.75, 0.28);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const torso    = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y  = RIDE_HEIGHT + 0.35;
    torso.rotation.x  = 0.35; // forward lean
    torso.castShadow  = true;
    this.mesh.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.21, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, RIDE_HEIGHT + 0.85, -0.1);
    head.castShadow = true;
    this.mesh.add(head);

    // Helmet (half-sphere)
    const helmetGeo = new THREE.SphereGeometry(0.25, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const helmet    = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, RIDE_HEIGHT + 0.97, -0.1);
    this.mesh.add(helmet);
  }
}
