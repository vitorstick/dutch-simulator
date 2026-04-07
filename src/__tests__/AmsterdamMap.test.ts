import { describe, it, expect } from 'vitest'
import { AMSTERDAM_ROUTE } from '../AmsterdamMap'

describe('AmsterdamMap route data', () => {
  it('each segment has distinct start and end and direction matches coordinates', () => {
    for (const seg of AMSTERDAM_ROUTE) {
      // start and end should not be identical
      expect(seg.startX === seg.endX && seg.startZ === seg.endZ).toBe(false)

      // direction vs coordinate delta
      if (seg.direction === 'N') expect(seg.endZ).toBeLessThan(seg.startZ)
      if (seg.direction === 'S') expect(seg.endZ).toBeGreaterThan(seg.startZ)
      if (seg.direction === 'E') expect(seg.endX).toBeGreaterThan(seg.startX)
      if (seg.direction === 'W') expect(seg.endX).toBeLessThan(seg.startX)

      if (seg.landmarkT !== undefined) {
        expect(seg.landmarkT).toBeGreaterThanOrEqual(0)
        expect(seg.landmarkT).toBeLessThanOrEqual(1)
      }
    }
  })
})
