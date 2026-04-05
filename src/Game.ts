import { createScene, SceneSetup } from './Scene';
import { IsoCamera }               from './Camera';
import { World }                   from './World';
import { Player }                  from './Player';
import { PathSystem }              from './PathSystem';
import { NPCManager }              from './NPCManager';
import { checkCollisions, checkFatBikeCollisions } from './CollisionSystem';
import { ScoreManager }            from './ScoreManager';
import { UI }                      from './UI';
import { LEVELS }                  from './LevelConfig';

// ─── Web Audio bell SFX ───────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

/**
 * Lazily creates (and resumes) a single shared `AudioContext`.
 * Returns `null` if the Web Audio API is unavailable.
 */
function getAudioCtx(): AudioContext | null {
  if (!_audioCtx) {
    try { _audioCtx = new AudioContext(); } catch { return null; }
  }
  if (_audioCtx.state === 'suspended') void _audioCtx.resume();
  return _audioCtx;
}

/**
 * Play a short bicycle bell sound effect using the Web Audio API.
 *
 * Synthesised entirely in code — no audio assets required:
 * - A sine oscillator fires at 880 Hz then jumps to 1320 Hz after 60 ms.
 * - A gain envelope decays exponentially over 350 ms.
 */
function playBell(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

// ─── Game state ───────────────────────────────────────────────────────────────

type GameState = 'MENU' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAME_OVER';

// ─── Game class ───────────────────────────────────────────────────────────────

/**
 * Top-level game orchestrator.
 *
 * Owns all major subsystems and drives the game loop via `requestAnimationFrame`.
 * Implements a simple state machine:
 *
 * ```
 * MENU → PLAYING → LEVEL_COMPLETE → PLAYING (next level)
 *                 → GAME_OVER      (0 lives)
 *                 → GAME_OVER      (last level cleared → victory)
 * ```
 *
 * Subsystems owned:
 * - `Scene`        — renderer + Three.js scene
 * - `IsoCamera`    — top-down camera + shake
 * - `World`        — static Amsterdam environment
 * - `Player`       — cyclist input + physics
 * - `NPCManager`   — pedestrian wave spawning
 * - `ScoreManager` — scoring + lives
 * - `UI`           — DOM HUD + overlay screens
 */
export class Game {
  private readonly setup:      SceneSetup;
  private readonly camera:     IsoCamera;
  private readonly player:     Player;
  private readonly score:      ScoreManager;
  private readonly ui:         UI;
  private readonly pathSystem: PathSystem;
  private readonly world:      World;

  private npcManager: NPCManager | null = null;
  private state:      GameState = 'MENU';
  private levelIndex  = 0;
  private timeLeft    = 0;
  private lastTime    = 0;

  /**
   * Initialise all subsystems, register global event listeners, start the
   * render loop, and show the main menu overlay.
   */
  constructor() {
    this.setup      = createScene();
    this.camera     = new IsoCamera();
    this.pathSystem = new PathSystem();
    this.world      = new World(this.setup.scene);
    this.player     = new Player(this.setup.scene, this.pathSystem);
    this.score      = new ScoreManager();
    this.ui         = new UI();
    this.world.update(this.pathSystem);

    window.addEventListener('resize', this._onResize.bind(this));

    this._loop(performance.now());
    this.ui.showMenu(() => {
      this._hardReset();
      this._startLevel(0);
    });
  }

  // ─── Level management ────────────────────────────────────────────────────

  /**
   * Prepare and start a specific level.
   *
   * Resets the player position, score combo, and timer, then creates a fresh
   * `NPCManager` configured from `LEVELS[index]`.
   *
   * @param index - Zero-based index into the `LEVELS` array.
   */
  private _startLevel(index: number): void {
    this.levelIndex = index;
    const cfg       = LEVELS[index];
    this.timeLeft   = cfg.timeLimit;

    this.score.resetLevel();
    this.player.softReset();

    if (this.npcManager) this.npcManager.clear();
    this.npcManager = new NPCManager(this.setup.scene, cfg, this.pathSystem);

    this.state = 'PLAYING';
  }

  /** Full reset: wipe path, world geometry, and teleport player to the start. */
  private _hardReset(): void {
    this.pathSystem.reset();
    this.world.reset();
    this.world.update(this.pathSystem);
    this.player.reset();
  }

  // ─── Main loop ───────────────────────────────────────────────────────────

  /**
   * The `requestAnimationFrame` render loop entry point.
   *
   * Computes the frame delta (capped at 50 ms to avoid spiral-of-death on tab
   * focus restore), calls `_update`, then issues a render call.
   *
   * @param now - High-resolution timestamp provided by the browser (ms).
   */
  private _loop(now: number): void {
    requestAnimationFrame((t) => this._loop(t));

    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this._update(delta, now / 1000);
    this.setup.renderer.render(this.setup.scene, this.camera.camera);
  }

  /**
   * Per-frame game logic — only runs when `state === 'PLAYING'`.
   *
   * Order of operations:
   * 1. Update player (input + physics).
   * 2. Update all NPCs (walk + spawn).
   * 3. Run AABB collision check; trigger hits, score, camera shake, and SFX.
   * 4. Check win condition (`allCleared`).
   * 5. Decrement timer; lose a life or trigger Game Over on expiry.
   * 6. Update camera tracking and HUD.
   *
   * @param delta   - Elapsed time in seconds since the last frame.
   * @param nowSec  - Current game time in seconds (used by `ScoreManager` for
   *                  combo window detection).
   */
  private _update(delta: number, nowSec: number): void {
    if (this.state !== 'PLAYING') return;

    // ── Path system ──────────────────────────────────────────────────────────
    const playerDist = this.player.pathDistance;
    this.pathSystem.ensureAhead(playerDist);
    this.pathSystem.pruneBehind(playerDist);
    this.world.update(this.pathSystem);

    // ── Player ──────────────────────────────────────────────────────────────
    this.player.update(delta);

    // ── NPCs ────────────────────────────────────────────────────────────────
    if (this.npcManager) {
      this.npcManager.update(delta, playerDist);

      // Collision — pedestrians (player hits them, gains score)
      const hits = checkCollisions(this.player, this.npcManager);
      for (const npc of hits) {
        this.npcManager.hitNPC(npc);
        this.score.addHit(nowSec);
        this.camera.shake();
        playBell();
      }

      // Collision — fat bikes (they hit the player, player loses a life)
      const fatBikeHits = checkFatBikeCollisions(this.player, this.npcManager);
      for (const bike of fatBikeHits) {
        bike.onHitPlayer();
        this.score.loseLife();
        this.player.hitByFatBike();
        this.camera.shake(1.4);
        if (this.score.isGameOver) {
          this._onGameOver();
          return;
        }
      }

      // Win condition
      if (this.npcManager.allCleared()) {
        this._onLevelComplete();
        return;
      }
    }

    // ── Timer ───────────────────────────────────────────────────────────────
    this.timeLeft -= delta;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.score.loseLife();
      if (this.score.isGameOver) {
        this._onGameOver();
      } else {
        // Time ran out — restart same level (lose a life), reset to path start
        this._hardReset();
        this._startLevel(this.levelIndex);
      }
      return;
    }

    // ── Camera & HUD ────────────────────────────────────────────────────────
    const pathDir = this.pathSystem.dirAt(this.player.pathDistance);
    this.camera.update(delta, this.player.position, pathDir);
    this.ui.update(
      this.score.score,
      this.score.lives,
      this.score.combo,
      this.timeLeft,
      this.levelIndex + 1,
    );
  }

  // ─── State transitions ───────────────────────────────────────────────────

  /**
   * Called when all NPCs in the current level have been cleared.
   * Transitions to `LEVEL_COMPLETE`, then either loads the next level or
   * shows the victory screen if the last level was completed.
   */
  private _onLevelComplete(): void {
    this.state = 'LEVEL_COMPLETE';

    // Update HUD one final time with 0 timer
    this.ui.update(this.score.score, this.score.lives, 1, 0, this.levelIndex + 1);

    const nextIndex = this.levelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      this.ui.showVictory(this.score.score, () => {
        this.score.fullReset();
        this._hardReset();
        this._startLevel(0);
      });
    } else {
      this.ui.showLevelComplete(this.levelIndex + 1, this.score.score, () => {
        this._startLevel(nextIndex);
      });
    }
  }

  /**
   * Called when the player has run out of lives.
   * Transitions to `GAME_OVER` and shows the game over overlay.
   */
  private _onGameOver(): void {
    this.state = 'GAME_OVER';
    this.ui.showGameOver(this.score.score, this.levelIndex + 1, () => {
      this.score.fullReset();
      this._hardReset();
      this._startLevel(0);
    });
  }

  // ─── Resize ──────────────────────────────────────────────────────────────

  /**
   * Handle browser window resize events.
   * Updates the renderer output size and recalculates the camera frustum so
   * the scene fills the viewport correctly at any resolution.
   */
  private _onResize(): void {
    this.setup.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.resize();
  }
}
