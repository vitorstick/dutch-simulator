# Dutch Duche Simulator — Implementation Plan

## Stack
- **Renderer:** Three.js
- **Build:** Vite + TypeScript (`vanilla-ts` template)
- **Camera:** Isometric (`OrthographicCamera`)
- **Physics:** Custom AABB (no external physics library)
- **Assets:** Procedural geometry only (`BoxGeometry`, `CylinderGeometry`, etc.)

---

## Project Structure

```
dutch-duche-simulator/
  index.html
  vite.config.ts
  tsconfig.json
  package.json
  src/
    main.ts             — entry point, bootstraps Game
    Game.ts             — game loop + state machine (MENU / PLAYING / LEVEL_COMPLETE / GAME_OVER)
    Scene.ts            — WebGLRenderer, Three.js scene, lighting
    Camera.ts           — isometric OrthographicCamera rig
    World.ts            — Amsterdam street grid, cycle path, buildings, canals
    Player.ts           — cyclist mesh, WASD input, momentum physics
    NPC.ts              — pedestrian class, walk AI
    NPCManager.ts       — spawn/despawn NPC waves per level config
    CollisionSystem.ts  — per-frame AABB hit detection (player ↔ NPC)
    LevelConfig.ts      — level definitions (NPC count, speed, time limit, layout)
    ScoreManager.ts     — score, combo multiplier, lives
    UI.ts               — DOM HUD overlay (score, timer, lives, combo, screens)
    utils.ts            — shared math helpers (lerp, clamp, etc.)
```

---

## Phase 1 — Project Scaffold

- [x] Run `npm create vite@latest dutch-duche-simulator -- --template vanilla-ts`
- [x] `cd dutch-duche-simulator && npm install`
- [x] Install Three.js: `npm install three` and `npm install -D @types/three`
- [x] Configure `tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `target: "ES2020"`
- [x] Clean out Vite boilerplate from `src/` and `index.html`
- [x] **Verify:** `npm run dev` serves a blank page without console errors

---

## Phase 2 — Core Rendering

- [x] **`src/Scene.ts`** — create `WebGLRenderer` (antialiasing on, size = window), `Scene`, `AmbientLight` + `DirectionalLight` (shadow-casting). Export `{ renderer, scene }`.
- [x] **`src/Camera.ts`** — near-top-down GTA retro angle (`CAM_OFFSET (2, 45, 5)`), `OrthographicCamera`, `resize()` helper.
- [x] Wire up `renderer.render(scene, camera)` in a `requestAnimationFrame` loop in `main.ts`.
- [x] **Verify:** scene renders, camera angle looks top-down retro GTA style

---

## Phase 3 — Amsterdam World

- [x] **`src/World.ts`** — built with:
  - Dark asphalt `PlaneGeometry` road (`#282828`) with dashed centre markings
  - Red `MeshLambertMaterial` cycle path strip
  - Klinker stone sidewalks (`#b89c7a`)
  - **Amsterdam-style short buildings** (3–6 units tall, narrow 3–5 unit facades, step-gabled roofs in dark tones, window quads)
  - Realistic warm brick palette (`#7a3a2a` range)
  - Flat blue canal with `MeshPhongMaterial` water sheen
  - Lamp posts, bollards, tulip flowers
- [x] Add all world meshes to `scene` on construction
- [x] **Verify:** top-down view shows Amsterdam canal street

---

## Phase 4 — Player Cyclist

- [x] **`src/Player.ts`** — `Player` class implemented:
  - Mesh: `BoxGeometry` body + `CylinderGeometry` wheels, **full Dutch orange jersey & helmet**
  - Input: `keydown`/`keyup` for WASD / arrow keys via `Set<string>`
  - Physics: acceleration + friction, speed clamped to `MAX_SPEED`
  - Heading: mesh rotates toward velocity direction
  - Constrained to cycle path X bounds
- [x] `update(delta: number): void` exposed
- [x] Called in game loop
- [x] **Verify:** cyclist moves with momentum, stays on red path

---

## Phase 5 — NPCs

- [x] **`src/NPC.ts`** — `NPC` class with body+head mesh, walk AI, tumble animation on hit
- [x] **`src/NPCManager.ts`** — wave spawning per `LevelConfig`, `allCleared()` check
- [x] **Verify:** pedestrians walk across screen; multiple simultaneously

---

## Phase 6 — Collision & Scoring

- [x] **`src/CollisionSystem.ts`** — `Box3.intersectsBox` AABB, returns hit NPC array
- [x] **`src/ScoreManager.ts`** — base 100 pts, x10 combo multiplier, 3 lives, full/level reset
- [x] Wired into game loop
- [x] **Verify:** collision increments score; combo triggers on consecutive hits

---

## Phase 7 — Level System

- [x] **`src/LevelConfig.ts`** — 5 levels defined with increasing `npcCount`, speed, tighter `timeLimit`
- [x] **`src/Game.ts`** — `GameState` enum + full state machine (`MENU → PLAYING → LEVEL_COMPLETE → GAME_OVER`), timer-based life loss, level progression
- [x] **Verify:** Level 1 completes → Level 2 loads harder

---

## Phase 8 — UI / HUD

- [x] **`src/UI.ts`** — DOM overlay: score, level badge, countdown, lives (🚲), combo text; Start / Level Complete / Game Over screens
- [x] Wired to `Game.ts` on every state transition
- [x] `src/style.css` — Dutch orange (`#ff6600`) HUD, dark semi-transparent bar
- [x] **Verify:** HUD updates live; all screen overlays appear correctly

---

## Phase 9 — Polish

- [x] **Hit feedback:** camera shake on `npc.hit()` via `IsoCamera.shake()`
- [x] **SFX:** Web Audio API dual-tone bell on collision
- [x] **Amsterdam flavour:** tulips, canal `MeshPhongMaterial`, bollards, lamp posts
- [x] **Resize handling:** `window.resize` updates renderer + camera frustum
- [x] **Visual updates (April 5 2026):**
  - Camera changed to near-top-down GTA retro style (`CAM_OFFSET (2, 45, 5)`)
  - Buildings resized to Amsterdam proportions (3–6 units, narrow facades, step-gabled roofs)
  - Realistic brick palette: `#7a3a2a` range warm reds
  - Road: dark asphalt `#282828` with dashed white centre line
  - Sidewalks: warm klinker stone `#b89c7a`
  - Player cyclist: full Dutch orange jersey `#ff6600`

---

## Verification Checklist

- [x] `npm run dev` — no console errors, scene renders correctly
- [x] Top-down GTA retro camera follows player
- [x] WASD moves cyclist with momentum; player stays constrained to the red cycle path
- [x] NPCs spawn and walk across the cycle path
- [x] Collision: NPC tumbles → disappears → score increments in HUD
- [x] Combo multiplier triggers on consecutive hits within 1 second
- [x] Level completes when path is cleared → Level 2 loads (more & faster NPCs)
- [x] Lives decrement correctly → Game Over screen appears on 0 lives
- [x] HUD (score, timer, lives, combo) updates every frame without flicker
- [x] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm run build` — production bundle builds cleanly

---

## Phase 10 — Backend Leaderboard (Supabase + Cloudflare Pages)

**Stack:** Supabase (PostgreSQL, REST API) · Cloudflare Pages (static hosting) · raw `fetch()` — no new npm dependency

### Phase A — Supabase Setup *(manual — done in the Supabase dashboard)*

- [x] Create a new project at supabase.com
- [x] Run the following SQL in the SQL Editor:
  ```sql
  create table scores (
    id         bigserial primary key,
    name       text        not null check (char_length(name) <= 20),
    score      int8        not null check (score >= 0),
    created_at timestamptz not null default now()
  );
  alter table scores enable row level security;
  create policy "Anyone can read scores"
    on scores for select using (true);
  create policy "Anyone can insert scores"
    on scores for insert with check (true);
  ```
- [x] From **Project Settings → API**: copy the **Project URL** and **anon/public key**

### Phase B — Environment Variables

- [x] Create `.env.local` (never committed):
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- [x] Create `.env.example` (committed, placeholder values) so the repo self-documents its config needs
- [x] Verify `.gitignore` already ignores `.env.local` (Vite default does)

### Phase C — Rewrite `src/Leaderboard.ts`

- [x] Make both functions `async`, calling Supabase REST directly via `fetch()`:
  - `loadLeaderboard()` → `GET /rest/v1/scores?select=name,score&order=score.desc&limit=10` — returns `[]` on any error (works offline)
  - `saveScore()` → `POST /rest/v1/scores` with `{ name, score }` body — fire-and-forget, silently ignores network failures
  - Headers: `apikey: ANON_KEY`, `Authorization: Bearer ANON_KEY`, `Content-Type: application/json`
  - `LeaderboardEntry` interface unchanged

### Phase D — Update `src/UI.ts`

- [x] `showMenu(entries, onStart)` signature unchanged — called immediately with `[]` so the menu appears without waiting on the network; initial empty state renders a "Loading…" row
- [x] Add `refreshLeaderboard(entries: LeaderboardEntry[])` method — replaces only the table body once data arrives

### Phase E — Update `src/Game.ts`

- [x] `_showMenu()` becomes `async`:
  - Calls `this.ui.showMenu([], onStart)` immediately (no delay for the player)
  - Kicks off `loadLeaderboard()` concurrently
  - On resolve → `this.ui.refreshLeaderboard(entries)`
- [x] `saveScore()` calls in `_onLevelComplete` / `_onGameOver` remain fire-and-forget (`void saveScore(...)`) — game flow never blocks on the network

### Phase F — Cloudflare Pages Deployment

- [ ] New Pages project → connect Git repo
  - Build command: `npm run build` · Output directory: `dist`
  - Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in the Pages environment variables dashboard
  - `vite.config.ts` already has `base: './'` — no changes needed

### Verification

- [ ] Open menu → "Loading…" row briefly → global top-10 scores appear
- [ ] Complete a run → entry visible in Supabase dashboard under `scores` table
- [ ] Open in a different browser/device → same global leaderboard visible
- [ ] `npm run build` — zero errors, `dist/` created
- [ ] Deploy to Cloudflare Pages → game loads, leaderboard fetches from Supabase

---

## Out of Scope (for now)

- Mobile / touch controls
- External 3D model assets (`.glb`, `.fbx`)
- Multiplayer
