import * as THREE from 'three';
import { PATH_HALF_LENGTH } from './World';

const NPC_COLORS     = [0x2266ff, 0xff6622, 0x22cc44, 0xcc22cc, 0xffcc22, 0x11aacc];
const BODY_HEIGHT    = 1.4;
const HEAD_RADIUS    = 0.28;
const TUMBLE_DURATION = 0.45; // seconds

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

  hit(): void {
    if (!this.isAlive) return;
    this.isAlive   = false;
    this.tumbleTimer = 0;
  }

  get canDispose(): boolean {
    return !this.isAlive && this.tumbleTimer >= TUMBLE_DURATION + 0.2;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

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
