import { describe, it, expect } from 'vitest'
import { ScoreManager } from '../ScoreManager'

describe('ScoreManager', () => {
  it('awards base points and applies combo window', () => {
    const s = new ScoreManager()
    s.fullReset()
    s.addHit(0)
    expect(s.score).toBe(100)
    s.addHit(0.5) // within combo window -> x2
    expect(s.combo).toBe(2)
    expect(s.score).toBe(300)
    s.addHit(2.0) // outside combo window -> reset to x1
    expect(s.combo).toBe(1)
    expect(s.score).toBe(400)
  })

  it('loses lives and respects floor at 0', () => {
    const s = new ScoreManager()
    s.fullReset()
    expect(s.lives).toBeGreaterThan(0)
    for (let i = 0; i < 10; i++) s.loseLife()
    expect(s.lives).toBe(0)
    expect(s.isGameOver).toBe(true)
  })
})
