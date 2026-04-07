# Dutch Duché Simulator — Copilot Instructions

## Stack
- **Renderer:** Three.js (procedural geometry only — no external 3D assets)
- **Build:** Vite + TypeScript (`"moduleResolution": "bundler"`, `"strict": true`, `"target": "ES2020"`)
- **Physics:** Custom AABB only — no external physics library
- **Dev:** `npm run dev` | **Build:** `npm run build` (tsc + vite)

## Architecture

All game logic lives in `src/`. The `Game` class owns and coordinates all subsystems via a `requestAnimationFrame` loop and a state machine: `MENU → PLAYING → LEVEL_COMPLETE → PLAYING` (or `GAME_OVER`).

| File | Responsibility |
|------|---------------|
| `Game.ts` | Loop, state machine, subsystem wiring |
| `Scene.ts` | WebGLRenderer, Three.js scene, lighting |
| `Camera.ts` | Isometric `OrthographicCamera` + camera shake; supports `'iso'` and `'third'` modes |
| `World.ts` | Procedural Amsterdam streets — builds/removes `THREE.Group`s keyed by segment index |
| `PathSystem.ts` | Infinite spiral path; segments generated on demand via `ensureAhead()`, pruned via `pruneBehind()` |
| `Player.ts` | Cyclist mesh, WASD input, momentum physics, `hitByFatBike()` knockback |
| `NPC.ts` | Single pedestrian — walk AI, tumble animation, `hit()` / `dispose()` |
| `FatBikeNPC.ts` | Fat-bike hazard — hurts player, has hit-cooldown, never removed mid-level |
| `NPCManager.ts` | Spawns/despawns NPC waves per `LevelConfig`; exposes `getLiveNPCs()`, `getFatBikes()`, `allCleared()` |
| `CollisionSystem.ts` | Per-frame AABB hit detection; module-level `Box3` instances reused to avoid heap churn |
| `LevelConfig.ts` | `LEVELS` array — 5 levels with `npcCount`, speeds, `spawnInterval`, `timeLimit`, `fatBikeCount` |
| `ScoreManager.ts` | Score, combo multiplier (max ×10, 1 s window), lives, `isGameOver` |
| `UI.ts` | DOM HUD; `showMenu()`, `showVictory()`, `showGameOver()`, `showLevelBanner()`, `showHint()`, `refreshLeaderboard()` |
| `Leaderboard.ts` | `loadLeaderboard()` / `saveScore()` — async, global leaderboard |
| `utils.ts` | Math helpers: `lerp`, `clamp`, etc. |

## Key Conventions

**Path space vs. world space:** Entities are always positioned via `PathSystem.getWorldPos(pathDist, lateral)` — never by manipulating `mesh.position` directly except through `_syncPos`. `pathDist` is a cumulative scalar along the infinite spiral; `lateral` is the perpendicular offset from path centre (`±CYCLE_PATH_HALF_WIDTH = 2`).

**Segment indexing:** `PathSystem` uses a persistent `nextSegIndex` counter (never `segments.length`) so pruning the active window doesn't recycle indices. `World.ts` keys geometry groups by segment index — duplicate indices would silently skip geometry creation.

**No external assets:** All meshes are built from `BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, etc. Do not introduce asset loading.

**AABB collision:** `CollisionSystem` uses module-level pre-allocated `Box3` instances (`_playerBox`, `_npcBox`). Do not allocate new `Box3` inside the hot path.

**Audio:** Web Audio API only — `playBell()` in `Game.ts` synthesises the SFX in code. No audio files.

**State guard:** `_update()` returns immediately unless `state === 'PLAYING'`. All game-over / level-complete transitions set `this.state` before doing anything else to prevent double-firing.

**Delta cap:** Frame delta is capped at `0.05 s` (50 ms) in the loop to prevent spiral-of-death on focus restore.

## What NOT to Do
- Do not add an external physics engine.
- Do not load 3D model files (`.glb`, `.obj`, etc.) or audio files.
- Do not use `segments.length` as a segment index in `PathSystem` — use `nextSegIndex`.
- Do not place `new Box3()` / `new Vector3()` calls inside per-frame update paths.
- Do not add a second camera type without wiring it through `IsoCamera.toggleMode()`.
