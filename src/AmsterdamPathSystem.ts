import { PathSystem, Segment } from './PathSystem';
import { AMSTERDAM_ROUTE, Direction } from './AmsterdamMap';

// ─── Direction mapping ────────────────────────────────────────────────────────

const DIR_MAP: Record<Direction, { dirX: 0 | 1 | -1; dirZ: 0 | 1 | -1 }> = {
  N: { dirX:  0, dirZ: -1 },
  S: { dirX:  0, dirZ:  1 },
  E: { dirX:  1, dirZ:  0 },
  W: { dirX: -1, dirZ:  0 },
};

// ─── Pre-compute route templates ─────────────────────────────────────────────

/** A resolved segment template derived from AMSTERDAM_ROUTE. */
type RouteTemplate = Segment;

function buildRouteTemplates(): RouteTemplate[] {
  let dist = 0;
  return AMSTERDAM_ROUTE.map((s, i) => {
    const { dirX, dirZ } = DIR_MAP[s.direction];
    const dx     = s.endX - s.startX;
    const dz     = s.endZ - s.startZ;
    const length = Math.round(Math.sqrt(dx * dx + dz * dz));

    const tmpl: RouteTemplate = {
      // Placeholder index — real index is assigned in generateNext()
      index:       i,
      startDist:   dist,
      endDist:     dist + length,
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
    dist += length;
    return tmpl;
  });
}

const ROUTE_TEMPLATES = buildRouteTemplates();
const LOOP_LENGTH     = ROUTE_TEMPLATES[ROUTE_TEMPLATES.length - 1].endDist;
const ROUTE_LEN       = ROUTE_TEMPLATES.length;

// ─── AmsterdamPathSystem ──────────────────────────────────────────────────────

/**
 * A fixed-route path system that replays the Amsterdam canal-ring loop
 * defined in `AmsterdamMap.ts` instead of generating an infinite procedural
 * spiral.
 *
 * The route loops infinitely — when the player completes one full circuit
 * (~5 500 world-units) the segments are re-used with a path-distance offset,
 * so `pathDist` grows monotonically while world XZ positions repeat.
 *
 * Extends `PathSystem` and overrides only `generateNext()` and `reset()`; all
 * other public methods (`getWorldPos`, `dirAt`, `ensureAhead`, `pruneBehind`,
 * `segmentAt`) are inherited unchanged.
 */
export class AmsterdamPathSystem extends PathSystem {
  private routeCursor    = 0;
  private loopDistOffset = 0;

  constructor() {
    // Pass false so the parent constructor does NOT call generateNext() before
    // our own fields (routeCursor, loopDistOffset) have been initialised.
    super(false);
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  override reset(): void {
    this.segments.length  = 0;
    this.totalGenDist     = 0;
    this.nextX            = 0;
    this.nextZ            = 0;
    this.nextSegIndex     = 0;
    this.routeCursor      = 0;
    this.loopDistOffset   = 0;
    for (let i = 0; i < 6; i++) this.generateNext();
  }

  override generateNext(): Segment {
    const cursor = this.routeCursor;
    const i      = cursor % ROUTE_LEN;
    const tmpl   = ROUTE_TEMPLATES[i];

    // Accumulate the total loop distance each time we wrap around
    if (cursor > 0 && i === 0) {
      this.loopDistOffset += LOOP_LENGTH;
    }

    const seg: Segment = {
      ...tmpl,
      index:     this.nextSegIndex++,
      startDist: this.loopDistOffset + tmpl.startDist,
      endDist:   this.loopDistOffset + tmpl.endDist,
    };

    this.segments.push(seg);
    this.totalGenDist = seg.endDist;
    this.nextX        = seg.endX;
    this.nextZ        = seg.endZ;
    this.routeCursor  = cursor + 1;
    return seg;
  }
}
