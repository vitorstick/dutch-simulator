import * as THREE from 'three';
import { PathSystem, Segment, CYCLE_PATH_HALF_WIDTH } from './PathSystem';

// How many world units to leave clear of canals/buildings near segment ends
const MARGIN = 10;

export class World {
  private readonly scene: THREE.Scene;
  private readonly segGroups:     Map<number, THREE.Group> = new Map();
  private readonly cornerGroups:  Map<number, THREE.Group> = new Map();
  private readonly previewGroups: Map<number, THREE.Group> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Remove all geometry groups from the scene and clear internal maps.
   * Call before `update()` when resetting to the start of the path.
   */
  reset(): void {
    for (const g of this.segGroups.values())     this.scene.remove(g);
    for (const g of this.cornerGroups.values())  this.scene.remove(g);
    for (const g of this.previewGroups.values()) this.scene.remove(g);
    this.segGroups.clear();
    this.cornerGroups.clear();
    this.previewGroups.clear();
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

  /**
   * Render short "ghost" road previews for each pending junction option so
   * the player can see the fork in 3D before making their choice.
   * Pass an empty array to clear all previews when the junction is resolved.
   */
  updatePreviews(previewSegs: Segment[]): void {
    const keep = new Set(previewSegs.map(s => s.index));
    for (const [idx, g] of this.previewGroups) {
      if (!keep.has(idx)) {
        this.scene.remove(g);
        this.previewGroups.delete(idx);
      }
    }
    for (const seg of previewSegs) {
      if (!this.previewGroups.has(seg.index)) {
        const g = this._buildPreviewSegment(seg);
        this.scene.add(g);
        this.previewGroups.set(seg.index, g);
      }
    }
  }

  private _buildPreviewSegment(seg: Segment): THREE.Group {
    const group = new THREE.Group();
    group.position.set(seg.startX, 0, seg.startZ);
    group.rotation.y = -Math.atan2(seg.dirX, -seg.dirZ);

    const L    = seg.length;
    const midZ = -(L / 2);

    // Base ground
    const addPlane = (w: number, h: number, color: number, x: number, y: number, z: number): void => {
      const geo  = new THREE.PlaneGeometry(w, h);
      const mat  = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      group.add(mesh);
    };

    addPlane(22, L, 0x4a6741,  0, -0.02, midZ);  // grass base
    addPlane( 8, L, 0x1e1e1e,  7, 0,     midZ);  // road — slightly lighter than normal to signal "option"
    addPlane( 3, L, 0xb89c7a, -3.5, 0.005, midZ); // footpath
    addPlane( 3, L, 0xb89c7a,  3.5, 0.005, midZ);

    // Bike lane — orange tint to distinguish from active route
    addPlane(CYCLE_PATH_HALF_WIDTH * 2, L, 0xdd4400, 0, 0.01, midZ);

    // Dashed direction arrows every 10 units — show which way the branch goes
    for (let d = 5; d < L; d += 10) {
      addPlane(1.2, 4, 0xff9900, 0, 0.02, -d);
    }

    // Route name label at the entry of the fork
    if (seg.name) {
      this._addStreetLabel(group, seg.name, -4);
    }

    return group;
  }

  private _buildSegment(seg: Segment): THREE.Group {
    const group = new THREE.Group();
    group.position.set(seg.startX, 0, seg.startZ);
    group.rotation.y = -Math.atan2(seg.dirX, -seg.dirZ);

    const L    = seg.length;
    const midZ = -(L / 2);

    const env   = seg.environment ?? 'canal_street';
    const left  = seg.leftSide    ?? 'canal';
    const right = seg.rightSide   ?? 'canal';

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

    // Base plane — colour varies by environment
    const baseColor = env === 'plaza'  ? 0xc8b89a
                    : env === 'bridge' ? 0x777777
                    : 0x4a6741;
    addPlane(60, L, baseColor, 0, -0.02, midZ);

    // Road (omitted for open plazas)
    if (env !== 'plaza') {
      addPlane(8, L, 0x282828, 7, 0, midZ);
      for (let d = 4; d < L; d += 8) {
        addPlane(0.15, 3, 0xeeeecc, 7, 0.01, -d);
      }
    }

    // Footpaths always present
    addPlane(3, L, 0xb89c7a, -3.5, 0.005, midZ);
    addPlane(3, L, 0xb89c7a,  3.5, 0.005, midZ);

    // Bike lane always present
    addPlane(CYCLE_PATH_HALF_WIDTH * 2, L, 0xcc2200, 0, 0.01, midZ);
    for (let d = 3; d < L; d += 7) {
      addPlane(0.12, 2, 0xffffff, 0, 0.02, -d);
    }

    const iLen = L - 2 * MARGIN;
    if (iLen > 4) {
      const iMid = -(MARGIN + iLen / 2);

      if (env === 'bridge') {
        // Wide water body under the bridge
        const waterGeo = new THREE.PlaneGeometry(50, iLen);
        const waterMat = new THREE.MeshPhongMaterial({ color: 0x1a6688, shininess: 70, specular: 0x66bbdd });
        const water    = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(0, -0.05, iMid);
        group.add(water);
        this._addGuardRail(group, -5,   iLen, iMid);
        this._addGuardRail(group,  12,  iLen, iMid);
      } else {
        // Left side
        if (left === 'canal') {
          this._addCanalInGroup(group, -10, iLen, iMid);
          this._addBuildingRow(group,  -13, iLen, iMid);
        } else if (left === 'building') {
          this._addBuildingRow(group, -9, iLen, iMid);
        } else if (left === 'park') {
          addPlane(8, iLen, 0x3a7a31, -8, 0, iMid);
        }
        // 'open' / 'plaza': base plane is sufficient

        // Right side
        if (right === 'canal') {
          this._addCanalInGroup(group, 14, iLen, iMid);
          this._addBuildingRow(group,  17, iLen, iMid);
        } else if (right === 'building') {
          this._addBuildingRow(group, 13, iLen, iMid);
        } else if (right === 'park') {
          addPlane(8, iLen, 0x3a7a31, 11, 0, iMid);
        }

        // Lampposts (skip inside alleys — they're too narrow)
        if (env !== 'alley') {
          for (let d = MARGIN + 6; d < L - MARGIN; d += 14) {
            this._addLamppost(group, -4.8, -d);
            this._addLamppost(group,  4.8, -d);
          }
        }

        // Bollards
        for (let d = MARGIN + 2; d < L - MARGIN; d += 5) {
          this._addBollard(group, -2.4, -d);
          this._addBollard(group,  2.4, -d);
        }

        // Tulips (not on formal/paved surfaces)
        if (env !== 'plaza') {
          this._addTulips(group, iLen, iMid);
        }
      }

      // Landmark marker
      if (seg.landmark !== undefined && seg.landmarkT !== undefined) {
        this._addLandmarkMarker(group, -(seg.length * seg.landmarkT));
      }
    }

    // Street name labels at the entry and exit of the segment
    if (seg.name && L > 20) {
      this._addStreetLabel(group, seg.name, -6);
      this._addStreetLabel(group, seg.name, -(L - 6));
    }

    return group;
  }

  private _buildCorner(seg: Segment, _next: Segment): THREE.Group {
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

    // Grass base — covers the full gap between two perpendicular 60-wide segments
    addPlane(62, 62, 0x4a6741, cx, -0.02, cz);

    // Footpath ring — shows as a sandy border around the road pad
    addPlane(22, 22, 0xb89c7a, cx, 0.0, cz);

    // Road surface — centered, 18×18 covers a ±9 radius; road offset in segments is ±7
    // so this pad always meets both approaching road surfaces regardless of turn direction
    addPlane(18, 18, 0x282828, cx, 0.005, cz);

    // Bike-path crossing square at the very centre
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

  /** Metal guard-rail (for bridges): a horizontal bar + evenly-spaced posts. */
  private _addGuardRail(group: THREE.Group, x: number, len: number, zCenter: number): void {
    const mat    = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const barGeo = new THREE.BoxGeometry(0.08, 0.06, len);
    const bar    = new THREE.Mesh(barGeo, mat);
    bar.position.set(x, 0.9, zCenter);
    group.add(bar);

    for (let d = 1; d < len; d += 3) {
      const postGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
      const post    = new THREE.Mesh(postGeo, mat);
      post.position.set(x, 0.45, zCenter + len / 2 - d);
      group.add(post);
    }
  }

  /** Flat road-marking label with the street name, placed at local Z position `z`. */
  private _addStreetLabel(group: THREE.Group, text: string, z: number): void {
    const canvas  = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 64);
    ctx.font         = 'bold 28px Arial, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = '#000000';
    ctx.lineWidth    = 5;
    ctx.strokeText(text, 256, 34);
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(text, 256, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const geo     = new THREE.PlaneGeometry(10, 1.25);
    const mat     = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const mesh    = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.04, z);
    group.add(mesh);
  }

  /** Gold spire marking a landmark at local Z position `z`. */
  private _addLandmarkMarker(group: THREE.Group, z: number): void {
    const mat     = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x443300 });
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 7, 6);
    const pole    = new THREE.Mesh(poleGeo, mat);
    pole.position.set(9, 3.5, z);
    group.add(pole);

    const capGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const cap    = new THREE.Mesh(capGeo, mat);
    cap.position.set(9, 7.1, z);
    group.add(cap);
  }
}
