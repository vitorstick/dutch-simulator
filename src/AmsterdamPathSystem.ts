import { PathSystem, Segment } from './PathSystem';
import { AMSTERDAM_ROUTE, ROUTE_JUNCTIONS, JunctionOption, Direction } from './AmsterdamMap';

// ─── Direction mapping ────────────────────────────────────────────────────────

const DIR_MAP: Record<Direction, { dirX: 0 | 1 | -1; dirZ: 0 | 1 | -1 }> = {
  N: { dirX:  0, dirZ: -1 },
  S: { dirX:  0, dirZ:  1 },
  E: { dirX:  1, dirZ:  0 },
  W: { dirX: -1, dirZ:  0 },
};

// ─── Pre-compute route templates ─────────────────────────────────────────────

/** A resolved segment template derived from AMSTERDAM_ROUTE. */
type RouteTemplate = Omit<Segment, 'index' | 'startDist' | 'endDist'> & { length: number };

function buildRouteTemplates(): RouteTemplate[] {
  return AMSTERDAM_ROUTE.map((s) => {
    const { dirX, dirZ } = DIR_MAP[s.direction];
    const dx     = s.endX - s.startX;
    const dz     = s.endZ - s.startZ;
    const length = Math.round(Math.sqrt(dx * dx + dz * dz));

    return {
      length,
      startX:      s.startX,
      startZ:      s.startZ,
      endX:        s.endX,
      endZ:        s.endZ,
      dirX,
      dirZ,
      name:        s.name,
      environment: s.environment as string,
      leftSide:    s.leftSide   as string,
      rightSide:   s.rightSide  as string,
      landmark:    s.landmark,
      landmarkT:   s.landmarkT,
    };
  });
}

const ROUTE_TEMPLATES = buildRouteTemplates();

// ─── AmsterdamPathSystem ──────────────────────────────────────────────────────

/**
 * A graph-based path system that follows the Amsterdam canal-ring network
 * defined in `AmsterdamMap.ts`.
 *
 * At key intersections the system pauses segment generation and exposes
 * `pendingJunction` — a list of route options the player can choose from.
 * Call `chooseBranch(index)` to commit to an option and resume generation.
 * Single-option junctions (loop-back, branch re-entries) are resolved
 * automatically without player input.
 *
 * Path distances grow monotonically regardless of which branches are taken,
 * so all existing `getWorldPos` / `dirAt` / `segmentAt` logic is unchanged.
 */
export class AmsterdamPathSystem extends PathSystem {
  /** Index into ROUTE_TEMPLATES for the *next* segment to generate. */
  private _cursor = 0;

  /**
   * Non-null while waiting for the player to choose a branch.
   * Always has ≥ 2 options (single-option junctions auto-resolve).
   */
  private _pendingJunction: JunctionOption[] | null = null;

  constructor() {
    super(false);
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Options the player must choose between at the upcoming junction, or null. */
  get pendingJunction(): JunctionOption[] | null { return this._pendingJunction; }

  /**
   * Short preview segments (≤ 45 units) representing the first stretch of
   * each branch option at the current pending junction.  These use negative
   * indices so World.ts can render them without confusing them with active
   * path segments.  Returns an empty array when there is no pending junction.
   */
  get previewSegments(): Segment[] {
    if (!this._pendingJunction) return [];
    const lastSeg = this.segments[this.segments.length - 1];
    return this._pendingJunction.map((opt, i) => {
      const tmpl = ROUTE_TEMPLATES[opt.nextTemplateIndex];
      if (!tmpl) return null;
      const previewLen = Math.min(tmpl.length, 45);
      return {
        ...tmpl,
        index:     -(i + 1),
        startDist: lastSeg.endDist,
        endDist:   lastSeg.endDist + previewLen,
        length:    previewLen,
        endX:      tmpl.startX + tmpl.dirX * previewLen,
        endZ:      tmpl.startZ + tmpl.dirZ * previewLen,
      } as Segment;
    }).filter((s): s is Segment => s !== null);
  }

  /**
   * Commit to one of the pending junction options and resume generation.
   * @param optionIndex - Index into `pendingJunction`.
   */
  chooseBranch(optionIndex: number): void {
    if (!this._pendingJunction) return;
    const opt = this._pendingJunction[optionIndex] ?? this._pendingJunction[0];
    this._cursor          = opt.nextTemplateIndex;
    this._pendingJunction = null;
    this.generateNext();
  }

  // ─── PathSystem overrides ─────────────────────────────────────────────────

  override reset(): void {
    this.segments.length  = 0;
    this.totalGenDist     = 0;
    this.nextX            = 0;
    this.nextZ            = 0;
    this.nextSegIndex     = 0;
    this._cursor          = 0;
    this._pendingJunction = null;
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  /**
   * Stop generating once a multi-option junction is pending — the player
   * must make a choice before the path can extend further.
   */
  override ensureAhead(playerDist: number, lookahead = 150): void {
    while (this.totalGenDist < playerDist + lookahead && !this._pendingJunction) {
      this.generateNext();
    }
  }

  override generateNext(): Segment {
    // Do not generate while a player choice is outstanding.
    if (this._pendingJunction) {
      return this.segments[this.segments.length - 1];
    }

    const templateIdx = this._cursor;
    const tmpl        = ROUTE_TEMPLATES[templateIdx];

    if (!tmpl) {
      // Safety fallback: if cursor somehow points out of bounds, loop to 0.
      this._cursor = 0;
      return this.generateNext();
    }

    const seg: Segment = {
      ...tmpl,
      index:     this.nextSegIndex++,
      startDist: this.totalGenDist,
      endDist:   this.totalGenDist + tmpl.length,
    };

    this.segments.push(seg);
    this.totalGenDist = seg.endDist;

    // Determine the next cursor from the junction graph.
    const jxn = ROUTE_JUNCTIONS[templateIdx];
    if (jxn) {
      if (jxn.length === 1) {
        // Auto-continue (loop back or branch re-entry).
        this._cursor = jxn[0].nextTemplateIndex;
      } else {
        // Multi-option: pause and wait for player.
        this._pendingJunction = jxn;
        this._cursor          = -1;
      }
    } else {
      this._cursor = templateIdx + 1;
    }

    return seg;
  }
}

