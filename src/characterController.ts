import * as THREE from 'three';
import { CharacterAnimState, Shopkeeper, createShopkeeper } from './models';
import { PhysicsWorld } from './physics';
import { addOutline } from './toon';

export interface CharacterControllerConfig {
  walkSpeed?: number;
  runSpeed?: number;
  accel?: number;
  decel?: number;
  jumpVelocity?: number;
  gravity?: number;
  radius?: number;
  height?: number;
  stepHeight?: number;
}

export class CharacterController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  yawTarget = 0;
  state: CharacterAnimState = 'idle';
  isGrounded = true;

  // Settings
  walkSpeed = 2.8;
  runSpeed = 5.6;
  accel = 16.0;
  decel = 18.0;
  jumpVelocity = 6.2;
  gravity = -18.0;
  radius = 0.32;
  height = 1.85;
  stepHeight = 0.38;

  // Visual model
  readonly model: Shopkeeper;
  private physics: PhysicsWorld;
  private sitTarget: THREE.Vector3 | null = null;
  private sitYaw = 0;
  private speedMul = 1.0; // from lifestyle/fatigue

  constructor(
    scene: THREE.Scene,
    initialPos: THREE.Vector3 = new THREE.Vector3(-0.5, 0.35, 0.6),
    initialYaw = 0,
    look = { shirt: '#5E93B6', apron: '#DB6846' },
    config?: CharacterControllerConfig,
  ) {
    if (config) {
      if (config.walkSpeed !== undefined) this.walkSpeed = config.walkSpeed;
      if (config.runSpeed !== undefined) this.runSpeed = config.runSpeed;
      if (config.accel !== undefined) this.accel = config.accel;
      if (config.decel !== undefined) this.decel = config.decel;
      if (config.jumpVelocity !== undefined) this.jumpVelocity = config.jumpVelocity;
      if (config.gravity !== undefined) this.gravity = config.gravity;
      if (config.radius !== undefined) this.radius = config.radius;
      if (config.height !== undefined) this.height = config.height;
      if (config.stepHeight !== undefined) this.stepHeight = config.stepHeight;
    }

    this.physics = PhysicsWorld.getInstance();
    this.position.copy(initialPos);
    this.yaw = this.yawTarget = initialYaw;

    this.model = createShopkeeper(look);
    addOutline(this.model.root);
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
    scene.add(this.model.root);
  }

  setSpeedMultiplier(mul: number) {
    this.speedMul = THREE.MathUtils.clamp(mul, 0.4, 1.25);
  }

  setLook(shirt: string, apron: string) {
    this.model.shirt.color.set(shirt);
    this.model.apron.color.set(apron);
  }

  teleport(pos: THREE.Vector3, yaw?: number) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = this.yawTarget = yaw;
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
    this.sitTarget = null;
    this.state = 'idle';
  }

  sit(chairPos: THREE.Vector3, chairYaw: number) {
    this.sitTarget = chairPos.clone();
    this.sitYaw = chairYaw;
    this.velocity.set(0, 0, 0);
    this.state = 'sit';
    this.position.copy(chairPos);
    this.yaw = this.yawTarget = chairYaw;
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
  }

  standUp() {
    if (this.state === 'sit') {
      this.sitTarget = null;
      this.state = 'idle';
      // Step slightly forward in the chair's facing direction
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(0.45);
      this.position.add(fwd);
    }
  }

  get isSitting(): boolean {
    return this.state === 'sit';
  }

  update(
    dt: number,
    _t: number,
    input: {
      moveX: number; // -1 (left) to 1 (right)
      moveZ: number; // -1 (backward) to 1 (forward)
      run: boolean;
      jump: boolean;
      carrying?: boolean;
      cameraYaw: number;
    },
  ) {
    // If sitting, ignore movement inputs unless user presses a movement key to stand up
    if (this.state === 'sit') {
      if (Math.abs(input.moveX) > 0.2 || Math.abs(input.moveZ) > 0.2 || input.jump) {
        this.standUp();
      } else {
        if (this.sitTarget) {
          this.position.copy(this.sitTarget);
          this.yaw = this.sitYaw;
        }
        this.model.root.position.copy(this.position);
        this.model.root.rotation.y = this.yaw;
        this.model.setAnimationState('sit', 0, dt);
        return;
      }
    }

    // Calculate desired world-space movement vector relative to camera facing
    const hasInput = Math.abs(input.moveX) > 0.05 || Math.abs(input.moveZ) > 0.05;
    const targetVel = new THREE.Vector3();

    if (hasInput) {
      const camYaw = input.cameraYaw;
      const fwd = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
      const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

      const move = fwd.multiplyScalar(input.moveZ).add(right.multiplyScalar(input.moveX));
      if (move.lengthSq() > 1) move.normalize();

      const speed = (input.run ? this.runSpeed : this.walkSpeed) * this.speedMul;
      targetVel.copy(move.multiplyScalar(speed));

      // Turn smoothly towards movement direction
      this.yawTarget = Math.atan2(move.x, move.z);
    }

    // Accelerate/Decelerate horizontal velocity
    const rate = hasInput ? this.accel : this.decel;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVel.x, rate, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVel.z, rate, dt);

    // Ground & Gravity physics
    const currentGroundY = this.physics.getGroundHeight(this.position.x, this.position.z, this.position.y);
    const distToGround = this.position.y - currentGroundY;

    if (distToGround <= 0.06 && this.velocity.y <= 0) {
      this.isGrounded = true;
      this.position.y = currentGroundY;
      this.velocity.y = 0;

      // Jump
      if (input.jump) {
        this.velocity.y = this.jumpVelocity;
        this.isGrounded = false;
      }
    } else {
      this.isGrounded = false;
      this.velocity.y += this.gravity * dt;
    }

    // Resolve horizontal movement through world colliders and slope/steps
    const res = this.physics.resolveMovement(
      this.position,
      new THREE.Vector3(this.velocity.x, 0, this.velocity.z),
      dt,
      this.radius,
      this.height,
      this.stepHeight,
    );

    this.position.x = res.newPos.x;
    this.position.z = res.newPos.z;

    // Apply vertical displacement
    this.position.y += this.velocity.y * dt;

    // Prevent sinking below ground
    const groundAfterMove = this.physics.getGroundHeight(this.position.x, this.position.z, this.position.y);
    if (this.position.y < groundAfterMove) {
      this.position.y = groundAfterMove;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Turn character smoothly
    let yawDiff = Math.atan2(Math.sin(this.yawTarget - this.yaw), Math.cos(this.yawTarget - this.yaw));
    this.yaw += yawDiff * Math.min(1, dt * 12);

    // Determine animation state
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.isGrounded) {
      this.state = this.velocity.y > 0 ? 'jump' : 'fall';
    } else if (input.carrying) {
      this.state = 'carry';
    } else if (horizSpeed > 3.6) {
      this.state = 'run';
    } else if (horizSpeed > 0.2) {
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }

    // Update 3D mesh transform and limbs
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
    this.model.setAnimationState(this.state, horizSpeed, dt);
  }

  setVisible(visible: boolean) {
    this.model.root.visible = visible;
  }
}
