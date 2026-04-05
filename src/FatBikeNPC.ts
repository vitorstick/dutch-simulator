import * as THREE from 'three';
import { PATH_HALF_LENGTH } from './World';

const HIT_COOLDOWN    = 2.0;  // seconds of immunity after a hit
const WHEEL_COLOR     = 0x111111;
const WHEEL_RADIUS    = 0.42; // noticeably fat
const WHEEL_WIDTH     = 0.38;
const FAT_BIKE_COLORS = [0xff3300, 0xee1100, 0xff6600, 0xcc0033];

/**
 * A fast fat-bike NPC that rides along the cycle path.
 *
 * Unlike pedestrian NPCs, fat bikes are **hazards for the player**:
 * - They are never marked as dead or disposed mid-level.
 * - When they collide with the player, the player loses one life.
 * - A `HIT_COOLDOWN` prevents multiple life deductions from a single pass-through.
 *
 * Visual: chunky frame + two wide tyres + a hunched rider.
 */
export class FatBikeNPC {
  readonly mesh: THREE.Group;

  private readonly speed:       number;
  private readonly dir:         1 | -1;
  private readonly frontWheel:  THREE.Mesh;
  private readonly backWheel:   THREE.Mesh;
  private hitTimer = HIT_COOLDOWN; // start fully "ready to hit"

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

    const color = FAT_BIKE_COLORS[Math.floor(Math.random() * FAT_BIKE_COLORS.length)];

    // ── Wheels (fat cylinders lying on their side) ────────────────────────
    const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 14);
    const wheelMat = new THREE.MeshLambertMaterial({ color: WHEEL_COLOR });

    this.frontWheel             = new THREE.Mesh(wheelGeo, wheelMat);
    this.frontWheel.rotation.z  = Math.PI / 2; // axis → X so it rolls along Z
    this.frontWheel.position.set(0, WHEEL_RADIUS, 0.48);
    this.frontWheel.castShadow  = true;

    this.backWheel             = new THREE.Mesh(wheelGeo, wheelMat);
    this.backWheel.rotation.z  = Math.PI / 2;
    this.backWheel.position.set(0, WHEEL_RADIUS, -0.48);
    this.backWheel.castShadow  = true;

    this.mesh.add(this.frontWheel, this.backWheel);

    // ── Tyre treads (slightly darker ring around each wheel) ─────────────
    const treadGeo = new THREE.TorusGeometry(WHEEL_RADIUS, 0.06, 8, 14);
    const treadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const z of [0.48, -0.48]) {
      const tread       = new THREE.Mesh(treadGeo, treadMat);
      tread.position.set(0, WHEEL_RADIUS, z);
      this.mesh.add(tread);
    }

    // ── Frame ─────────────────────────────────────────────────────────────
    const frameGeo = new THREE.BoxGeometry(0.22, 0.18, 0.95);
    const frameMat = new THREE.MeshLambertMaterial({ color });
    const frame    = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, WHEEL_RADIUS + 0.18, 0);
    frame.castShadow = true;
    this.mesh.add(frame);

    // Handlebar post
    const postGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const postMat = new THREE.MeshLambertMaterial({ color });
    const post    = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, WHEEL_RADIUS + 0.45, 0.42);
    this.mesh.add(post);

    // Handlebar crossbar
    const barGeo = new THREE.BoxGeometry(0.55, 0.08, 0.08);
    const bar    = new THREE.Mesh(barGeo, postMat);
    bar.position.set(0, WHEEL_RADIUS + 0.62, 0.42);
    this.mesh.add(bar);

    // ── Rider ─────────────────────────────────────────────────────────────
    // Torso (leaning forward)
    const torsoGeo = new THREE.BoxGeometry(0.36, 0.55, 0.42);
    const torsoMat = new THREE.MeshLambertMaterial({ color });
    const torso    = new THREE.Mesh(torsoGeo, torsoMat);
    torso.rotation.x = 0.45;           // lean forward
    torso.position.set(0, 1.35, 0.05);
    torso.castShadow = true;
    this.mesh.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.21, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.72, 0.28);
    this.mesh.add(head);

    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.24, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const helmet    = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.74, 0.28);
    this.mesh.add(helmet);

    // Face direction of travel
    this.mesh.rotation.y = direction === 1 ? 0 : Math.PI;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  /**
   * World-space position of the fat bike mesh.
   */
  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  /**
   * `true` when the bike is allowed to deal damage to the player again.
   * Prevents draining multiple lives in a single collision pass-through.
   */
  get canHitPlayer(): boolean {
    return this.hitTimer >= HIT_COOLDOWN;
  }

  /**
   * Called by `Game` when this bike's bounding box intersects the player.
   * Starts the hit cooldown timer.
   */
  onHitPlayer(): void {
    this.hitTimer = 0;
  }

  /**
   * Advance the fat bike by one frame: move, wrap at path ends, spin wheels,
   * and tick the hit-cooldown timer.
   *
   * @param delta - Elapsed time in seconds since the last frame.
   */
  update(delta: number): void {
    // Move
    this.mesh.position.z += this.speed * this.dir * delta;

    // Wrap
    if      (this.mesh.position.z >  PATH_HALF_LENGTH) this.mesh.position.z = -PATH_HALF_LENGTH;
    else if (this.mesh.position.z < -PATH_HALF_LENGTH)  this.mesh.position.z =  PATH_HALF_LENGTH;

    // Wheel spin — rotate around local X axis (which is Z in world space after
    // the z-rotation applied in the constructor; rotating the local X visually
    // rolls the wheel)
    const spinDelta = (this.speed * delta) / WHEEL_RADIUS;
    this.frontWheel.rotation.x += spinDelta * this.dir;
    this.backWheel.rotation.x  += spinDelta * this.dir;

    // Cooldown tick
    if (this.hitTimer < HIT_COOLDOWN) {
      this.hitTimer += delta;
    }
  }

  /**
   * Remove the mesh from the scene. Called when the level is cleared or reset.
   *
   * @param scene - The scene the bike was added to in the constructor.
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
