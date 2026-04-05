import * as THREE from 'three';
import { NPC } from './NPC';
import { FatBikeNPC } from './FatBikeNPC';
import { LevelConfig } from './LevelConfig';
import { randomBetween, randomSign } from './utils';
import { CYCLE_PATH_HALF_WIDTH, PATH_HALF_LENGTH } from './World';

const FAT_BIKE_SPAWN_INTERVAL = 5.0; // seconds between each fat-bike spawn

/**
 * Manages the lifecycle of all NPCs for a single level.
 *
 * Responsibilities:
 * - Gradually spawns NPCs over time according to `LevelConfig.spawnInterval`
 *   until `LevelConfig.npcCount` have been spawned.
 * - Ticks every live NPC each frame.
 * - Removes NPCs whose tumble animation has completed (`canDispose === true`).
 * - Exposes `allCleared()` so `Game` can detect the win condition.
 */
export class NPCManager {
  private npcs:          NPC[]  = [];
  private spawnTimer     = 0;
  private totalSpawned   = 0;

  private fatBikes:          FatBikeNPC[] = [];
  private fatBikeSpawnTimer  = 0;
  private fatBikesSpawned    = 0;

  private readonly scene:  THREE.Scene;
  private readonly config: LevelConfig;

  constructor(scene: THREE.Scene, config: LevelConfig) {
    this.scene  = scene;
    this.config = config;
  }

  /**
   * Returns `true` when all NPCs for this level have been spawned **and**
   * none of them are still alive. This is the level win condition.
   */
  allCleared(): boolean {
    return (
      this.totalSpawned >= this.config.npcCount &&
      this.npcs.every(npc => !npc.isAlive)
    );
  }

  /**
   * Advance all NPCs and the spawn timer by one frame.
   *
   * Order of operations each call:
   * 1. If the quota hasn't been reached, increment the spawn timer and spawn
   *    when the interval elapses.
   * 2. Tick every NPC via `npc.update(delta)`.
   * 3. Prune NPCs that have finished their tumble animation.
   *
   * @param delta - Elapsed time in seconds since the last frame.
   */
  update(delta: number): void {
    // Spawn pedestrians
    if (this.totalSpawned < this.config.npcCount) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.config.spawnInterval) {
        this.spawnTimer = 0;
        this._spawnOne();
      }
    }

    // Spawn fat bikes
    if (this.fatBikesSpawned < this.config.fatBikeCount) {
      this.fatBikeSpawnTimer += delta;
      if (this.fatBikeSpawnTimer >= FAT_BIKE_SPAWN_INTERVAL) {
        this.fatBikeSpawnTimer = 0;
        this._spawnFatBike();
      }
    }

    // Tick each NPC
    for (const npc of this.npcs) {
      npc.update(delta);
    }

    // Tick each fat bike
    for (const bike of this.fatBikes) {
      bike.update(delta);
    }

    // Prune fully disposed NPCs
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      if (this.npcs[i].canDispose) {
        this.npcs[i].dispose(this.scene);
        this.npcs.splice(i, 1);
      }
    }
  }

  /**
   * Trigger the hit reaction on the given NPC.
   * Called by `Game` after `checkCollisions` returns the NPC.
   *
   * @param npc - The NPC that was struck by the player.
   */
  hitNPC(npc: NPC): void {
    npc.hit();
  }

  /**
   * Returns a read-only snapshot of all currently-alive NPCs.
   * Used by `CollisionSystem` to iterate hit candidates.
   */
  getLiveNPCs(): readonly NPC[] {
    return this.npcs.filter(n => n.isAlive);
  }

  /**
   * Returns all active fat-bike NPCs.
   * Used by `CollisionSystem` to check player-damaging collisions.
   */
  getLiveFatBikes(): readonly FatBikeNPC[] {
    return this.fatBikes;
  }

  /**
   * Immediately remove and dispose all NPCs from the scene and reset all
   * counters. Called when a level restarts or a new level is loaded.
   */
  clear(): void {
    for (const npc of this.npcs) npc.dispose(this.scene);
    this.npcs        = [];
    this.spawnTimer  = 0;
    this.totalSpawned = 0;

    for (const bike of this.fatBikes) bike.dispose(this.scene);
    this.fatBikes         = [];
    this.fatBikeSpawnTimer = 0;
    this.fatBikesSpawned   = 0;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Instantiate one NPC at a random position along the cycle path with a
   * random speed (within the level's configured range) and a random direction.
   */
  private _spawnOne(): void {
    const x     = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.6);
    const z     = (Math.random() - 0.5) * PATH_HALF_LENGTH * 1.6;
    const speed = randomBetween(this.config.npcSpeedMin, this.config.npcSpeedMax);
    const dir   = randomSign();

    this.npcs.push(new NPC(this.scene, speed, dir, x, z));
    this.totalSpawned++;
  }

  /**
   * Instantiate one fat-bike NPC at a random lane position near a path end so
   * it immediately rides toward the player area.
   */
  private _spawnFatBike(): void {
    const x     = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.8);
    const dir   = randomSign();
    // Spawn at the far end so it rides the full length toward the player
    const z     = dir === 1 ? -PATH_HALF_LENGTH : PATH_HALF_LENGTH;
    const speed = randomBetween(this.config.fatBikeSpeedMin, this.config.fatBikeSpeedMax);

    this.fatBikes.push(new FatBikeNPC(this.scene, speed, dir, x, z));
    this.fatBikesSpawned++;
  }
}
