import * as THREE from 'three';
import { PathSystem } from './PathSystem';

const HIT_COOLDOWN    = 2.0;
const WHEEL_COLOR     = 0x111111;
const WHEEL_RADIUS    = 0.42;
const WHEEL_WIDTH     = 0.38;
const FAT_BIKE_COLORS = [0xff3300, 0xee1100, 0xff6600, 0xcc0033];

export class FatBikeNPC {
  readonly mesh: THREE.Group;

  private readonly speed:      number;
  readonly dir:                1 | -1;
  private pathDist:            number;
  private readonly lateral:    number;
  private readonly frontWheel: THREE.Mesh;
  private readonly backWheel:  THREE.Mesh;
  private hitTimer = HIT_COOLDOWN;

  constructor(
    scene:      THREE.Scene,
    speed:      number,
    direction:  1 | -1,
    pathDist:   number,
    lateral:    number,
    pathSystem: PathSystem,
  ) {
    this.speed    = speed;
    this.dir      = direction;
    this.pathDist = pathDist;
    this.lateral  = lateral;
    this.mesh     = new THREE.Group();

    const color = FAT_BIKE_COLORS[Math.floor(Math.random() * FAT_BIKE_COLORS.length)];

    const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 14);
    const wheelMat = new THREE.MeshLambertMaterial({ color: WHEEL_COLOR });

    this.frontWheel            = new THREE.Mesh(wheelGeo, wheelMat);
    this.frontWheel.rotation.z = Math.PI / 2;
    this.frontWheel.position.set(0, WHEEL_RADIUS, 0.48);
    this.frontWheel.castShadow = true;

    this.backWheel             = new THREE.Mesh(wheelGeo, wheelMat);
    this.backWheel.rotation.z  = Math.PI / 2;
    this.backWheel.position.set(0, WHEEL_RADIUS, -0.48);
    this.backWheel.castShadow  = true;

    this.mesh.add(this.frontWheel, this.backWheel);

    const treadGeo = new THREE.TorusGeometry(WHEEL_RADIUS, 0.06, 8, 14);
    const treadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const wz of [0.48, -0.48]) {
      const tread = new THREE.Mesh(treadGeo, treadMat);
      tread.position.set(0, WHEEL_RADIUS, wz);
      this.mesh.add(tread);
    }

    const frameGeo = new THREE.BoxGeometry(0.22, 0.18, 0.95);
    const frameMat = new THREE.MeshLambertMaterial({ color });
    const frame    = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, WHEEL_RADIUS + 0.18, 0);
    frame.castShadow = true;
    this.mesh.add(frame);

    const postGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const postMat = new THREE.MeshLambertMaterial({ color });
    const post    = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, WHEEL_RADIUS + 0.45, 0.42);
    this.mesh.add(post);

    const barGeo = new THREE.BoxGeometry(0.55, 0.08, 0.08);
    const bar    = new THREE.Mesh(barGeo, postMat);
    bar.position.set(0, WHEEL_RADIUS + 0.62, 0.42);
    this.mesh.add(bar);

    const torsoGeo = new THREE.BoxGeometry(0.36, 0.55, 0.42);
    const torsoMat = new THREE.MeshLambertMaterial({ color });
    const torso    = new THREE.Mesh(torsoGeo, torsoMat);
    torso.rotation.x = 0.45;
    torso.position.set(0, 1.35, 0.05);
    torso.castShadow = true;
    this.mesh.add(torso);

    const headGeo = new THREE.SphereGeometry(0.21, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.78, 0.22);
    head.castShadow = true;
    this.mesh.add(head);

    const helmGeo = new THREE.SphereGeometry(0.24, 8, 5);
    const helmMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const helm    = new THREE.Mesh(helmGeo, helmMat);
    helm.position.set(0, 1.88, 0.18);
    helm.scale.y = 0.68;
    this.mesh.add(helm);

    scene.add(this.mesh);
    this._syncPos(pathSystem);
  }

  get position(): THREE.Vector3 { return this.mesh.position; }
  get pathDistance(): number     { return this.pathDist; }

  get canHitPlayer(): boolean {
    return this.hitTimer >= HIT_COOLDOWN;
  }

  onHitPlayer(): void {
    this.hitTimer = 0;
  }

  update(delta: number, pathSystem: PathSystem): void {
    this.pathDist += this.speed * this.dir * delta;
    this._syncPos(pathSystem);

    const spinDelta = (this.speed * delta) / WHEEL_RADIUS;
    this.frontWheel.rotation.x += spinDelta * this.dir;
    this.backWheel.rotation.x  += spinDelta * this.dir;

    if (this.hitTimer < HIT_COOLDOWN) {
      this.hitTimer += delta;
    }
  }

  recycleNear(playerDist: number, pathSystem: PathSystem): void {
    if (this.dir === -1) {
      // Oncoming: spawn ahead of player
      this.pathDist = playerDist + 30 + Math.random() * 40;
    } else {
      // Same direction: spawn behind player so it catches up / player passes
      this.pathDist = playerDist - 20 - Math.random() * 20;
    }
    this._syncPos(pathSystem);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  private _syncPos(pathSystem: PathSystem): void {
    const pos = pathSystem.getWorldPos(this.pathDist, this.lateral);
    this.mesh.position.set(pos.x, 0, pos.y);

    const { dirX, dirZ } = pathSystem.dirAt(this.pathDist);
    this.mesh.rotation.y = Math.atan2(dirX * this.dir, -dirZ * this.dir);
  }
}
