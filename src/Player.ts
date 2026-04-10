import * as THREE from 'three';
import { clamp } from './utils';
import { PathSystem, CYCLE_PATH_HALF_WIDTH } from './PathSystem';

const MAX_SPEED_FWD  = 12;
const MAX_SPEED_LAT  = 6;
const ACCELERATION   = 22;
const FRICTION       = 18;
const HIT_DURATION   = 0.55;  // seconds the knockback animation plays
const HIT_KNOCKBACK  = -6;    // fwd impulse applied on impact (pushes backward)
const HIT_LAT_RANGE  = 4;     // max random lateral impulse on impact

export type BikeType = 'regular' | 'bakfiets';

export class Player {
  readonly mesh: THREE.Group;
  private bikeType: BikeType = 'regular';

  private pathDist:  number = 5;
  private lateral:   number = 0;
  private velFwd:    number = 0;
  private velLat:    number = 0;

  // Hit-animation state
  private hitTimer:    number  = 0;
  private isHit:       boolean = false;

  private readonly pathSystem: PathSystem;
  private readonly keys = new Set<string>();

  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp:   (e: KeyboardEvent) => void;

  constructor(scene: THREE.Scene, pathSystem: PathSystem) {
    this.pathSystem = pathSystem;
    this.mesh = new THREE.Group();
    this._buildMesh();
    scene.add(this.mesh);

    this._onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code);
    this._onKeyUp   = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);

    this._syncWorldPos();
  }

  get currentBikeType(): BikeType { return this.bikeType; }

  setBikeType(type: BikeType): void {
    if (this.bikeType === type) return;
    this.bikeType = type;
    this._buildMesh();
  }

  get position(): THREE.Vector3 { return this.mesh.position; }
  get pathDistance(): number     { return this.pathDist; }
  /** True while the knockback animation is playing — input is locked. */
  get isBeingHit(): boolean      { return this.isHit; }

  /**
   * Trigger the fat-bike knockback animation.
   * Applies a backward velocity impulse + random lateral shove.
   */
  hitByFatBike(): void {
    if (this.isHit) return;  // don't interrupt ongoing animation
    this.isHit    = true;
    this.hitTimer = 0;
    // Velocity impulse: sent flying backward and to one side
    this.velFwd = HIT_KNOCKBACK;
    this.velLat = (Math.random() - 0.5) * 2 * HIT_LAT_RANGE;
  }

  update(delta: number): void {
    // ── Hit animation (locks input) ────────────────────────────────────────
    if (this.isHit) {
      this.hitTimer += delta;
      const t = Math.min(this.hitTimer / HIT_DURATION, 1);

      // Velocity still applies so the bike slides backward during tumble
      this.pathDist += this.velFwd * delta;
      this.lateral  += this.velLat * delta;
      if (this.pathDist < 0) { this.pathDist = 0; this.velFwd = 0; }
      this.lateral = clamp(this.lateral, -(CYCLE_PATH_HALF_WIDTH - 0.5), CYCLE_PATH_HALF_WIDTH - 0.5);

      // Friction during tumble
      const decF = Math.min(FRICTION * delta, Math.abs(this.velFwd));
      this.velFwd -= Math.sign(this.velFwd) * decF;
      const decL = Math.min(FRICTION * delta, Math.abs(this.velLat));
      this.velLat -= Math.sign(this.velLat) * decL;

      this._syncWorldPos();

      // Spin 360° on Z, arc up then back to ground
      this.mesh.rotation.z = Math.sin(t * Math.PI) * Math.PI;
      this.mesh.position.y = Math.sin(t * Math.PI) * 1.8;

      if (t >= 1) {
        this.isHit             = false;
        this.mesh.rotation.z   = 0;
        this.mesh.position.y   = 0;
      }
      return;
    }

    const fwd = (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    ? 1
              : (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  ? -1 : 0;
    const lat = (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ? 1
              : (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  ? -1 : 0;

    if (fwd !== 0) {
      this.velFwd += fwd * ACCELERATION * delta;
    } else {
      const spd = Math.abs(this.velFwd);
      if (spd > 0) {
        const dec = Math.min(FRICTION * delta, spd);
        this.velFwd *= 1 - dec / spd;
      }
    }
    if (lat !== 0) {
      this.velLat += lat * ACCELERATION * delta;
    } else {
      const spd = Math.abs(this.velLat);
      if (spd > 0) {
        const dec = Math.min(FRICTION * delta, spd);
        this.velLat *= 1 - dec / spd;
      }
    }

    if (Math.abs(this.velFwd) > MAX_SPEED_FWD) this.velFwd = Math.sign(this.velFwd) * MAX_SPEED_FWD;
    if (Math.abs(this.velLat) > MAX_SPEED_LAT) this.velLat = Math.sign(this.velLat) * MAX_SPEED_LAT;

    this.pathDist += this.velFwd * delta;
    this.lateral  += this.velLat * delta;

    if (this.pathDist < 0) { this.pathDist = 0; this.velFwd = 0; }
    this.lateral = clamp(this.lateral, -(CYCLE_PATH_HALF_WIDTH - 0.5), CYCLE_PATH_HALF_WIDTH - 0.5);

    this._syncWorldPos();

    const { dirX, dirZ } = this.pathSystem.dirAt(this.pathDist);
    if (Math.abs(this.velFwd) > 0.5 || Math.abs(this.velLat) > 0.5) {
      const sign = this.velFwd >= 0 ? 1 : -1;
      this.mesh.rotation.y = Math.atan2(-dirX * sign, -dirZ * sign);
    }
  }

  /** Full reset: teleport back to path start and clear all motion. */
  reset(): void {
    this.pathDist = 5;
    this.lateral  = 0;
    this.velFwd   = 0;
    this.velLat   = 0;
    this.keys.clear();
    this._syncWorldPos();
  }

  /** Soft reset: keep current position but clear velocity and held keys. */
  softReset(): void {
    this.velFwd = 0;
    this.velLat = 0;
    this.keys.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  private _syncWorldPos(): void {
    const pos = this.pathSystem.getWorldPos(this.pathDist, this.lateral);
    this.mesh.position.x = pos.x;
    this.mesh.position.z = pos.y;   // Vector2.y == world Z
  }

  private _buildMesh(): void {
    // Clear out existing mesh children before rebuilding
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      this.mesh.remove(child);
    }
    if (this.bikeType === 'regular') {
      this._buildRegularBike();
    } else {
      this._buildBakfiets();
    }
  }

  private _buildRegularBike(): void {
    const orangeMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    const blackMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const skinMat   = new THREE.MeshLambertMaterial({ color: 0xffcc88 });
    const saddleMat = new THREE.MeshLambertMaterial({ color: 0x1a1008 });
    const rackMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const armMat    = new THREE.MeshLambertMaterial({ color: 0xff7722 });

    const WR = 0.34;

    const RA = new THREE.Vector3(0, WR,   0.50);
    const FA = new THREE.Vector3(0, WR,  -0.50);
    const BB = new THREE.Vector3(0, 0.32, 0.08);
    const ST = new THREE.Vector3(0, 0.90, 0.18);
    const HT = new THREE.Vector3(0, 0.74, -0.42);
    const HB = new THREE.Vector3(0, 0.48, -0.36);

    const tireGeo = new THREE.TorusGeometry(WR,        0.075, 6, 18);
    const rimGeo  = new THREE.TorusGeometry(WR * 0.72, 0.025, 6, 18);
    const hubGeo  = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);

    for (const axlePos of [RA, FA]) {
      const tire = new THREE.Mesh(tireGeo, blackMat);
      const rim  = new THREE.Mesh(rimGeo,  chromeMat);
      const hub  = new THREE.Mesh(hubGeo,  chromeMat);
      tire.rotation.y = Math.PI / 2;
      rim.rotation.y  = Math.PI / 2;
      hub.rotation.z  = Math.PI / 2;
      tire.position.copy(axlePos);
      rim.position.copy(axlePos);
      hub.position.copy(axlePos);
      tire.castShadow = true;
      this.mesh.add(tire, rim, hub);
    }

    this._tube(BB, ST,  0.050, orangeMat);
    this._tube(BB, HB,  0.052, orangeMat);
    this._tube(ST, HT,  0.042, orangeMat);
    this._tube(BB, RA,  0.036, orangeMat);
    this._tube(ST, RA,  0.034, orangeMat);
    this._tube(HB, FA,  0.040, chromeMat);

    const hbarTop = new THREE.Vector3(0, 0.93, -0.43);
    this._tube(HT, hbarTop, 0.032, chromeMat);
    const barGeo = new THREE.BoxGeometry(0.60, 0.06, 0.06);
    const bar    = new THREE.Mesh(barGeo, chromeMat);
    bar.position.copy(hbarTop);
    this.mesh.add(bar);

    const saddleGeo = new THREE.BoxGeometry(0.28, 0.06, 0.55);
    const saddle    = new THREE.Mesh(saddleGeo, saddleMat);
    saddle.position.set(0, ST.y + 0.08, ST.z);
    this.mesh.add(saddle);

    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6);
    const seatPost = new THREE.Mesh(postGeo, chromeMat);
    seatPost.position.set(0, ST.y - 0.05, ST.z);
    this.mesh.add(seatPost);

    const rackGeo = new THREE.BoxGeometry(0.36, 0.04, 0.45);
    const rack    = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(0, RA.y + 0.52, RA.z);
    this.mesh.add(rack);

    const hipGeo = new THREE.BoxGeometry(0.34, 0.30, 0.28);
    const hips   = new THREE.Mesh(hipGeo, orangeMat);
    hips.position.set(0, ST.y + 0.23, ST.z + 0.06);
    hips.castShadow = true;
    this.mesh.add(hips);

    const torsoGeo = new THREE.BoxGeometry(0.38, 0.46, 0.32);
    const torso    = new THREE.Mesh(torsoGeo, orangeMat);
    torso.position.set(0, ST.y + 0.62, ST.z + 0.02);
    torso.castShadow = true;
    this.mesh.add(torso);

    const headGeo = new THREE.SphereGeometry(0.20, 8, 6);
    const head    = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, ST.y + 1.05, ST.z - 0.04);
    head.castShadow = true;
    this.mesh.add(head);

    // Hair: replace helmet with a simple blond hair mesh (helmetless Dutch cyclist)
    const hairMat = new THREE.MeshLambertMaterial({ color: 0xffe082 });
    const hairGeo = new THREE.SphereGeometry(0.22, 8, 5);
    const hair    = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, ST.y + 1.08, ST.z - 0.04);
    hair.scale.set(1, 0.82, 1);
    hair.castShadow = true;
    this.mesh.add(hair);

    for (const side of [-1, 1]) {
      const armFrom = new THREE.Vector3(side * 0.19, ST.y + 0.55, ST.z - 0.02);
      const armTo   = new THREE.Vector3(side * 0.28, hbarTop.y,   hbarTop.z);
      this._tube(armFrom, armTo, 0.055, armMat);
    }
  }

  private _buildBakfiets(): void {
    const orangeMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    const blackMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const skinMat   = new THREE.MeshLambertMaterial({ color: 0xffcc88 });
    const saddleMat = new THREE.MeshLambertMaterial({ color: 0x1a1008 });
    const woodMat   = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const armMat    = new THREE.MeshLambertMaterial({ color: 0xff7722 });
    const kidShirtMat = new THREE.MeshLambertMaterial({ color: 0x33aaee });

    const WR = 0.34;
    // Front wheel is smaller on a bakfiets, and pushed further forward
    const FWR = 0.26;

    const RA = new THREE.Vector3(0, WR,   0.50);
    const FA = new THREE.Vector3(0, FWR, -1.15);
    const BB = new THREE.Vector3(0, 0.32, 0.08);
    const ST = new THREE.Vector3(0, 0.90, 0.18);
    const HT = new THREE.Vector3(0, 0.74, -0.22);
    const HB = new THREE.Vector3(0, 0.48, -0.16);

    // Rear wheel
    const rTireGeo = new THREE.TorusGeometry(WR, 0.075, 6, 18);
    const rRimGeo  = new THREE.TorusGeometry(WR * 0.72, 0.025, 6, 18);
    const hubGeo   = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
    const rTire    = new THREE.Mesh(rTireGeo, blackMat);
    const rRim     = new THREE.Mesh(rRimGeo, chromeMat);
    const rHub     = new THREE.Mesh(hubGeo, chromeMat);
    rTire.rotation.y = Math.PI / 2; rRim.rotation.y = Math.PI / 2; rHub.rotation.z = Math.PI / 2;
    rTire.position.copy(RA); rRim.position.copy(RA); rHub.position.copy(RA);
    rTire.castShadow = true;
    this.mesh.add(rTire, rRim, rHub);

    // Front wheel
    const fTireGeo = new THREE.TorusGeometry(FWR, 0.065, 6, 18);
    const fRimGeo  = new THREE.TorusGeometry(FWR * 0.72, 0.02, 6, 18);
    const fTire    = new THREE.Mesh(fTireGeo, blackMat);
    const fRim     = new THREE.Mesh(fRimGeo, chromeMat);
    const fHub     = new THREE.Mesh(hubGeo, chromeMat);
    fTire.rotation.y = Math.PI / 2; fRim.rotation.y = Math.PI / 2; fHub.rotation.z = Math.PI / 2;
    fTire.position.copy(FA); fRim.position.copy(FA); fHub.position.copy(FA);
    fTire.castShadow = true;
    this.mesh.add(fTire, fRim, fHub);

    // Frame
    this._tube(BB, ST, 0.050, orangeMat);
    this._tube(BB, HB, 0.052, orangeMat);
    this._tube(ST, HT, 0.042, orangeMat);
    this._tube(BB, RA, 0.036, orangeMat);
    this._tube(ST, RA, 0.034, orangeMat);
    // Huge link from bottom bracket to front
    const bottomFront = new THREE.Vector3(0, FA.y, FA.z + 0.1);
    this._tube(HB, bottomFront, 0.050, orangeMat);
    this._tube(bottomFront, FA, 0.040, chromeMat);

    // Handlebars
    const hbarTop = new THREE.Vector3(0, 0.93, -0.33);
    this._tube(HT, hbarTop, 0.032, chromeMat);
    const barGeo = new THREE.BoxGeometry(0.60, 0.06, 0.06);
    const bar    = new THREE.Mesh(barGeo, chromeMat);
    bar.position.copy(hbarTop);
    this.mesh.add(bar);

    // Saddle
    const saddleGeo = new THREE.BoxGeometry(0.28, 0.06, 0.55);
    const saddle    = new THREE.Mesh(saddleGeo, saddleMat);
    saddle.position.set(0, ST.y + 0.08, ST.z);
    this.mesh.add(saddle);

    // Rider ----------------------------------------------------
    const hipGeo = new THREE.BoxGeometry(0.34, 0.30, 0.28);
    const hips   = new THREE.Mesh(hipGeo, orangeMat);
    hips.position.set(0, ST.y + 0.23, ST.z + 0.06);
    hips.castShadow = true;
    this.mesh.add(hips);

    const torsoGeo = new THREE.BoxGeometry(0.38, 0.46, 0.32);
    const torso    = new THREE.Mesh(torsoGeo, orangeMat);
    torso.position.set(0, ST.y + 0.62, ST.z + 0.02);
    torso.castShadow = true;
    this.mesh.add(torso);

    const headGeo = new THREE.SphereGeometry(0.20, 8, 6);
    const head    = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, ST.y + 1.05, ST.z - 0.04);
    head.castShadow = true;
    this.mesh.add(head);

    const hairMat = new THREE.MeshLambertMaterial({ color: 0xffe082 });
    const hairGeo = new THREE.SphereGeometry(0.22, 8, 5);
    const hair    = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, ST.y + 1.08, ST.z - 0.04);
    hair.scale.set(1, 0.82, 1);
    hair.castShadow = true;
    this.mesh.add(hair);

    for (const side of [-1, 1]) {
      const armFrom = new THREE.Vector3(side * 0.19, ST.y + 0.55, ST.z - 0.02);
      const armTo   = new THREE.Vector3(side * 0.28, hbarTop.y,   hbarTop.z);
      this._tube(armFrom, armTo, 0.055, armMat);
    }

    // Wooden Box (Bak) -----------------------------------------
    const boxLen = 0.75;
    const boxWid = 0.56;
    const boxH   = 0.44;
    const boxPos = new THREE.Vector3(0, bottomFront.y + 0.24, bottomFront.z + 0.40);
    
    // Bottom
    const bakBot = new THREE.Mesh(new THREE.BoxGeometry(boxWid, 0.04, boxLen), woodMat);
    bakBot.position.set(0, -boxH/2, 0);
    // Walls
    const bakFront = new THREE.Mesh(new THREE.BoxGeometry(boxWid, boxH, 0.04), woodMat);
    bakFront.position.set(0, 0, -boxLen/2);
    const bakRear = new THREE.Mesh(new THREE.BoxGeometry(boxWid, boxH, 0.04), woodMat);
    bakRear.position.set(0, 0, boxLen/2);
    const bakL = new THREE.Mesh(new THREE.BoxGeometry(0.04, boxH, boxLen), woodMat);
    bakL.position.set(-boxWid/2, 0, 0);
    const bakR = new THREE.Mesh(new THREE.BoxGeometry(0.04, boxH, boxLen), woodMat);
    bakR.position.set(boxWid/2, 0, 0);

    const bakGroup = new THREE.Group();
    bakGroup.add(bakBot, bakFront, bakRear, bakL, bakR);
    bakGroup.position.copy(boxPos);
    bakGroup.castShadow = true;
    
    // Kid in the box
    const kidTorso = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.16), kidShirtMat);
    kidTorso.position.set(0, boxH/2 - 0.1, 0);
    const kidHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skinMat);
    kidHead.position.set(0, boxH/2 + 0.08, 0);
    const kidHair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 5), new THREE.MeshLambertMaterial({color: 0x8b4513}));
    kidHair.position.set(0, boxH/2 + 0.10, -0.01);
    kidHair.scale.set(1, 0.8, 1);
    
    bakGroup.add(kidTorso, kidHead, kidHair);

    this.mesh.add(bakGroup);
  }


  private _tube(
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    mat: THREE.Material,
  ): void {
    const dir    = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const geo    = new THREE.CylinderGeometry(radius, radius, length, 6);
    const mesh   = new THREE.Mesh(geo, mat);

    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const up = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(up, dir.normalize());

    mesh.castShadow = true;
    this.mesh.add(mesh);
  }
}
