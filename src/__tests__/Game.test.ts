import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock collision system before importing Game so module-level imports are mocked
vi.mock('../CollisionSystem', () => ({
  checkCollisions: vi.fn(),
  checkFatBikeCollisions: vi.fn(),
}))

import { checkCollisions, checkFatBikeCollisions } from '../CollisionSystem'
import { Game } from '../Game'

describe('Game._update logic (unit tests with mocks)', () => {
  let game: any
  let mockNpcManager: any
  let mockScore: any

  beforeEach(() => {
    // Create a Game-like object without calling constructor
    game = Object.create(Game.prototype)
    game.setup = { renderer: { render: vi.fn(), setSize: vi.fn() }, scene: {} }
    game.camera = { shake: vi.fn(), update: vi.fn(), toggleMode: vi.fn() }
    game.pathSystem = { ensureAhead: vi.fn(), pruneBehind: vi.fn(), dirAt: vi.fn().mockReturnValue({ dirX: 0, dirZ: -1 }) }
    game.world = { update: vi.fn(), reset: vi.fn() }
    game.player = { pathDistance: 10, update: vi.fn(), position: { x: 0, y: 0, z: 0 }, hitByFatBike: vi.fn() }

    mockNpcManager = {
      update: vi.fn(),
      getLiveNPCs: vi.fn().mockReturnValue([]),
      getLiveFatBikes: vi.fn().mockReturnValue([]),
      hitNPC: vi.fn(),
      allCleared: vi.fn().mockReturnValue(false),
      clear: vi.fn(),
    }
    game.npcManager = mockNpcManager

    mockScore = {
      addHit: vi.fn(),
      loseLife: vi.fn(),
      isGameOver: false,
      resetLevel: vi.fn(),
      fullReset: vi.fn(),
      score: 0,
      lives: 3,
      combo: 1,
    }
    game.score = mockScore

    game.ui = { update: vi.fn() }
    game.state = 'PLAYING'
    game.levelIndex = 0
    game.timeLeft = 5
    game.lastTime = 0
    game.playerName = 'TEST'
  })

  it('processes pedestrian collisions: hits -> hitNPC, addHit, camera.shake', () => {
    ;(checkCollisions as any).mockReturnValue([{ id: 'npc1' }])
    ;(checkFatBikeCollisions as any).mockReturnValue([])

    ;(Game.prototype as any)._update.call(game, 0.016, 10)

    expect(mockNpcManager.hitNPC).toHaveBeenCalled()
    expect(mockScore.addHit).toHaveBeenCalledWith(10)
    expect(game.camera.shake).toHaveBeenCalled()
  })

  it('processes fat-bike collisions: onHitPlayer, loseLife, player hit, camera shake, game over path', () => {
    const bike = { onHitPlayer: vi.fn(), mesh: {} }
    ;(checkCollisions as any).mockReturnValue([])
    ;(checkFatBikeCollisions as any).mockReturnValue([bike])

    // make loseLife set isGameOver to true to trigger _onGameOver call
    mockScore.loseLife = vi.fn(() => { mockScore.isGameOver = true })
    game._onGameOver = vi.fn()

    ;(Game.prototype as any)._update.call(game, 0.016, 20)

    expect(bike.onHitPlayer).toHaveBeenCalled()
    expect(mockScore.loseLife).toHaveBeenCalled()
    expect(game.player.hitByFatBike).toHaveBeenCalled()
    expect(game.camera.shake).toHaveBeenCalledWith(1.4)
    expect(game._onGameOver).toHaveBeenCalled()
  })

  it('timer expiry deducts life and restarts level when not game over', () => {
    // No collisions
    ;(checkCollisions as any).mockReturnValue([])
    ;(checkFatBikeCollisions as any).mockReturnValue([])

    game.timeLeft = 0.01
    game._startLevel = vi.fn()
    mockScore.isGameOver = false
    mockScore.loseLife = vi.fn(() => { mockScore.isGameOver = false })

    ;(Game.prototype as any)._update.call(game, 0.05, 30)

    expect(mockScore.loseLife).toHaveBeenCalled()
    expect(game._startLevel).toHaveBeenCalledWith(game.levelIndex)
  })
})
