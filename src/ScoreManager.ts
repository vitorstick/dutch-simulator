const BASE_POINTS = 100;
const COMBO_WINDOW = 1.0; // seconds
const STARTING_LIVES = 3;

/**
 * Tracks the player's score, lives, and hit-combo multiplier.
 *
 * Scoring rules:
 * - Each hit awards `BASE_POINTS` (100) multiplied by the current combo.
 * - The combo increments by 1 for every hit that occurs within `COMBO_WINDOW`
 *   seconds of the previous hit, up to a maximum of ×10.
 * - Missing the window resets the combo back to ×1.
 *
 * Lives:
 * - The player starts with `STARTING_LIVES` (3).
 * - A life is lost when the level timer expires without clearing the path.
 * - Reaching 0 lives triggers Game Over.
 */
export class ScoreManager {
  private _score = 0;
  private _lives = STARTING_LIVES;
  private _combo = 1;
  private _lastHitTime = -Infinity;

  /** Current cumulative score across all levels. */
  get score(): number  { return this._score; }
  /** Remaining lives. Reaches 0 on Game Over. */
  get lives(): number  { return this._lives; }
  /** Active combo multiplier (1 = no combo, up to 10). */
  get combo(): number  { return this._combo; }
  /** `true` when the player has no lives left. */
  get isGameOver(): boolean { return this._lives <= 0; }

  /**
   * Register a successful NPC hit and update score + combo.
   *
   * @param nowSeconds - Current game time in seconds (used to detect combo window).
   */
  addHit(nowSeconds: number): void {
    if (nowSeconds - this._lastHitTime < COMBO_WINDOW) {
      this._combo = Math.min(this._combo + 1, 10);
    } else {
      this._combo = 1;
    }
    this._score += BASE_POINTS * this._combo;
    this._lastHitTime = nowSeconds;
  }

  /** Deduct one life (minimum 0). Called when the level timer expires. */
  loseLife(): void {
    this._lives = Math.max(0, this._lives - 1);
  }

  /** Reset per-level state (score accumulates across levels). */
  resetLevel(): void {
    this._combo = 1;
    this._lastHitTime = -Infinity;
  }

  /** Full reset for new game. */
  fullReset(): void {
    this._score = 0;
    this._lives = STARTING_LIVES;
    this.resetLevel();
  }
}
