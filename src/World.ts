import * as THREE from 'three';

// ─── Public constants used by Player, NPC, NPCManager ───────────────────────
export const CYCLE_PATH_HALF_WIDTH = 2;  // cycle path spans x ∈ [-2, +2]
export const PATH_HALF_LENGTH      = 50; // path spans z ∈ [-50, +50]

export class World {
  private readonly group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this._build();
    scene.add(this.group);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private plane(
    width: number, depth: number, color: number,
    x: number, y: number, z: number,
    receiveShadow = true,
  ): THREE.Mesh {
    const geo  = new THREE.PlaneGeometry(width, depth * 2);
    const mat  = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = receiveShadow;
    this.group.add(mesh);
    return mesh;
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  private _build(): void {
    const L = PATH_HALF_LENGTH;

    // Grass / ground base
    this.plane(60, L, 0x4a6741, 0, -0.02, 0);

    // Road (asphalt, darker and more realistic)
    this.plane(8, L, 0x282828, 7, 0, 0);

    // Road markings — dashed centre line
    for (let z = -L + 3; z < L; z += 8) {
      const geo  = new THREE.PlaneGeometry(0.15, 3);
      const mat  = new THREE.MeshLambertMaterial({ color: 0xeeeecc });
      const dash = new THREE.Mesh(geo, mat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(7, 0.01, z);
      this.group.add(dash);
    }

    // Sidewalks (warm stone / klinker)
    this.plane(3, L, 0xb89c7a, -3.5, 0.005, 0);
    this.plane(3, L, 0xb89c7a,  3.5, 0.005, 0);

    // Cycle path (brick red) — slightly raised to avoid z-fighting
    this.plane(CYCLE_PATH_HALF_WIDTH * 2, L, 0xcc2200, 0, 0.01, 0);

    // Dashed centre line on cycle path
    for (let z = -L + 3; z < L; z += 7) {
      const geo  = new THREE.PlaneGeometry(0.12, 2);
      const mat  = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const dash = new THREE.Mesh(geo, mat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      this.group.add(dash);
    }

    // Canals
    this._addCanal(-10, L);
    this._addCanal( 14, L);

    // Buildings
    this._addBuildingRow(-13, L);
    this._addBuildingRow( 17, L);

    // Lamp posts (both sides of cycle path)
    for (let z = -L + 6; z < L; z += 14) {
      this._addLamppost(-4.8, z);
      this._addLamppost( 4.8, z);
    }

    // Bollards on cycle path edges
    for (let z = -L + 2; z < L; z += 5) {
      this._addBollard(-2.4, z);
      this._addBollard( 2.4, z);
    }

    this._addTulips(L);
  }

  private _addCanal(x: number, halfLen: number): void {
    const geo  = new THREE.PlaneGeometry(3.5, halfLen * 2);
    const mat  = new THREE.MeshPhongMaterial({
      color: 0x1a6688,
      shininess: 70,
      specular: 0x66bbdd,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.03, 0);
    this.group.add(mesh);
  }

  private _addBuildingRow(xCenter: number, halfLen: number): void {
    // Realistic Amsterdam brick palette — warm, dark reds/browns
    const wallColors = [0x7a3a2a, 0x8b4230, 0x6b3020, 0x9c4b35, 0x73392b, 0x854030];
    const step = 4.5;
    for (let z = -halfLen; z < halfLen; z += step) {
      // Amsterdam buildings: narrow facades, modest height (2-4 storeys)
      const w     = 3.2 + Math.random() * 1.4;  // 3.2–4.6 wide
      const h     = 3.0 + Math.random() * 3.0;  // 3–6 tall (2-4 storeys)
      const d     = 4.5;
      const color = wallColors[Math.floor(Math.random() * wallColors.length)];

      // Main wall
      const geo  = new THREE.BoxGeometry(w, h, d);
      const mat  = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xCenter, h / 2, z + d / 2);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Step-gabled roof (iconic Amsterdam silhouette)
      // Three stacked boxes decreasing in width
      const gableColor = Math.random() > 0.5 ? 0x3a3028 : 0x2a2520;
      for (let s = 0; s < 3; s++) {
        const gw  = w * (1 - s * 0.28);
        const gh  = 0.45;
        const geo = new THREE.BoxGeometry(gw, gh, 0.45);
        const mat = new THREE.MeshLambertMaterial({ color: gableColor });
        const gbl = new THREE.Mesh(geo, mat);
        gbl.position.set(xCenter, h + gh / 2 + s * gh, z + 0.22);
        this.group.add(gbl);
      }

      // Windows (small bright quads on the facade)
      const winMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a, emissive: 0x332200 });
      const floors = Math.floor(h / 1.4);
      for (let fl = 0; fl < floors; fl++) {
        const wGeo = new THREE.BoxGeometry(w * 0.28, 0.55, 0.06);
        const win  = new THREE.Mesh(wGeo, winMat);
        win.position.set(xCenter, 0.9 + fl * 1.4, z - 0.02);
        this.group.add(win);
      }
    }
  }

  private _addLamppost(x: number, z: number): void {
    // Scale lamp posts to match shorter buildings
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const pole    = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 1.5, z);
    this.group.add(pole);

    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({
      color:    0xffffee,
      emissive: 0x443300,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, 3.15, z);
    this.group.add(head);
  }

  private _addBollard(x: number, z: number): void {
    const geo  = new THREE.CylinderGeometry(0.11, 0.13, 0.75, 6);
    const mat  = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.375, z);
    this.group.add(mesh);
  }

  private _addTulips(halfLen: number): void {
    const flowerColors = [0xff2244, 0xff8800, 0xffee00, 0xcc00cc, 0xffffff, 0xff66aa];
    for (let i = 0; i < 40; i++) {
      const side  = Math.random() > 0.5 ? 1 : -1;
      const x     = side * (8 + Math.random() * 3);
      const z     = (Math.random() - 0.5) * halfLen * 2;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 5);
      const stemMat = new THREE.MeshLambertMaterial({ color: 0x33aa22 });
      const stem    = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(x, 0.325, z);
      this.group.add(stem);

      const headGeo = new THREE.SphereGeometry(0.17, 6, 5);
      const headMat = new THREE.MeshLambertMaterial({ color });
      const head    = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 0.82, z);
      this.group.add(head);
    }
  }
}
