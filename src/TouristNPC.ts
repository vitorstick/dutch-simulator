import * as THREE from 'three';
import { NPC } from './NPC';
import { PathSystem } from './PathSystem';

const SUITCASE_COLORS = [0xff3333, 0x3366ff, 0xff8800, 0xaadd00, 0xdd44dd, 0x00ccbb];

const TROLLEY_X         = 0.55;  // lateral offset to the right in local space
const TROLLEY_Z         = 0.12;  // slightly behind
const SUITCASE_W        = 0.28;
const SUITCASE_H        = 0.44;
const SUITCASE_D        = 0.18;

export class TouristNPC extends NPC {
  constructor(
    scene:      THREE.Scene,
    speed:      number,
    direction:  1 | -1,
    pathDist:   number,
    lateral:    number,
    pathSystem: PathSystem,
  ) {
    super(scene, speed, direction, pathDist, lateral, pathSystem);
    this._buildTrolley();
  }

  private _buildTrolley(): void {
    const color      = SUITCASE_COLORS[Math.floor(Math.random() * SUITCASE_COLORS.length)];
    const grayMat    = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const darkMat    = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const suitcaseMat = new THREE.MeshLambertMaterial({ color });

    // ── Suitcase body ─────────────────────────────────────────────────────────
    const suitcaseGeo = new THREE.BoxGeometry(SUITCASE_W, SUITCASE_H, SUITCASE_D);
    const suitcase    = new THREE.Mesh(suitcaseGeo, suitcaseMat);
    suitcase.position.set(TROLLEY_X, SUITCASE_H / 2 + 0.05, TROLLEY_Z);
    suitcase.castShadow = true;
    this.mesh.add(suitcase);

    // ── Suitcase stripe detail ────────────────────────────────────────────────
    const stripeGeo = new THREE.BoxGeometry(SUITCASE_W + 0.01, 0.04, SUITCASE_D + 0.01);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const stripe    = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(TROLLEY_X, SUITCASE_H * 0.55, TROLLEY_Z);
    this.mesh.add(stripe);

    // ── Wheels (two at base) ──────────────────────────────────────────────────
    const wheelGeo = new THREE.CylinderGeometry(0.045, 0.045, SUITCASE_D + 0.06, 8);
    for (const dz of [-0.07, 0.07]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(TROLLEY_X, 0.045, TROLLEY_Z + dz);
      this.mesh.add(wheel);
    }

    // ── Telescoping handle rod ────────────────────────────────────────────────
    const rodGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04);
    const rod    = new THREE.Mesh(rodGeo, grayMat);
    rod.position.set(TROLLEY_X, SUITCASE_H + 0.05 + 0.19, TROLLEY_Z);
    this.mesh.add(rod);

    // ── Grip bar at top of handle ─────────────────────────────────────────────
    const gripGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
    const grip    = new THREE.Mesh(gripGeo, grayMat);
    grip.position.set(TROLLEY_X, SUITCASE_H + 0.05 + 0.38, TROLLEY_Z);
    this.mesh.add(grip);

    // ── Arm from NPC body to grip ─────────────────────────────────────────────
    const armLen = TROLLEY_X - 0.1;
    const armGeo = new THREE.BoxGeometry(armLen, 0.04, 0.04);
    const arm    = new THREE.Mesh(armGeo, grayMat);
    arm.position.set(0.1 + armLen / 2, SUITCASE_H + 0.05 + 0.34, TROLLEY_Z);
    this.mesh.add(arm);
  }
}
