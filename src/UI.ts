import { type LeaderboardEntry } from './Leaderboard';

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
  private readonly hintEl:    HTMLElement;
  private hintTimer: number | null = null;
  private readonly overlayEl: HTMLElement;
  private readonly titleEl:   HTMLElement;
  private readonly bodyEl:    HTMLElement;
  private readonly btnEl:     HTMLButtonElement;
  private readonly bannerEl:  HTMLElement;
  private bannerTimer: number | null = null;

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
    // transient hint element shown briefly when view/mode changes
    this.hintEl = document.createElement('div');
    this.hintEl.id = 'hud-hint';
    this.hintEl.className = 'hidden';
    hud.appendChild(this.hintEl);
    this.overlayEl = document.getElementById('overlay')!;
    this.titleEl   = document.getElementById('overlay-title')!;
    this.bodyEl    = document.getElementById('overlay-body')!;
    this.btnEl     = document.getElementById('overlay-btn') as HTMLButtonElement;

    this.bannerEl = document.createElement('div');
    this.bannerEl.id = 'level-banner';
    this.bannerEl.className = 'hidden';
    this.bannerEl.innerHTML = '<h2></h2><p></p>';
    hud.appendChild(this.bannerEl);
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

  /** Show a brief on-screen hint near the HUD (auto-hides). */
  showHint(text: string, duration = 1400): void {
    if (this.hintTimer) {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    this.hintEl.textContent = text;
    this.hintEl.classList.remove('hidden');
    this.hintEl.classList.remove('fade-out');
    void this.hintEl.offsetWidth; // force reflow so animations restart
    this.hintTimer = window.setTimeout(() => {
      this.hintEl.classList.add('fade-out');
      this.hintTimer = window.setTimeout(() => {
        this.hintEl.classList.add('hidden');
        this.hintTimer = null;
      }, 260);
    }, duration) as unknown as number;
  }

  /**
   * Show the main menu overlay with the top-scores leaderboard and a name
   * entry field. The `onStart` callback receives the player's chosen name.
   *
   * @param entries  - Current leaderboard (top 10).
   * @param onStart  - Callback invoked with the entered name when START is clicked.
   */
  showMenu(entries: LeaderboardEntry[], onStart: (name: string) => void): void {
    this.titleEl.textContent = '🚲 DUTCH DUCHE SIMULATOR';

    this.bodyEl.innerHTML = `
      <p class="menu-tagline">Ride your bike and clear the cycle path!<br>Use <b>WASD</b> or <b>Arrow Keys</b> to move.</p>
      <div class="leaderboard">
        <h3>🏆 TOP SCORES</h3>
        <table id="lb-table">${this._buildRows(entries, true)}</table>
      </div>
      <div class="name-entry">
        <label for="player-name">YOUR NAME</label>
        <input id="player-name" type="text" maxlength="20" placeholder="ANON" autocomplete="off" spellcheck="false">
      </div>
    `;

    this.btnEl.textContent = 'START RIDING';
    this.btnEl.onclick = () => {
      const input = document.getElementById('player-name') as HTMLInputElement | null;
      const name  = (input?.value.trim() || 'ANON').slice(0, 20);
      this.overlayEl.classList.add('hidden');
      onStart(name);
    };
    this.overlayEl.classList.remove('hidden');

    const nameInput = document.getElementById('player-name') as HTMLInputElement | null;
    if (nameInput) {
      nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') this.btnEl.click();
      });
      setTimeout(() => nameInput.focus(), 60);
    }
  }

  /**
   * Replace the leaderboard table content once async data has loaded.
   * Safe to call even if the menu overlay is no longer visible.
   */
  refreshLeaderboard(entries: LeaderboardEntry[]): void {
    const table = document.getElementById('lb-table');
    if (table) table.innerHTML = this._buildRows(entries, false);
  }

  /**
   * Show a non-blocking level-complete banner that auto-dismisses.
   * @param level   - The level number just completed (1-based, for display).
   * @param score   - Current score to display.
   * @param duration - How long (ms) to show the banner before fading out.
   */
  showLevelBanner(level: number, score: number, duration = 2200): void {
    if (this.bannerTimer !== null) {
      window.clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    const h2 = this.bannerEl.querySelector('h2')!;
    const p  = this.bannerEl.querySelector('p')!;
    h2.textContent = '✅ PATH CLEARED!';
    p.textContent  = `Level ${level} complete — Score: ${score}  ·  Press Space or Enter to continue`;
    this.bannerEl.classList.remove('hidden', 'fade-out');
    void (this.bannerEl as HTMLElement).offsetWidth;

    const dismiss = () => {
      if (this.bannerTimer === null) return; // already dismissed
      window.clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
      window.removeEventListener('keydown', onKey);
      this.bannerEl.classList.add('fade-out');
      window.setTimeout(() => this.bannerEl.classList.add('hidden'), 420);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);

    this.bannerTimer = window.setTimeout(() => {
      window.removeEventListener('keydown', onKey);
      this.bannerEl.classList.add('fade-out');
      this.bannerTimer = window.setTimeout(() => {
        this.bannerEl.classList.add('hidden');
        this.bannerTimer = null;
      }, 420);
    }, duration);
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

  /** Escape HTML special characters to prevent XSS in leaderboard names. */
  private _esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build the inner HTML for the leaderboard `<table>`.
   * @param entries  - Score entries to render.
   * @param loading  - When `true` and entries is empty, shows a "Loading…" row
   *                   instead of "No scores yet".
   */
  private _buildRows(entries: LeaderboardEntry[], loading: boolean): string {
    if (entries.length === 0) {
      const msg = loading ? 'Loading…' : 'No scores yet — be the first!';
      return `<tr><td colspan="3" class="lb-empty">${msg}</td></tr>`;
    }
    const medalFor = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return entries.slice(0, 10).map((e, i) =>
      `<tr class="lb-row lb-rank-${i}"><td class="lb-rank">${medalFor(i)}</td><td class="lb-name">${this._esc(e.name)}</td><td class="lb-score">${e.score}</td></tr>`
    ).join('');
  }

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
