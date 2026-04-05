/**
 * Manages all DOM-based UI elements overlaid on top of the Three.js canvas.
 *
 * Two layers:
 * - **HUD** (`#hud-top`): always-visible bar showing score, level, timer, and
 *   lives. Updated every frame via `update()`.
 * - **Overlays** (`#overlay`): full-screen panels for MENU, LEVEL_COMPLETE,
 *   VICTORY, and GAME_OVER states. Shown/hidden via CSS class `"hidden"`.
 *
 * The UI deliberately uses plain DOM instead of Three.js objects so that it
 * renders at native resolution and benefits from CSS transitions.
 */
export class UI {
  private readonly scoreEl:   HTMLElement;
  private readonly levelEl:   HTMLElement;
  private readonly timerEl:   HTMLElement;
  private readonly livesEl:   HTMLElement;
  private readonly comboEl:   HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly titleEl:   HTMLElement;
  private readonly bodyEl:    HTMLElement;
  private readonly btnEl:     HTMLButtonElement;

  constructor() {
    const hud = document.getElementById('hud')!;
    hud.innerHTML = `
      <div id="hud-top">
        <span id="hud-level">LEVEL 1</span>
        <span id="hud-score">0</span>
        <span id="hud-lives">🚲🚲🚲</span>
        <span id="hud-timer">60</span>
      </div>
      <div id="hud-combo"></div>
      <div id="overlay" class="hidden">
        <h1 id="overlay-title"></h1>
        <p  id="overlay-body"></p>
        <button id="overlay-btn"></button>
      </div>
    `;

    this.scoreEl   = document.getElementById('hud-score')!;
    this.levelEl   = document.getElementById('hud-level')!;
    this.timerEl   = document.getElementById('hud-timer')!;
    this.livesEl   = document.getElementById('hud-lives')!;
    this.comboEl   = document.getElementById('hud-combo')!;
    this.overlayEl = document.getElementById('overlay')!;
    this.titleEl   = document.getElementById('overlay-title')!;
    this.bodyEl    = document.getElementById('overlay-body')!;
    this.btnEl     = document.getElementById('overlay-btn') as HTMLButtonElement;
  }

  /**
   * Refresh all live HUD elements. Should be called once per frame while in
   * the `PLAYING` state.
   *
   * @param score    - Current cumulative score.
   * @param lives    - Remaining lives (renders one 🚲 icon per life).
   * @param combo    - Current combo multiplier; values > 1 show the combo text.
   * @param timeLeft - Seconds remaining on the level timer.
   * @param level    - 1-based level number displayed in the level badge.
   */
  update(score: number, lives: number, combo: number, timeLeft: number, level: number): void {
    this.scoreEl.textContent = String(score);
    this.levelEl.textContent = `LEVEL ${level}`;
    this.timerEl.textContent = String(Math.ceil(Math.max(0, timeLeft)));
    this.livesEl.textContent = '🚲'.repeat(Math.max(0, lives));

    if (combo > 1) {
      this.comboEl.textContent = `x${combo} COMBO!`;
      // Restart animation by removing then re-adding class
      this.comboEl.classList.remove('pop');
      void this.comboEl.offsetWidth; // force reflow
      this.comboEl.classList.add('pop');
    } else {
      this.comboEl.textContent = '';
      this.comboEl.classList.remove('pop');
    }
  }

  /**
   * Show the main menu overlay.
   * @param onStart - Callback invoked when the player clicks "START RIDING".
   */
  showMenu(onStart: () => void): void {
    this._show(
      '🚲 DUTCH DUCHE SIMULATOR',
      'Ride your bike and clear the cycle path!<br>Use <b>WASD</b> or <b>Arrow Keys</b> to move.',
      'START RIDING',
      onStart,
    );
  }

  /**
   * Show the level-complete overlay.
   * @param level   - The level number just completed (1-based, for display).
   * @param score   - Current score to display.
   * @param onNext  - Callback invoked when the player clicks "NEXT LEVEL".
   */
  showLevelComplete(level: number, score: number, onNext: () => void): void {
    this._show(
      '✅ PATH CLEARED!',
      `Level ${level} complete!<br>Score so far: <b>${score}</b>`,
      'NEXT LEVEL →',
      onNext,
    );
  }

  /**
   * Show the all-levels-cleared victory overlay.
   * @param score      - Final score to display.
   * @param onRestart  - Callback invoked when the player clicks "RIDE AGAIN".
   */
  showVictory(score: number, onRestart: () => void): void {
    this._show(
      '🏆 AMSTERDAM IS YOURS!',
      `You cleared all levels!<br>Final score: <b>${score}</b>`,
      'RIDE AGAIN',
      onRestart,
    );
  }

  /**
   * Show the game over overlay.
   * @param score      - Final score to display.
   * @param level      - Level the player reached (1-based).
   * @param onRestart  - Callback invoked when the player clicks "RIDE AGAIN".
   */
  showGameOver(score: number, level: number, onRestart: () => void): void {
    this._show(
      '💥 GAME OVER',
      `Reached Level ${level}<br>Final score: <b>${score}</b>`,
      'RIDE AGAIN',
      onRestart,
    );
  }

  /** Hides the overlay panel without triggering any callback. */
  hideOverlay(): void {
    this.overlayEl.classList.add('hidden');
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Populate and reveal the shared overlay panel.
   *
   * @param title    - Large heading text.
   * @param body     - HTML string for the description paragraph.
   * @param btnLabel - Label for the call-to-action button.
   * @param onPress  - Callback fired when the button is clicked; the overlay
   *                   is automatically hidden before the callback runs.
   */
  private _show(
    title: string,
    body:  string,
    btnLabel: string,
    onPress: () => void,
  ): void {
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML    = body;
    this.btnEl.textContent   = btnLabel;
    this.btnEl.onclick       = () => {
      this.overlayEl.classList.add('hidden');
      onPress();
    };
    this.overlayEl.classList.remove('hidden');
  }
}
