import { describe, it, expect } from 'vitest'
import { PathSystem, SEGMENT_BASE_LENGTH, SEGMENT_GROWTH } from '../PathSystem'

describe('PathSystem', () => {
  it('generates increasing lengths every two segments', () => {
    const ps = new PathSystem(true)
    // generate more segments to observe growth
    for (let i = 0; i < 8; i++) ps.generateNext()
    const lens = ps.segments.map(s => s.length)
    // every pair should be equal length, then increase by SEGMENT_GROWTH
    for (let i = 2; i < lens.length; i += 2) {
      expect(lens[i]).toBe(lens[i - 2] + SEGMENT_GROWTH)
      expect(lens[i + 1]).toBe(lens[i])
    }
  })

  it('getWorldPos and dirAt agree on along-segment positions', () => {
    const ps = new PathSystem(true)
    const first = ps.segments[0]
    const mid = (first.startDist + first.endDist) / 2
    const pos = ps.getWorldPos(mid, 1.0)
    const dir = ps.dirAt(mid)
    // pos is offset from start by half the segment length in dirX/dirZ
    expect(Math.abs(pos.x - (first.startX + first.dirX * (mid - first.startDist) + -first.dirZ * 1.0))).toBeLessThan(1e-6)
    expect(Math.abs(pos.y - (first.startZ + first.dirZ * (mid - first.startDist) + first.dirX * 1.0))).toBeLessThan(1e-6)
    expect(dir.dirX).toBe(first.dirX)
    expect(dir.dirZ).toBe(first.dirZ)
  })

  it('pruneBehind keeps at least two segments', () => {
    const ps = new PathSystem(true)
    // generate many segments
    for (let i = 0; i < 20; i++) ps.generateNext()
    const before = ps.segments.length
    ps.pruneBehind(ps.totalGenDist, 10)
    expect(ps.segments.length).toBeGreaterThanOrEqual(2)
    expect(ps.segments.length).toBeLessThan(before)
  })

  it('getWorldPos clamps before-first and past-last correctly', () => {
    const ps = new PathSystem(true)
    const first = ps.segments[0]
    const last = ps.segments[ps.segments.length - 1]

    const before = ps.getWorldPos(first.startDist - 10, 1)
    expect(before.x).toBeCloseTo(first.startX + (-first.dirZ) * 1)
    expect(before.y).toBeCloseTo(first.startZ + ( first.dirX) * 1)

    const past = ps.getWorldPos(last.endDist + 20, -0.5)
    expect(past.x).toBeCloseTo(last.endX + (-last.dirZ) * -0.5)
    expect(past.y).toBeCloseTo(last.endZ + ( last.dirX) * -0.5)
  })

  it('segmentAt returns next segment when asked for exact endDist', () => {
    const ps = new PathSystem(true)
    const s0 = ps.segments[0]
    const s1 = ps.segments[1]
    const seg = ps.segmentAt(s0.endDist)
    expect(seg).not.toBeNull()
    expect(seg!.index).toBe(s1.index)
  })
})
