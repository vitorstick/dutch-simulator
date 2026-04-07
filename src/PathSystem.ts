import * as THREE from 'three';

/**
 * Half-width of the red cycle path in world units.
 * The player and NPCs are constrained to ±CYCLE_PATH_HALF_WIDTH in the
 * lateral (perpendicular-to-path) direction.
 */
export const CYCLE_PATH_HALF_WIDTH = 2;

/**
 * Length of the very first path segment in world units.
 * Subsequent segment pairs grow by SEGMENT_GROWTH units to form an outward
 * spiral that never self-intersects.
 */
export const SEGMENT_BASE_LENGTH = 60;

/**
 * How many world units each successive pair of segments grows.
 * With a full scene width of ~36 units this gives ~40 units of clearance
 * between adjacent spiral arms.
 */
export const SEGMENT_GROWTH = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single straight section of the infinite winding path. */
export interface Segment {
  /** Sequential index (0, 1, 2, …). */
  index:     number;
  /** Cumulative path-distance at the start of this segment. */
  startDist: number;
  /** Cumulative path-distance at the end of this segment. */
  endDist:   number;
  /** Length of this segment in world units. */
  length:    number;
  /** World X coordinate of the segment's start corner. */
  startX:    number;
  /** World Z coordinate of the segment's start corner. */
  startZ:    number;
  /** World X coordinate of the segment's end corner. */
  endX:      number;
  /** World Z coordinate of the segment's end corner. */
  endZ:      number;
  /** X component of the unit direction vector (0, +1, or −1). */
  dirX:      0 | 1 | -1;
  /** Z component of the unit direction vector (0, +1, or −1). */
  dirZ:      0 | 1 | -1;
}

// ─── Direction table ──────────────────────────────────────────────────────────
// Always turn RIGHT: North → East → South → West → North → …
const DIR_X: (0 | 1 | -1)[] = [ 0,  1,  0, -1];
const DIR_Z: (0 | 1 | -1)[] = [-1,  0,  1,  0];

// ─── PathSystem ───────────────────────────────────────────────────────────────

/**
 * Manages an infinite winding path made of straight 90°-turn segments.
 *
 * Segments are generated on demand via `ensureAhead()` and pruned via
 * `pruneBehind()`.  Both players and NPCs position themselves using
 * `getWorldPos(pathDist, lateral)` and orient using `dirAt(pathDist)`.
 *
 * Spiral shape: each new pair of segments grows by `SEGMENT_GROWTH` so the
 * path never crosses itself.
 */
export class PathSystem {
  /** All currently active segments, ordered by increasing startDist. */
  readonly segments: Segment[] = [];

  private totalGenDist = 0;
  private nextX        = 0;
  private nextZ        = 0;
  private nextSegIndex = 0;

  constructor() {
    // Pre-generate enough segments for initial world view
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  /**
   * Reset the path to its initial state (as if the game just started).
   * Call this when a level restarts so the player can go back to pathDist=5
   * without landing on a pruned (non-existent) segment.
   */
  reset(): void {
    this.segments.length = 0;
    this.totalGenDist    = 0;
    this.nextX           = 0;
    this.nextZ           = 0;
    this.nextSegIndex    = 0;
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * World XZ position for a point defined in path-space.
   *
   * @param pathDist - Cumulative distance along the path.
   * @param lateral  - Perpendicular offset from path centre.
   *                   Positive = right side (road side), negative = left.
   */
  getWorldPos(pathDist: number, lateral: number): THREE.Vector2 {
    const seg = this.segmentAt(pathDist);
    if (!seg) {
      // Past the end of generated segments — clamp to last endpoint
      const s = this.segments[this.segments.length - 1];
      if (!s) return new THREE.Vector2(0, 0);
      return new THREE.Vector2(
        s.endX + (-s.dirZ) * lateral,
        s.endZ + ( s.dirX) * lateral,
      );
    }
    const t = pathDist - seg.startDist;   // distance along this segment
    // Right-hand perpendicular: rightX = -dirZ, rightZ = dirX
    return new THREE.Vector2(
      seg.startX + seg.dirX * t + (-seg.dirZ) * lateral,
      seg.startZ + seg.dirZ * t + ( seg.dirX) * lateral,
    );
  }

  /**
   * Unit travel direction at a given path distance.
   * Returns the last segment's direction if `pathDist` is out of range.
   */
  dirAt(pathDist: number): { dirX: number; dirZ: number } {
    const seg = this.segmentAt(pathDist);
    if (!seg) {
      const s = this.segments[this.segments.length - 1];
      return s ? { dirX: s.dirX, dirZ: s.dirZ } : { dirX: 0, dirZ: -1 };
    }
    return { dirX: seg.dirX, dirZ: seg.dirZ };
  }

  /**
   * Ensure segments are generated at least `lookahead` path-units ahead of
   * the player.  Call once per frame from `Game`.
   */
  ensureAhead(playerDist: number, lookahead = 150): void {
    while (this.totalGenDist < playerDist + lookahead) {
      this.generateNext();
    }
  }

  /**
   * Discard segments more than `behind` path-units behind the player.
   * Always keeps at least 2 segments so there is always valid context.
   */
  pruneBehind(playerDist: number, behind = 100): void {
    while (
      this.segments.length > 2 &&
      this.segments[0].endDist < playerDist - behind
    ) {
      this.segments.shift();
    }
  }

  /**
   * Return the segment that contains `pathDist`, or `null` if not found.
   */
  segmentAt(pathDist: number): Segment | null {
    for (const s of this.segments) {
      if (pathDist >= s.startDist && pathDist < s.endDist) return s;
    }
    return null;
  }

  /**
   * Append the next segment to the path and return it.
   * Exposed so `World` can request segments one at a time when needed.
   */
  generateNext(): Segment {
    const idx    = this.nextSegIndex++;
    const dIdx   = idx % 4;
    const dirX   = DIR_X[dIdx];
    const dirZ   = DIR_Z[dIdx];
    // Spiral: pairs of segments grow longer to prevent self-intersection
    const length = SEGMENT_BASE_LENGTH + Math.floor(idx / 2) * SEGMENT_GROWTH;

    const seg: Segment = {
      index:     idx,
      startDist: this.totalGenDist,
      endDist:   this.totalGenDist + length,
      length,
      startX:    this.nextX,
      startZ:    this.nextZ,
      endX:      this.nextX + dirX * length,
      endZ:      this.nextZ + dirZ * length,
      dirX,
      dirZ,
    };

    this.segments.push(seg);
    this.totalGenDist = seg.endDist;
    this.nextX        = seg.endX;
    this.nextZ        = seg.endZ;
    return seg;
  }
}
