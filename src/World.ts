import * as THREE from 'three';
import { PathSystem, Segment, CYCLE_PATH_HALF_WIDTH } from './PathSystem';

// How many world units to leave clear of canals/buildings near segment ends
const MARGIN = 10;

export class World {
  private readonly scene: THREE.Scene;
  private readonly segGroups:    Map<number, THREE.Group> = new Map();
  private readonly cornerGroups: Map<number, THREE.Group> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Remove all geometry groups from the scene and clear internal maps.
   * Call before `update()` when resetting to the start of the path.
   */
  reset(): void {
    for (const g of this.segGroups.values())    this.scene.remove(g);
    for (const g of this.cornerGroups.values()) this.scene.remove(g);
    this.segGroups.clear();
    this.cornerGroups.clear();
  }

  update(pathSystem: PathSystem): void {
    const activeIndices = new Set(pathSystem.segments.map(s => s.index));

    for (const seg of pathSystem.segments) {
      if (!this.segGroups.has(seg.index)) {
        const g = this._buildSegment(seg);
        this.scene.add(g);
        this.segGroups.set(seg.index, g);
      }
    }

    for (let i = 0; i + 1 < pathSystem.segments.length; i++) {
      const key = pathSystem.segments[i].index;
      if (!this.cornerGroups.has(key)) {
        const g = this._buildCorner(pathSystem.segments[i], pathSystem.segments[i + 1]);
        this.scene.add(g);
        this.cornerGroups.set(key, g);
      }
    }

    for (const [idx, g] of this.segGroups) {
      if (!activeIndices.has(idx)) {
        this.scene.remove(g);
        this.segGroups.delete(idx);
      }
    }
    for (const [idx, g] of this.cornerGroups) {
      if (!activeIndices.has(idx)) {
        this.scene.remove(g);
        this.cornerGroups.delete(idx);
      }
    }
  }

  private _buildSegment(seg: Segment): THREE.Group {
    const group = new THREE.Group();
    group.position.set(seg.startX, 0, seg.startZ);
    group.rotation.y = -Math.atan2(seg.dirX, -seg.dirZ);

    const L    = seg.length;
    const midZ = -(L / 2);

    const addPlane = (w: number, h: number, color: number, x: number, y: number, z: number): THREE.Mesh => {
      const geo  = new THREE.PlaneGeometry(w, h);
      const mat  = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x    = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    addPlane(60, L, 0x4a6741, 0, -0.02, midZ);
    addPlane(8,  L, 0x282828, 7,  0,    midZ);

    for (let d = 4; d < L; d += 8) {
      addPlane(0.15, 3, 0xeeeecc, 7, 0.01, -d);
    }

    addPlane(3, L, 0xb89c7a, -3.5, 0.005, midZ);
    addPlane(3, L, 0xb89c7a,  3.5, 0.005, midZ);
    addPlane(CYCLE_PATH_HALF_WIDTH * 2, L, 0xcc2200, 0, 0.01, midZ);

    for (let d = 3; d < L; d += 7) {
      addPlane(0.12, 2, 0xffffff, 0, 0.02, -d);
    }

    const iLen = L - 2 * MARGIN;
    if (iLen > 4) {
      const iMid = -(MARGIN + iLen / 2);

      this._addCanalInGroup(group, -10, iLen, iMid);
      this._addCanalInGroup(group,  14, iLen, iMid);
      this._addBuildingRow(group, -13, iLen, iMid);
      this._addBuildingRow(group,  17, iLen, iMid);

      for (let d = MARGIN + 6; d < L - MARGIN; d += 14) {
        this._addLamppost(group, -4.8, -d);
        this._addLamppost(group,  4.8, -d);
      }
      for (let d = MARGIN + 2; d < L - MARGIN; d += 5) {
        this._addBollard(group, -2.4, -d);
        this._addBollard(group,  2.4, -d);
      }
      this._addTulips(group, iLen, iMid);
    }

    return group;
  }

  private _buildCorner(seg: Segment, next: Segment): THREE.Group {
    const group = new THREE.Group();
    const cx    = seg.endX;
    const cz    = seg.endZ;

    const addPlane = (w: number, h: number, color: number, x: number, y: number, z: number): void => {
      const geo  = new THREE.PlaneGeometry(w, h);
      const mat  = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x    = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      group.add(mesh);
    };

    addPlane(50, 50, 0x4a6741, cx, -0.02, cz);

    const iRX = -seg.dirZ  as number;
    const iRZ =  seg.dirX  as number;
    const oRX = -next.dirZ as number;
    const oRZ =  next.dirX as number;

    const swX = cx + 3.5 * (iRX + oRX) * 0.5;
    const swZ = cz + 3.5 * (iRZ + oRZ) * 0.5;
    addPlane(7, 7, 0xb89c7a, swX, 0.005, swZ);

    const rAx = cx + 7 * iRX;  const rAz = cz + 7 * iRZ;
    const rBx = cx + 7 * oRX;  const rBz = cz + 7 * oRZ;
    addPlane(12, 12, 0x282828, (rAx + rBx) / 2, 0, (rAz + rBz) / 2);

    addPlane(CYCLE_PATH_HALF_WIDTH * 2 + 2, CYCLE_PATH_HALF_WIDTH * 2 + 2, 0xcc2200, cx, 0.01, cz);

    return group;
  }

  private _addCanalInGroup(group: THREE.Group, x: number, len: number, zCenter: number): void {
    const geo  = new THREE.PlaneGeometry(3.5, len);
    const mat  = new THREE.MeshPhongMaterial({ color: 0x1a6688, shininess: 70, specular: 0x66bbdd });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.03, zCenter);
    group.add(mesh);
  }

  private _addBuildingRow(group: THREE.Group, xCenter: number, len: number, zMid: number): void {
    const wallColors = [0x7a3a2a, 0x8b4230, 0x6b3020, 0x9c4b35, 0x73392b, 0x854030];
    const step   = 4.5;
    const startZ = zMid + len / 2;
    const endZ   = zMid - len / 2;

    for (let z = startZ; z > endZ; z -= step) {
      const w     = 3.2 + Math.random() * 1.4;
      const h     = 3.0 + Math.random() * 3.0;
      const d     = 4.5;
      const color = wallColors[Math.floor(Math.random() * wallColors.length)];

      const geo  = new THREE.BoxGeometry(w, h, d);
      const mat  = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xCenter, h / 2, z - d / 2);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      const gableColor = Math.random() > 0.5 ? 0x3a3028 : 0x2a2520;
      for (let s = 0; s < 3; s++) {
        const gGeo = new THREE.BoxGeometry(w * (1 - s * 0.28), 0.45, 0.45);
        const gMat = new THREE.MeshLambertMaterial({ color: gableColor });
        const gbl  = new THREE.Mesh(gGeo, gMat);
        gbl.position.set(xCenter, h + 0.225 + s * 0.45, z - 0.22);
        group.add(gbl);
      }

      const winMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a, emissive: 0x332200 });
      const floors = Math.floor(h / 1.4);
      for (let fl = 0; fl < floors; fl++) {
        const wGeo = new THREE.BoxGeometry(w * 0.28, 0.55, 0.06);
        const win  = new THREE.Mesh(wGeo, winMat);
        win.position.set(xCenter, 0.9 + fl * 1.4, z - 0.02);
        group.add(win);
      }
    }
  }

  private _addLamppost(group: THREE.Group, x: number, z: number): void {
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const pole    = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 1.5, z);
    group.add(pole);

    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: 0x443300 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, 3.15, z);
    group.add(head);
  }

  private _addBollard(group: THREE.Group, x: number, z: number): void {
    const geo  = new THREE.CylinderGeometry(0.11, 0.13, 0.75, 6);
    const mat  = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.375, z);
    group.add(mesh);
  }

  private _addTulips(group: THREE.Group, len: number, zMid: number): void {
    const flowerColors = [0xff2244, 0xff8800, 0xffee00, 0xcc00cc, 0xffffff, 0xff66aa];
    const count = Math.max(4, Math.floor(len / 5));
    for (let i = 0; i < count; i++) {
      const side  = Math.random() > 0.5 ? 1 : -1;
      const x     = side * (8 + Math.random() * 3);
      const z     = zMid + (Math.random() - 0.5) * len;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 5);
      const stemMat = new THREE.MeshLambertMaterial({ color: 0x33aa22 });
      const stem    = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(x, 0.325, z);
      group.add(stem);

      const headGeo = new THREE.SphereGeometry(0.17, 6, 5);
      const headMat = new THREE.MeshLambertMaterial({ color });
      const head    = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 0.82, z);
      group.add(head);
    }
  }
}
