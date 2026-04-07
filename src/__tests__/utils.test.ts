import { describe, it, expect, vi } from 'vitest'
import { clamp, randomBetween, randomSign } from '../utils'

describe('utils', () => {
  it('clamps values within bounds', () => {
    expect(clamp(5, 1, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(20, 0, 10)).toBe(10)
  })

  it('randomBetween produces value in [min,max)', () => {
    const r = randomBetween(2, 5)
    expect(r).toBeGreaterThanOrEqual(2)
    expect(r).toBeLessThan(5)
  })

  it('randomSign returns either 1 or -1 deterministically when mocking Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    spy.mockReturnValue(0.2)
    expect(randomSign()).toBe(1)
    spy.mockReturnValue(0.8)
    expect(randomSign()).toBe(-1)
    spy.mockRestore()
  })
})
