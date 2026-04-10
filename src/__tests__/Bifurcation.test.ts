import { describe, it, expect } from 'vitest'
import { PathSystem } from '../PathSystem'

describe('PathSystem bifurcation', () => {
  it('preserves left/right distinction in branch offset', () => {
    const left = new PathSystem(false)
    left.pendingBifurcation = true
    left.makeChoice('left')
    const leftDirs = left.segments.slice(0, 6).map(s => `${s.dirX},${s.dirZ}`)

    const right = new PathSystem(false)
    right.pendingBifurcation = true
    right.makeChoice('right')
    const rightDirs = right.segments.slice(0, 6).map(s => `${s.dirX},${s.dirZ}`)

    expect(leftDirs).not.toEqual(rightDirs)
  })
})
