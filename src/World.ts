import * as THREE from 'three';

/**
 * Half-width of the red cycle path in world units.
 * The path spans x ∈ [−CYCLE_PATH_HALF_WIDTH, +CYCLE_PATH_HALF_WIDTH].
 * Exported so `Player` and `NPC` can constrain positions to this zone.
 */
export const CYCLE_PATH_HALF_WIDTH = 2;  // cycle path spans x ∈ [-2, +2]

/**
 * Half-length of the playable path in world units.
 * The path spans z ∈ [−PATH_HALF_LENGTH, +PATH_HALF_LENGTH].
 * NPCs wrap at these boundaries; the player is clamped inside them.
 */
export const PATH_HALF_LENGTH      = 50; // path spans z ∈ [-50, +50]

/**
 * Procedurally generates the static Amsterdam street environment and adds it
 * to the provided Three.js scene.
 *
 * Layer map (Y positions, low to high):
 * ```
 *  y = -0.02  Grass / ground plane
 *  y =  0.00  Road (asphalt)
 *  y =  0.01  Road centre-line dashes
 *  y =  0.005 Sidewalks (klinker stone)
 *  y =  0.01  Red cycle path
 *  y =  0.02  Cycle path centre dashes
 *  y = -0.03  Canals (slightly sunken)
 *  y =  0+    Buildings, lamp posts, bollards, tulips
 * ```
 *
 * All geometry is added to an internal `THREE.Group` so the world can be
 * trivially removed from or repositioned in the scene if needed.
 */
export class World {
  private readonly group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this._build();
    scene.add(this.group);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Helper that creates a horizontal (XZ-plane) flat quad and adds it to the
   * world group.
   *
   * @param width         - Extent along the X axis.
   * @param depth         - Half-extent along the Z axis (full length = depth × 2).
   * @param color         - Hex colour for the `MeshLambertMaterial`.
   * @param x             - World X centre position.
   * @param y             - World Y position (use small offsets to avoid z-fighting).
   * @param z             - World Z centre position.
   * @param receiveShadow - Whether the plane should receive cast shadows.
   * @returns The created `THREE.Mesh`.
   */
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

  /**
   * Construct the entire Amsterdam street scene.
   *
   * Called once from the constructor. Adds (in order):
   * grass base → asphalt road → road markings → klinker sidewalks →
   * red cycle path → cycle path dashes → canals → building rows →
   * lamp posts → bollards → tulips.
   */
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

  /**
   * Add a flat water plane representing one of the Amsterdam canals.
   *
   * Uses `MeshPhongMaterial` with shininess + specular to produce a subtle
   * water sheen under the directional light.
   *
   * @param x       - World X centre of the canal strip.
   * @param halfLen - Half-length of the canal (matches `PATH_HALF_LENGTH`).
   */
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

  /**
   * Add a row of narrow Amsterdam canal houses along one side of the street.
   *
   * Each building is a modest 2–4 storey structure (3–6 units tall) with:
   * - A warm brick `MeshLambertMaterial` wall.
   * - A stepped-gable roof (three stacked decreasing-width boxes), the
   *   iconic Amsterdam skyline silhouette.
   * - Window quads on each floor facade.
   *
   * @param xCenter - World X position (centre of the facade).
   * @param halfLen - Half-length to tile buildings along Z.
   */
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

  /**
   * Add a single street lamp post at the given position.
   *
   * Consists of a tapered cylinder pole and a small emissive sphere head,
   * scaled to match the short Amsterdam buildings.
   *
   * @param x - World X position.
   * @param z - World Z position.
   */
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

  /**
   * Add a single yellow bollard at the given position.
   * Bollards are placed along the edges of the cycle path to visually
   * separate it from the sidewalk.
   *
   * @param x - World X position.
   * @param z - World Z position.
   */
  private _addBollard(x: number, z: number): void {
    const geo  = new THREE.CylinderGeometry(0.11, 0.13, 0.75, 6);
    const mat  = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.375, z);
    this.group.add(mesh);
  }

  /**
   * Scatter decorative tulip flowers along both sides of the canals for
   * Amsterdam flavour.
   *
   * Each tulip is a green cylinder stem + a coloured sphere head.
   * Colours are chosen randomly from the Dutch tulip palette.
   *
   * @param halfLen - Half-length of the path; tulips are spread along this range.
   */
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
