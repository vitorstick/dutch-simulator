import { createScene, SceneSetup } from './Scene';
import { IsoCamera }               from './Camera';
import { World }                   from './World';
import { Player }                  from './Player';
import { NPCManager }              from './NPCManager';
import { checkCollisions }         from './CollisionSystem';
import { ScoreManager }            from './ScoreManager';
import { UI }                      from './UI';
import { LEVELS }                  from './LevelConfig';

// ─── Web Audio bell SFX ───────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (!_audioCtx) {
    try { _audioCtx = new AudioContext(); } catch { return null; }
  }
  if (_audioCtx.state === 'suspended') void _audioCtx.resume();
  return _audioCtx;
}

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

export class Game {
  private readonly setup:    SceneSetup;
  private readonly camera:   IsoCamera;
  private readonly player:   Player;
  private readonly score:    ScoreManager;
  private readonly ui:       UI;

  // World is recreated once; kept to ensure it isn't GC'd
  // @ts-expect-error intentional reference holder
  private readonly _world: World;

  private npcManager: NPCManager | null = null;
  private state:      GameState = 'MENU';
  private levelIndex  = 0;
  private timeLeft    = 0;
  private lastTime    = 0;

  constructor() {
    this.setup  = createScene();
    this.camera = new IsoCamera();
    this._world = new World(this.setup.scene);
    this.player = new Player(this.setup.scene);
    this.score  = new ScoreManager();
    this.ui     = new UI();

    window.addEventListener('resize', this._onResize.bind(this));

    this._loop(performance.now());
    this.ui.showMenu(() => this._startLevel(0));
  }

  // ─── Level management ────────────────────────────────────────────────────

  private _startLevel(index: number): void {
    this.levelIndex = index;
    const cfg       = LEVELS[index];
    this.timeLeft   = cfg.timeLimit;

    this.score.resetLevel();
    this.player.reset();

    if (this.npcManager) this.npcManager.clear();
    this.npcManager = new NPCManager(this.setup.scene, cfg);

    this.state = 'PLAYING';
  }

  // ─── Main loop ───────────────────────────────────────────────────────────

  private _loop(now: number): void {
    requestAnimationFrame((t) => this._loop(t));

    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this._update(delta, now / 1000);
    this.setup.renderer.render(this.setup.scene, this.camera.camera);
  }

  private _update(delta: number, nowSec: number): void {
    if (this.state !== 'PLAYING') return;

    // ── Player ──────────────────────────────────────────────────────────────
    this.player.update(delta);

    // ── NPCs ────────────────────────────────────────────────────────────────
    if (this.npcManager) {
      this.npcManager.update(delta);

      // Collision
      const hits = checkCollisions(this.player, this.npcManager);
      for (const npc of hits) {
        this.npcManager.hitNPC(npc);
        this.score.addHit(nowSec);
        this.camera.shake();
        playBell();
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
        // Time ran out — restart same level (lose a life)
        this._startLevel(this.levelIndex);
      }
      return;
    }

    // ── Camera & HUD ────────────────────────────────────────────────────────
    this.camera.update(delta, this.player.position);
    this.ui.update(
      this.score.score,
      this.score.lives,
      this.score.combo,
      this.timeLeft,
      this.levelIndex + 1,
    );
  }

  // ─── State transitions ───────────────────────────────────────────────────

  private _onLevelComplete(): void {
    this.state = 'LEVEL_COMPLETE';

    // Update HUD one final time with 0 timer
    this.ui.update(this.score.score, this.score.lives, 1, 0, this.levelIndex + 1);

    const nextIndex = this.levelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      this.ui.showVictory(this.score.score, () => {
        this.score.fullReset();
        this._startLevel(0);
      });
    } else {
      this.ui.showLevelComplete(this.levelIndex + 1, this.score.score, () => {
        this._startLevel(nextIndex);
      });
    }
  }

  private _onGameOver(): void {
    this.state = 'GAME_OVER';
    this.ui.showGameOver(this.score.score, this.levelIndex + 1, () => {
      this.score.fullReset();
      this._startLevel(0);
    });
  }

  // ─── Resize ──────────────────────────────────────────────────────────────

  private _onResize(): void {
    this.setup.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.resize();
  }
}
