import * as THREE from 'three';
import { clamp } from './utils';
import { PathSystem, CYCLE_PATH_HALF_WIDTH } from './PathSystem';

const MAX_SPEED_FWD = 12;
const MAX_SPEED_LAT = 6;
const ACCELERATION  = 22;
const FRICTION      = 18;

export class Player {
  readonly mesh: THREE.Group;

  private pathDist:  number = 5;
  private lateral:   number = 0;
  private velFwd:    number = 0;
  private velLat:    number = 0;

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

  get position(): THREE.Vector3 { return this.mesh.position; }
  get pathDistance(): number     { return this.pathDist; }

  update(delta: number): void {
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
      this.mesh.rotation.y = Math.atan2(dirX * sign, -dirZ * sign);
    }
  }

  reset(): void {
    this.pathDist = 5;
    this.lateral  = 0;
    this.velFwd   = 0;
    this.velLat   = 0;
    this.keys.clear();
    this._syncWorldPos();
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

    const helmGeo = new THREE.SphereGeometry(0.22, 8, 5);
    const helm    = new THREE.Mesh(helmGeo, orangeMat);
    helm.position.set(0, ST.y + 1.10, ST.z - 0.04);
    helm.scale.y = 0.75;
    this.mesh.add(helm);

    for (const side of [-1, 1]) {
      const armFrom = new THREE.Vector3(side * 0.19, ST.y + 0.55, ST.z - 0.02);
      const armTo   = new THREE.Vector3(side * 0.28, hbarTop.y,   hbarTop.z);
      this._tube(armFrom, armTo, 0.055, armMat);
    }

    void saddleMat; void rackMat; void skinMat;
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
