import * as THREE from 'three';
import { PathSystem } from './PathSystem';

const NPC_COLORS      = [0x2266ff, 0xff6622, 0x22cc44, 0xcc22cc, 0xffcc22, 0x11aacc];
const BODY_HEIGHT     = 1.4;
const HEAD_RADIUS     = 0.28;
const TUMBLE_DURATION = 0.45;

export class NPC {
  readonly mesh: THREE.Group;
  isAlive = true;

  private pathDist:  number;
  private lateral:   number;
  private readonly speed: number;
  readonly dir: 1 | -1;
  private readonly bodyMesh: THREE.Mesh;
  private tumbleTimer = 0;

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

    const color = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];

    const bodyGeo = new THREE.BoxGeometry(0.5, BODY_HEIGHT, 0.38);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = BODY_HEIGHT / 2;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    const headGeo = new THREE.SphereGeometry(HEAD_RADIUS, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = BODY_HEIGHT + HEAD_RADIUS;
    head.castShadow  = true;
    this.mesh.add(head);

    const hatGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.15, 8);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const hat    = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = BODY_HEIGHT + HEAD_RADIUS * 2 + 0.05;
    this.mesh.add(hat);

    scene.add(this.mesh);
    this._syncPos(pathSystem);
  }

  get pathDistance(): number { return this.pathDist; }
  get position(): THREE.Vector3 { return this.mesh.position; }

  get canDispose(): boolean {
    return !this.isAlive && this.tumbleTimer >= TUMBLE_DURATION + 0.2;
  }

  update(delta: number, pathSystem: PathSystem): void {
    if (!this.isAlive) {
      this._animateTumble(delta);
      return;
    }

    this.pathDist += this.speed * this.dir * delta;
    this._syncPos(pathSystem);

    this.bodyMesh.position.y =
      BODY_HEIGHT / 2 + Math.abs(Math.sin(this.pathDist * 4)) * 0.05;
  }

  recycleNear(playerDist: number, pathSystem: PathSystem): void {
    this.pathDist = playerDist + 10 + Math.random() * 30;
    this._syncPos(pathSystem);
  }

  hit(): void {
    if (!this.isAlive) return;
    this.isAlive    = false;
    this.tumbleTimer = 0;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  private _syncPos(pathSystem: PathSystem): void {
    const pos = pathSystem.getWorldPos(this.pathDist, this.lateral);
    this.mesh.position.set(pos.x, 0, pos.y);

    const { dirX, dirZ } = pathSystem.dirAt(this.pathDist);
    this.mesh.rotation.y = Math.atan2(-dirX * this.dir, -dirZ * this.dir);
  }

  private _animateTumble(delta: number): void {
    this.tumbleTimer += delta;
    const t = Math.min(this.tumbleTimer / TUMBLE_DURATION, 1);
    this.mesh.rotation.z = t * Math.PI;
    this.mesh.position.y = Math.sin(t * Math.PI) * 1.2;
    if (t >= 1) this.mesh.visible = false;
  }
}
