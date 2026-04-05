import * as THREE from 'three';

/**
 * Holds the core Three.js rendering primitives shared across the whole game.
 * Obtained from `createScene()` and passed into subsystems that need to
 * add objects to the scene or issue draw calls.
 */
export interface SceneSetup {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

/**
 * Initialise the Three.js renderer, scene, and lighting and attach the
 * renderer to the `#game-canvas` element in `index.html`.
 *
 * Lighting setup:
 * - `AmbientLight` (0xffffff, 0.55) — soft fill to prevent pitch-black shadows.
 * - `DirectionalLight` (warm white, 1.3) at position (20, 40, 20) — acts as
 *   the Amsterdam sun, casts `PCFSoftShadowMap` shadows at 2048×2048 resolution.
 *
 * @returns A `SceneSetup` object with the configured renderer and scene.
 */
export function createScene(): SceneSetup {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6688aa);
  scene.fog = new THREE.Fog(0x6688aa, 80, 130);

  // Soft ambient fill
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  // Main sun — directional with shadows
  const sun = new THREE.DirectionalLight(0xfffaee, 1.3);
  sun.position.set(20, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -70; sc.right = 70;
  sc.top  =  70; sc.bottom = -70;
  sc.near = 1;   sc.far = 200;
  scene.add(sun);

  return { renderer, scene };
}
