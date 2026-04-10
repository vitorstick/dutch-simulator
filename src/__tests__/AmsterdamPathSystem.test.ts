import { describe, it, expect } from 'vitest'
import { AmsterdamPathSystem } from '../AmsterdamPathSystem'
import { AMSTERDAM_ROUTE, ROUTE_JUNCTIONS } from '../AmsterdamMap'

/** Length of the main loop only (templates 0-35, before branches). */
function mainLoopLength() {
  const MAIN_ROUTE_LEN = Object.values(ROUTE_JUNCTIONS)
    .flat()
    .reduce((max, o) => Math.max(max, o.nextTemplateIndex), 35) + 1
  // Sum the first 36 segments (indices 0–35 inclusive)
  const mainSegs = AMSTERDAM_ROUTE.slice(0, MAIN_ROUTE_LEN)
  return mainSegs.reduce((acc, s) => {
    const dx = s.endX - s.startX
    const dz = s.endZ - s.startZ
    return acc + Math.round(Math.sqrt(dx * dx + dz * dz))
  }, 0)
}

/** Advance the path system one full main-route loop, auto-choosing the default
 *  (first) option at every multi-option junction. */
function driveOneLoop(ps: AmsterdamPathSystem) {
  const MAIN_LEN = 36
  for (let i = 0; i < MAIN_LEN * 3; i++) {
    if (ps.pendingJunction) {
      ps.chooseBranch(0)   // always take the first/main option
    } else {
      ps.generateNext()
    }
  }
}

describe('AmsterdamPathSystem', () => {
  it('route templates length sum is positive', () => {
    const len = mainLoopLength()
    expect(len).toBeGreaterThan(0)
  })

  it('world positions repeat after one full main loop', () => {
    const ps = new AmsterdamPathSystem()
    const sampleDist = ps.segments[0].startDist + 5
    const pos1 = ps.getWorldPos(sampleDist, 0)

    // Drive through one complete main-route circuit (chooseBranch(0) at forks)
    driveOneLoop(ps)

    // The second loop of Damrak starts at totalGenDist for that loop; we need
    // to find the matching offset.  The delta between the two Damrak-start
    // segments is the actual driven loop length.
    const segs = ps.segments
    // Find two consecutive Damrak startX=0/startZ=0 segments to get the delta
    const loopDelta = (() => {
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].startX === 0 && segs[i].startZ === 0 &&
            segs[i - 1].endX === 0 && segs[i - 1].endZ === 0) {
          return segs[i].startDist - segs[0].startDist
        }
      }
      return mainLoopLength()
    })()

    const pos2 = ps.getWorldPos(sampleDist + loopDelta, 0)
    expect(Math.abs(pos1.x - pos2.x)).toBeLessThan(1e-6)
    expect(Math.abs(pos1.y - pos2.y)).toBeLessThan(1e-6)
  })

  it('dirAt is consistent across a main loop wrap', () => {
    const ps = new AmsterdamPathSystem()
    const sampleDist = ps.segments[0].startDist + 5
    const dir1 = ps.dirAt(sampleDist)

    driveOneLoop(ps)

    const segs = ps.segments
    const loopDelta = (() => {
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].startX === 0 && segs[i].startZ === 0 &&
            segs[i - 1].endX === 0 && segs[i - 1].endZ === 0) {
          return segs[i].startDist - segs[0].startDist
        }
      }
      return mainLoopLength()
    })()

    const dir2 = ps.dirAt(sampleDist + loopDelta)
    expect(dir1.dirX).toBe(dir2.dirX)
    expect(dir1.dirZ).toBe(dir2.dirZ)
  })
})

