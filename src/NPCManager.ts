import * as THREE from 'three';
import { NPC } from './NPC';
import { TouristNPC } from './TouristNPC';
import { FatBikeNPC } from './FatBikeNPC';
import { LevelConfig } from './LevelConfig';
import { randomBetween, randomSign } from './utils';
import { PathSystem, CYCLE_PATH_HALF_WIDTH } from './PathSystem';

const FAT_BIKE_SPAWN_INTERVAL = 5.0;
// How far behind the player an NPC must fall before being recycled
const RECYCLE_BEHIND = 35;
// How far ahead we allow NPCs / fat bikes to wander before recycling them back
const RECYCLE_AHEAD  = 80;

export class NPCManager {
  private npcs:            NPC[]        = [];
  private regularTimer    = 0;
  private regularSpawned  = 0;
  private touristTimer    = 0;
  private touristSpawned  = 0;

  private fatBikes:          FatBikeNPC[] = [];
  private fatBikeSpawnTimer  = 0;
  private fatBikesSpawned    = 0;

  private readonly scene:       THREE.Scene;
  private readonly config:      LevelConfig;
  private readonly pathSystem:  PathSystem;

  constructor(scene: THREE.Scene, config: LevelConfig, pathSystem: PathSystem) {
    this.scene      = scene;
    this.config     = config;
    this.pathSystem = pathSystem;
  }

  allCleared(): boolean {
    return (
      this.regularSpawned >= this.config.npcCount &&
      this.touristSpawned >= this.config.touristCount &&
      this.npcs.every(npc => !npc.isAlive)
    );
  }

  update(delta: number, playerPathDist: number): void {
    // Spawn regular pedestrians
    if (this.regularSpawned < this.config.npcCount) {
      this.regularTimer += delta;
      if (this.regularTimer >= this.config.spawnInterval) {
        this.regularTimer = 0;
        this._spawnOne(playerPathDist);
      }
    }

    // Spawn tourists
    if (this.touristSpawned < this.config.touristCount) {
      this.touristTimer += delta;
      if (this.touristTimer >= this.config.spawnInterval) {
        this.touristTimer = 0;
        this._spawnTourist(playerPathDist);
      }
    }

    // Spawn fat bikes
    if (this.fatBikesSpawned < this.config.fatBikeCount) {
      this.fatBikeSpawnTimer += delta;
      if (this.fatBikeSpawnTimer >= FAT_BIKE_SPAWN_INTERVAL) {
        this.fatBikeSpawnTimer = 0;
        this._spawnFatBike(playerPathDist);
      }
    }

    // Tick each NPC
    for (const npc of this.npcs) {
      npc.update(delta, this.pathSystem);
      // Recycle live NPCs that drift out of the active zone
      if (npc.isAlive) {
        const relDist = npc.pathDistance - playerPathDist;
        if (relDist < -RECYCLE_BEHIND || relDist > RECYCLE_AHEAD) {
          npc.recycleNear(playerPathDist, this.pathSystem);
        }
      }
    }

    // Tick each fat bike
    for (const bike of this.fatBikes) {
      bike.update(delta, this.pathSystem);
      const relDist = bike.pathDistance - playerPathDist;
      if (relDist < -(RECYCLE_BEHIND + 20) || relDist > RECYCLE_AHEAD + 20) {
        bike.recycleNear(playerPathDist, this.pathSystem);
      }
    }

    // Prune fully-disposed NPCs
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

  getLiveFatBikes(): readonly FatBikeNPC[] {
    return this.fatBikes;
  }

  clear(): void {
    for (const npc  of this.npcs)     npc.dispose(this.scene);
    for (const bike of this.fatBikes) bike.dispose(this.scene);
    this.npcs              = [];
    this.fatBikes          = [];
    this.regularTimer      = 0;
    this.regularSpawned    = 0;
    this.touristTimer      = 0;
    this.touristSpawned    = 0;
    this.fatBikeSpawnTimer = 0;
    this.fatBikesSpawned   = 0;
  }

  private _spawnOne(playerPathDist: number): void {
    const lateral = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.6);
    const dist    = playerPathDist + 8 + Math.random() * 35;
    const speed   = randomBetween(this.config.npcSpeedMin, this.config.npcSpeedMax);
    const dir     = randomSign();
    this.npcs.push(new NPC(this.scene, speed, dir, dist, lateral, this.pathSystem));
    this.regularSpawned++;
  }

  private _spawnTourist(playerPathDist: number): void {
    const lateral = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.6);
    const dist    = playerPathDist + 8 + Math.random() * 35;
    const speed   = randomBetween(this.config.npcSpeedMin, this.config.npcSpeedMax);
    const dir     = randomSign();
    this.npcs.push(new TouristNPC(this.scene, speed, dir, dist, lateral, this.pathSystem));
    this.touristSpawned++;
  }

  private _spawnFatBike(playerPathDist: number): void {
    const lateral = (Math.random() - 0.5) * (CYCLE_PATH_HALF_WIDTH * 2 - 0.8);
    const dir     = randomSign();
    const dist    = dir === -1
      ? playerPathDist + 40 + Math.random() * 30   // oncoming: spawn ahead
      : playerPathDist - 15 - Math.random() * 15;  // same dir: spawn behind
    const speed   = randomBetween(this.config.fatBikeSpeedMin, this.config.fatBikeSpeedMax);
    this.fatBikes.push(new FatBikeNPC(this.scene, speed, dir, dist, lateral, this.pathSystem));
    this.fatBikesSpawned++;
  }
}
