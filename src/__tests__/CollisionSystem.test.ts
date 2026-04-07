import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { checkCollisions, checkFatBikeCollisions } from '../CollisionSystem'

describe('CollisionSystem', () => {
  it('detects overlapping boxes as collisions', () => {
    const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    playerMesh.position.set(0,0,0)
    const npcMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    npcMesh.position.set(0,0,0)

    const player = { mesh: playerMesh } as any
    const manager = { getLiveNPCs: () => [{ mesh: npcMesh }] } as any

    const hits = checkCollisions(player, manager)
    expect(hits.length).toBe(1)
  })

  it('ignores non-overlapping objects', () => {
    const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    playerMesh.position.set(0,0,0)
    const npcMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    npcMesh.position.set(100,0,100)

    const player = { mesh: playerMesh } as any
    const manager = { getLiveNPCs: () => [{ mesh: npcMesh }] } as any

    const hits = checkCollisions(player, manager)
    expect(hits.length).toBe(0)
  })

  it('detects fat-bike collisions only when bike.canHitPlayer is true', () => {
    const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    playerMesh.position.set(0,0,0)
    const bikeMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))
    bikeMesh.position.set(0,0,0)

    const player = { mesh: playerMesh } as any
    const bikeReady = { mesh: bikeMesh, canHitPlayer: true } as any
    const bikeNotReady = { mesh: bikeMesh, canHitPlayer: false } as any

    const managerReady = { getLiveFatBikes: () => [bikeReady] } as any
    const managerNot = { getLiveFatBikes: () => [bikeNotReady] } as any

    expect(checkFatBikeCollisions(player, managerReady).length).toBe(1)
    expect(checkFatBikeCollisions(player, managerNot).length).toBe(0)
  })
})
