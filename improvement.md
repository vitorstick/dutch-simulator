# Code Review Recommendations

## High Priority

### 1) Bifurcation choices do not affect Amsterdam route generation

- `Player` calls `makeChoice('left' | 'right' | 'forward')`, but `AmsterdamPathSystem.generateNext()` does not consume any choice state.
- Result: player-facing bifurcation prompts/signs imply meaningful choice, but generated route progression remains unchanged.

**Suggested action**
- Implement real branching in `AmsterdamPathSystem` (for example, a route graph with node IDs and per-choice edges).
- If branching is not ready yet, temporarily disable bifurcation UX and input handling to avoid misleading gameplay.

---

## Medium Priority

### 2) Procedural path branch math collapses left/right into same result

- In `PathSystem.generateNext()`, branch direction uses `Math.abs(this.branchDirOffset * 2)`.
- Using `Math.abs` removes left/right sign information, so opposite choices can map to the same direction.

**Suggested action**
- Preserve branch sign and use normalized modulo arithmetic, e.g.:
  - `const dIdx = ((idx + branchOffset) % 4 + 4) % 4;`
- Add tests asserting that left and right choices produce distinct direction outcomes.

### 3) Potential GPU/resource leaks from removed world geometry

- `World.update()` and `World.reset()` remove groups from scene, but do not dispose geometries/materials/textures created for segments/signs.
- With ongoing segment pruning/regeneration, memory usage can accumulate during long sessions.

**Suggested action**
- Add a recursive disposal helper for removed groups:
  - dispose `geometry`
  - dispose `material` (single or arrays)
  - dispose textures referenced by materials
- Apply the same pattern where dynamic meshes are rebuilt or removed (`Player`, `NPC`, `FatBikeNPC` lifecycle paths).

---

## Lower Priority / Quality

### 4) Add targeted tests for branching behavior and lifecycle cleanup

- Current tests pass, but there are no assertions that bifurcation choices change future route generation.
- There are also no tests confirming cleanup/disposal paths are executed when objects are recycled or removed.

**Suggested action**
- Add tests for:
  - bifurcation choice impact on subsequent segments/directions
  - cleanup/disposal invocation when world/NPC objects are pruned or reset

