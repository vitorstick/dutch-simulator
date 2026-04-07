import { describe, it, expect } from 'vitest'
import { LEVELS } from '../LevelConfig'

describe('LevelConfig', () => {
  it('each level has sensible min/max speed and positive timers', () => {
    for (const lvl of LEVELS) {
      expect(lvl.npcSpeedMin).toBeLessThanOrEqual(lvl.npcSpeedMax)
      expect(lvl.fatBikeSpeedMin).toBeLessThanOrEqual(lvl.fatBikeSpeedMax)
      expect(lvl.spawnInterval).toBeGreaterThan(0)
      expect(lvl.timeLimit).toBeGreaterThan(0)
      expect(lvl.npcCount).toBeGreaterThanOrEqual(0)
      expect(lvl.touristCount).toBeGreaterThanOrEqual(0)
    }
  })
})
