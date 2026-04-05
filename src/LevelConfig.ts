/** Configuration data for a single game level. */
export interface LevelConfig {
  /** Total number of pedestrians to spawn before the level can be cleared. */
  npcCount: number;
  /** Minimum walk speed of spawned pedestrians (world units / second). */
  npcSpeedMin: number;
  /** Maximum walk speed of spawned pedestrians (world units / second). */
  npcSpeedMax: number;
  /** Seconds between each individual NPC spawn event. */
  spawnInterval: number;
  /** Time budget in seconds; expiry costs the player a life and restarts the level. */
  timeLimit: number;
  /** Number of fat-bike NPCs to spawn during this level. 0 = none. */
  fatBikeCount: number;
  /** Minimum speed of fat-bike NPCs (world units / second). */
  fatBikeSpeedMin: number;
  /** Maximum speed of fat-bike NPCs (world units / second). */
  fatBikeSpeedMax: number;
}

/**
 * Ordered progression of level configurations, from easiest (index 0) to hardest.
 *
 * The player advances through this array sequentially.
 * Completing the last entry triggers the victory screen instead of loading a next level.
 */
export const LEVELS: LevelConfig[] = [
  { npcCount: 5,  npcSpeedMin: 2,   npcSpeedMax: 3,   spawnInterval: 2.0, timeLimit: 60, fatBikeCount: 0, fatBikeSpeedMin: 8,  fatBikeSpeedMax: 10 },
  { npcCount: 8,  npcSpeedMin: 2.5, npcSpeedMax: 4,   spawnInterval: 1.5, timeLimit: 55, fatBikeCount: 2, fatBikeSpeedMin: 8,  fatBikeSpeedMax: 11 },
  { npcCount: 12, npcSpeedMin: 3,   npcSpeedMax: 5,   spawnInterval: 1.2, timeLimit: 50, fatBikeCount: 3, fatBikeSpeedMin: 9,  fatBikeSpeedMax: 12 },
  { npcCount: 16, npcSpeedMin: 3.5, npcSpeedMax: 6,   spawnInterval: 1.0, timeLimit: 45, fatBikeCount: 4, fatBikeSpeedMin: 10, fatBikeSpeedMax: 13 },
  { npcCount: 20, npcSpeedMin: 4,   npcSpeedMax: 7.5, spawnInterval: 0.8, timeLimit: 40, fatBikeCount: 5, fatBikeSpeedMin: 11, fatBikeSpeedMax: 14 },
];
