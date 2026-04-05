const BASE_POINTS = 100;
const COMBO_WINDOW = 1.0; // seconds
const STARTING_LIVES = 3;

export class ScoreManager {
  private _score = 0;
  private _lives = STARTING_LIVES;
  private _combo = 1;
  private _lastHitTime = -Infinity;

  get score(): number  { return this._score; }
  get lives(): number  { return this._lives; }
  get combo(): number  { return this._combo; }
  get isGameOver(): boolean { return this._lives <= 0; }

  addHit(nowSeconds: number): void {
    if (nowSeconds - this._lastHitTime < COMBO_WINDOW) {
      this._combo = Math.min(this._combo + 1, 10);
    } else {
      this._combo = 1;
    }
    this._score += BASE_POINTS * this._combo;
    this._lastHitTime = nowSeconds;
  }

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
