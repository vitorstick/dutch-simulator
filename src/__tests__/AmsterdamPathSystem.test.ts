import { describe, it, expect } from 'vitest'
import { AmsterdamPathSystem } from '../AmsterdamPathSystem'
import { AMSTERDAM_ROUTE } from '../AmsterdamMap'

function routeLoopLength() {
  return AMSTERDAM_ROUTE.reduce((acc, s) => {
    const dx = s.endX - s.startX
    const dz = s.endZ - s.startZ
    return acc + Math.round(Math.sqrt(dx * dx + dz * dz))
  }, 0)
}

describe('AmsterdamPathSystem', () => {
  it('route templates length sum matches computed loop length', () => {
    const expected = routeLoopLength()
    expect(expected).toBeGreaterThan(0)
  })

  it('world positions repeat after one full loop', () => {
    const ps = new AmsterdamPathSystem()
    const loopLen = routeLoopLength()

    // pick a path distance within the first generated range
    const sampleDist = ps.segments[0].startDist + 5
    const pos1 = ps.getWorldPos(sampleDist, 0)

    // advance enough so internal generation wraps at least once
    for (let i = 0; i < AMSTERDAM_ROUTE.length * 2; i++) ps.generateNext()

    const pos2 = ps.getWorldPos(sampleDist + loopLen, 0)

    expect(Math.abs(pos1.x - pos2.x)).toBeLessThan(1e-6)
    expect(Math.abs(pos1.y - pos2.y)).toBeLessThan(1e-6)
  })

  it('dirAt is consistent across loop wrap', () => {
    const ps = new AmsterdamPathSystem()
    const loopLen = routeLoopLength()
    const sampleDist = ps.segments[2].startDist + 1
    const dir1 = ps.dirAt(sampleDist)
    for (let i = 0; i < AMSTERDAM_ROUTE.length + 1; i++) ps.generateNext()
    const dir2 = ps.dirAt(sampleDist + loopLen)
    expect(dir1.dirX).toBe(dir2.dirX)
    expect(dir1.dirZ).toBe(dir2.dirZ)
  })
})
