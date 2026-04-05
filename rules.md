# Dutch Duché Simulator — Game Rules

## Objective
Ride your bicycle along the infinite Amsterdam streets and mow down all the tourists (pedestrians) on the cycle path before the timer runs out. Clear all 5 levels to win.

---

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Ride forward |
| S / ↓ | Ride backward |
| A / ← | Strafe left |
| D / → | Strafe right |

---

## The Map
The cycle path forms an infinite winding route through Amsterdam. The road consists of straight segments connected by 90-degree right turns. You never reach a dead end — the path spirals outward indefinitely.

---

## Scoring

- Each pedestrian you hit awards **100 × combo multiplier** points.
- The **combo multiplier** starts at ×1.
- If you hit another pedestrian within **1 second** of the previous hit, the combo increments by 1 (up to a maximum of **×10**).
- Missing the 1-second window resets the combo back to ×1.
- Score **accumulates across all levels** — it is never reset between levels.

---

## Lives

- You start with **3 lives**.
- You lose a life if the **level timer expires** before you clear all pedestrians.
- When a life is lost, the level restarts from the beginning (the map resets to its start position).
- Reaching **0 lives** triggers Game Over.

---

## Hazards — Fat Bikes

- From Level 2 onwards, **fat-bike riders** appear on the cycle path.
- If a fat bike collides with you, you **lose a life immediately**.
- After hitting you, a fat bike has a **2-second cooldown** before it can damage you again.
- Fat bikes are never removed — they ride indefinitely until the level ends.

---

## Levels

| Level | Pedestrians | Pedestrian Speed | Spawn Rate | Time Limit | Fat Bikes | Fat Bike Speed |
|-------|:-----------:|:----------------:|:----------:|:----------:|:---------:|:--------------:|
| 1     | 5           | 2 – 3 u/s        | every 2.0s | 60s        | 0         | —              |
| 2     | 8           | 2.5 – 4 u/s      | every 1.5s | 55s        | 2         | 8 – 11 u/s     |
| 3     | 12          | 3 – 5 u/s        | every 1.2s | 50s        | 3         | 9 – 12 u/s     |
| 4     | 16          | 3.5 – 6 u/s      | every 1.0s | 45s        | 4         | 10 – 13 u/s    |
| 5     | 20          | 4 – 7.5 u/s      | every 0.8s | 40s        | 5         | 11 – 14 u/s    |

---

## Win / Lose Conditions

- **Level complete:** Hit all pedestrians for the current level before time runs out. The map and your position carry over to the next level seamlessly.
- **Victory:** Clear all 5 levels.
- **Game Over:** Lose all 3 lives at any point. The game restarts from Level 1 with a fresh score and map.
