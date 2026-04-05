export interface LevelConfig {
  npcCount: number;
  npcSpeedMin: number;
  npcSpeedMax: number;
  spawnInterval: number; // seconds between spawns
  timeLimit: number;     // seconds before a life is lost
}

export const LEVELS: LevelConfig[] = [
  { npcCount: 5,  npcSpeedMin: 2,   npcSpeedMax: 3,   spawnInterval: 2.0, timeLimit: 60 },
  { npcCount: 8,  npcSpeedMin: 2.5, npcSpeedMax: 4,   spawnInterval: 1.5, timeLimit: 55 },
  { npcCount: 12, npcSpeedMin: 3,   npcSpeedMax: 5,   spawnInterval: 1.2, timeLimit: 50 },
  { npcCount: 16, npcSpeedMin: 3.5, npcSpeedMax: 6,   spawnInterval: 1.0, timeLimit: 45 },
  { npcCount: 20, npcSpeedMin: 4,   npcSpeedMax: 7.5, spawnInterval: 0.8, timeLimit: 40 },
];
