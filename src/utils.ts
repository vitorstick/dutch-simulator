/**
 * Clamps `value` to the inclusive range [min, max].
 *
 * @param value - The number to clamp.
 * @param min   - Lower bound (inclusive).
 * @param max   - Upper bound (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns a random float uniformly distributed in the range [min, max).
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (exclusive).
 */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Returns either `1` or `-1` with equal (50 / 50) probability.
 * Used to randomise NPC walk direction along the cycle path.
 */
export function randomSign(): 1 | -1 {
  return Math.random() < 0.5 ? 1 : -1;
}
