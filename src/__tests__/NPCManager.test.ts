import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { NPCManager } from '../NPCManager'
import { PathSystem } from '../PathSystem'

const DUMMY_CONFIG = {
  npcCount: 1,
  touristCount: 1,
  npcSpeedMin: 1,
  npcSpeedMax: 1.5,
  spawnInterval: 0.1,
  timeLimit: 30,
  fatBikeCount: 1,
  fatBikeSpeedMin: 8,
  fatBikeSpeedMax: 9,
}

describe('NPCManager', () => {
  it('spawns regular and tourist NPCs according to spawnInterval', () => {
    const scene = new THREE.Scene()
    const ps = new PathSystem(true)
    const m = new NPCManager(scene, DUMMY_CONFIG as any, ps)

    // advance by spawnInterval to force spawn of regular + tourist
    m.update(DUMMY_CONFIG.spawnInterval + 0.01, 0)
    const live = m.getLiveNPCs()
    expect(live.length).toBeGreaterThanOrEqual(1)
  })

  it('spawns fat bikes when timer elapses', () => {
    const scene = new THREE.Scene()
    const ps = new PathSystem(true)
    const m = new NPCManager(scene, DUMMY_CONFIG as any, ps)

    // fat bikes spawn interval is internal (5s) — advance large delta
    m.update(10, 0)
    const bikes = m.getLiveFatBikes()
    expect(bikes.length).toBeGreaterThanOrEqual(1)
  })
})
