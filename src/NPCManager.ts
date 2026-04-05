import * as THREE from 'three';
import { NPC } from './NPC';
import { LevelConfig } from './LevelConfig';
import { randomBetween, randomSign } from './utils';
import { CYCLE_PATH_HALF_WIDTH, PATH_HALF_LENGTH } from './World';

export class NPCManager {
  private npcs:          NPC[]  = [];
  private spawnTimer     = 0;
  private totalSpawned   = 0;

  private readonly scene:  THREE.Scene;
  private readonly config: LevelConfig;

  constructor(scene: THREE.Scene, config: LevelConfig) {
    this.scene  = scene;
    this.config = config;
  }

  allCleared(): boolean {
    return (
      this.totalSpawned >= this.config.npcCount &&
      this.npcs.every(npc => !npc.isAlive)
    );
  }

  update(delta: number): void {
    // Spawn
    if (this.totalSpawned < this.config.npcCount) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.config.spawnInterval) {
        this.spawnTimer = 0;
        this._spawnOne();
      }
    }

    // Tick each NPC
    for (const npc of this.npcs) {
      npc.update(delta);
    }

    // Prune fully disposed NPCs
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      if (this.npcs[i].canDispose) {
        this.npcs[i].dispose(this.scene);
        this.npcs.splice(i, 1);
      }
    }
  }

  hitNPC(npc: NPC): void {
    npc.hit();
  }

  getLiveNPCs(): readonly NPC[] {
    return this.npcs.filter(n => n.isAlive);
  }

  clear(): void {
    for (const npc of this.npcs) npc.dispose(this.scene);
    this.npcs        = [];
    this.spawnTimer  = 0;
    this.totalSpawned = 0;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private _spawnOne(): void {
    const x     = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.6);
    const z     = (Math.random() - 0.5) * PATH_HALF_LENGTH * 1.6;
    const speed = randomBetween(this.config.npcSpeedMin, this.config.npcSpeedMax);
    const dir   = randomSign();

    this.npcs.push(new NPC(this.scene, speed, dir, x, z));
    this.totalSpawned++;
  }
}
