import * as THREE from 'three';

const VIEW_SIZE = 16;                             // orthographic half-height (world units)
const CAM_OFFSET = new THREE.Vector3(2, 45, 5);   // near-top-down GTA retro angle

export class IsoCamera {
  readonly camera: THREE.OrthographicCamera;
  private shakeTimer    = 0;
  private shakeStrength = 0;

  constructor() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
       VIEW_SIZE,         -VIEW_SIZE,
      0.1, 500
    );
    this.camera.position.copy(CAM_OFFSET);
    this.camera.lookAt(0, 0, 0);
  }

  update(delta: number, target: THREE.Vector3): void {
    this.camera.position.set(
      target.x + CAM_OFFSET.x,
      target.y + CAM_OFFSET.y,
      target.z + CAM_OFFSET.z,
    );

    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const s = this.shakeStrength;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
    }

    this.camera.lookAt(target);
  }

  shake(strength = 0.9): void {
    this.shakeStrength = strength;
    this.shakeTimer    = 0.18;
  }

  resize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left  = -VIEW_SIZE * aspect;
    this.camera.right =  VIEW_SIZE * aspect;
    this.camera.updateProjectionMatrix();
  }
}
