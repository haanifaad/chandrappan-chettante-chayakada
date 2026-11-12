import * as THREE from 'three';
import { PhysicsWorld } from './physics';

export type CameraMode = 'thirdPerson' | 'firstPerson' | 'overview' | 'menu' | 'customize';

export class ThirdPersonCamera {
  mode: CameraMode = 'thirdPerson';
  yaw = 0;
  pitch = -0.22;
  distance = 4.2;
  minDistance = 1.0;
  maxDistance = 12.0;

  private currentPos = new THREE.Vector3();
  private targetPos = new THREE.Vector3();
  private physics: PhysicsWorld;
  private drag: { x: number; y: number } | null = null;

  constructor(
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.physics = PhysicsWorld.getInstance();

    dom.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        this.drag = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag = { x: e.clientX, y: e.clientY };

      const sens = 0.0042;
      this.yaw -= dx * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -1.2, 0.65);
    });

    window.addEventListener('pointerup', () => {
      this.drag = null;
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        if (this.mode === 'thirdPerson') {
          e.preventDefault();
          this.distance = THREE.MathUtils.clamp(this.distance + Math.sign(e.deltaY) * 0.5, this.minDistance, this.maxDistance);
        }
      },
      { passive: false },
    );
  }

  setMode(mode: CameraMode) {
    this.mode = mode;
  }

  update(dt: number, characterFeet: THREE.Vector3, isSitting = false) {
    if (this.mode === 'menu') {
      return; // handled by menu cinematic director
    }

    // Target point is character chest/head height
    const eyeHeight = isSitting ? 1.15 : 1.65;
    this.targetPos.set(characterFeet.x, characterFeet.y + eyeHeight, characterFeet.z);

    if (this.mode === 'firstPerson') {
      this.camera.position.copy(this.targetPos);
      const euler = new THREE.Euler(this.pitch, this.yaw + Math.PI, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
      return;
    }

    if (this.mode === 'thirdPerson') {
      // Calculate ideal spherical position behind character
      const cosPitch = Math.cos(this.pitch);
      const idealDir = new THREE.Vector3(
        Math.sin(this.yaw) * cosPitch,
        -Math.sin(this.pitch),
        Math.cos(this.yaw) * cosPitch,
      ).normalize();

      let targetDist = this.distance;

      // Raycast against physics obstacles to prevent camera clipping
      const hit = this.physics.raycast(this.targetPos, idealDir, this.distance);
      if (hit && hit.distance < targetDist) {
        targetDist = Math.max(0.65, hit.distance - 0.25);
      }

      const desiredPos = this.targetPos.clone().addScaledVector(idealDir, targetDist);

      // Smooth camera motion
      this.currentPos.lerp(desiredPos, Math.min(1, dt * 14));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.targetPos);
    }
  }

  reset(yaw = 0) {
    this.yaw = yaw;
    this.pitch = -0.22;
    this.distance = 4.2;
  }
}
