import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, part, toon } from './toon';
import type { Sfx } from './audio';

/**
 * Master Construction & Carpenter System for Chandrappan Chettante Chayakkada.
 * Features Kuttan Ashari (master traditional carpenter NPC), formal construction contracts,
 * physical 3D scaffolding at installation sites, hammering/sawing animations,
 * and completion gates where upgrades are locked until construction completes.
 */

export interface ConstructionContractDef {
  contractId: string;
  contractorName: string;
  malayalam: string;
  targetType: 'furniture' | 'upgrade' | 'shop';
  targetId: string;
  targetName: string;
  targetLevel: number;
  cost: number;
  durationSeconds: number;
  sitePosition: [number, number, number];
  description: string;
}

export interface ActiveContractState extends ConstructionContractDef {
  progress01: number;
  remainingSeconds: number;
  elapsedSeconds: number;
}

/**
 * 3D Model for Kuttan Ashari (Master Carpenter NPC).
 */
export interface CarpenterModel {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  update(dt: number, walking: boolean, hammering: boolean, t: number): void;
}

export function buildCarpenterModel(): CarpenterModel {
  const root = new THREE.Group();
  root.name = 'Kuttan_Ashari';

  const body = group(root);
  const skin = toon(TONES.skin);
  const dark = toon(PALETTE.charcoal);
  const wood = toon(TONES.woodLight);
  const brass = toon(PALETTE.gold);
  const steel = toon(TONES.steel);
  const turbanColor = toon('#C85A32');
  const lungiColor = toon('#2C4D38');

  // Legs
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const hip = group(root, [s * 0.13, 0.72, 0]);
    // Folded working lungi
    part(hip, G.cyl(0.1, 0.09, 0.46, 10), lungiColor, { pos: [0, -0.22, 0] });
    part(hip, G.cyl(0.05, 0.045, 0.28, 8), skin, { pos: [0, -0.44, 0] });
    part(hip, G.box(0.1, 0.03, 0.2), dark, { pos: [0, -0.58, 0.03] });
    legs.push(hip);
  }

  // Torso / bare chest with sacred thread & leather tool belt
  part(body, G.box(0.42, 0.46, 0.24), skin, { pos: [0, 0.94, 0] });
  // Leather tool belt around waist
  part(body, G.box(0.44, 0.08, 0.26), toon('#4A2E18'), { pos: [0, 0.74, 0] });
  part(body, G.box(0.06, 0.06, 0.28), brass, { pos: [0, 0.74, 0] }); // brass buckle
  // Pouch on belt
  part(body, G.box(0.1, 0.12, 0.06), toon('#654321'), { pos: [-0.18, 0.7, 0.12] });

  // Head and face
  const head = group(body, [0, 1.26, 0]);
  part(head, G.sphere(0.145, 14, 12), skin, { pos: [0, 0, 0] });
  // Carpenter turban / thala-kettu
  part(head, G.torus(0.15, 0.05, 8, 16), turbanColor, { pos: [0, 0.08, 0], rot: [Math.PI / 2, 0, 0] });
  part(head, G.sphere(0.13, 10, 8), turbanColor, { pos: [0, 0.14, -0.02] });
  // Carpenter pencil tucked behind right ear
  part(head, G.cyl(0.006, 0.006, 0.14, 6), toon('#DDAA22'), { pos: [0.15, 0.02, 0.02], rot: [0.4, 0, 0.3] });
  // Twirled Komban mustache
  part(head, G.box(0.14, 0.035, 0.04), dark, { pos: [0, -0.04, 0.13] });

  // Arms
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const shoulder = group(body, [s * 0.26, 1.12, 0]);
    part(shoulder, G.cyl(0.055, 0.05, 0.26, 8), skin, { pos: [0, -0.13, 0] });
    const elbow = group(shoulder, [0, -0.26, 0]);
    part(elbow, G.cyl(0.05, 0.045, 0.24, 8), skin, { pos: [0, -0.12, 0] });
    arms.push(shoulder);
  }

  // Right hand holds carpenter's iron claw hammer
  const hammer = group(arms[1], [0, -0.48, 0.06]);
  part(hammer, G.cyl(0.015, 0.015, 0.38, 8), wood, { pos: [0, 0, 0], rot: [0.2, 0, 0] });
  part(hammer, G.box(0.06, 0.06, 0.14), steel, { pos: [0, 0.18, 0.03], rot: [0.2, 0, 0] });

  // Left hand holds wooden hand saw
  const saw = group(arms[0], [0, -0.48, 0.06]);
  part(saw, G.box(0.04, 0.12, 0.08), wood, { pos: [0, 0, 0] });
  part(saw, G.box(0.005, 0.45, 0.1), steel, { pos: [0, -0.2, 0.05], rot: [-0.3, 0, 0] });

  addOutline(root);

  let walkPhase = 0;

  const model: CarpenterModel = {
    root,
    body,
    head,
    leftLeg: legs[0],
    rightLeg: legs[1],
    leftArm: arms[0],
    rightArm: arms[1],
    update(dt: number, walking: boolean, hammering: boolean, t: number) {
      if (walking) {
        walkPhase += dt * 9;
        const swing = Math.sin(walkPhase) * 0.55;
        legs[0].rotation.x = swing;
        legs[1].rotation.x = -swing;
        arms[0].rotation.x = -swing * 0.4;
        arms[1].rotation.x = swing * 0.4;
        body.position.y = Math.abs(Math.sin(walkPhase)) * 0.05;
      } else if (hammering) {
        legs[0].rotation.x = 0;
        legs[1].rotation.x = 0;
        // Rhythmic hammer strike animation
        const strike = Math.sin(t * 8);
        arms[1].rotation.x = -1.2 + strike * 0.7;
        arms[0].rotation.x = -0.5 + Math.sin(t * 4) * 0.2;
        body.position.y = Math.abs(strike) * 0.03;
      } else {
        legs[0].rotation.x = 0;
        legs[1].rotation.x = 0;
        arms[0].rotation.x = Math.sin(t * 1.5) * 0.04;
        arms[1].rotation.x = -Math.sin(t * 1.5) * 0.04;
        body.position.y = Math.sin(t * 2) * 0.01;
      }
    },
  };

  return model;
}

/**
 * 3D Physical Scaffolding & Site Construction Model.
 */
export function buildScaffoldingSite(pos: [number, number, number]): THREE.Group {
  const g = new THREE.Group();
  g.name = 'construction_scaffolding';
  g.position.set(...pos);

  const timber = toon('#A07844');
  const plank = toon(TONES.woodLight);
  const barrierYellow = toon('#E8B828');
  const barrierBlack = toon(PALETTE.charcoal);

  // 4 corner timber poles
  for (const dx of [-0.65, 0.65]) {
    for (const dz of [-0.45, 0.45]) {
      part(g, G.cyl(0.04, 0.04, 2.0, 8), timber, { pos: [dx, 1.0, dz] });
    }
  }

  // Cross braces & planks
  for (const dy of [0.6, 1.3, 1.9]) {
    part(g, G.box(1.35, 0.04, 0.04), timber, { pos: [0, dy, -0.45] });
    part(g, G.box(1.35, 0.04, 0.04), timber, { pos: [0, dy, 0.45] });
    part(g, G.box(0.04, 0.04, 0.95), timber, { pos: [-0.65, dy, 0] });
    part(g, G.box(0.04, 0.04, 0.95), timber, { pos: [0.65, dy, 0] });
  }

  // Working timber plank floor on top
  part(g, G.box(1.3, 0.03, 0.9), plank, { pos: [0, 1.32, 0] });

  // Wooden sawhorse with log on ground
  const sawhorse = group(g, [-0.4, 0, 0.6]);
  part(sawhorse, G.box(0.6, 0.05, 0.1), timber, { pos: [0, 0.4, 0] });
  for (const dx of [-0.22, 0.22]) {
    part(sawhorse, G.cyl(0.02, 0.02, 0.45, 6), timber, { pos: [dx, 0.2, -0.1], rot: [-0.3, 0, 0] });
    part(sawhorse, G.cyl(0.02, 0.02, 0.45, 6), timber, { pos: [dx, 0.2, 0.1], rot: [0.3, 0, 0] });
  }
  // Teak log being sawn
  part(sawhorse, G.cyl(0.06, 0.06, 0.7, 8), toon('#583216'), { pos: [0, 0.46, 0], rot: [0, 0, Math.PI / 2] });

  // Caution striped wooden barrier
  const barrier = group(g, [0, 0, 0.75]);
  part(barrier, G.box(1.1, 0.1, 0.025), barrierYellow, { pos: [0, 0.35, 0] });
  for (let i = 0; i < 4; i++) {
    part(barrier, G.box(0.08, 0.1, 0.03), barrierBlack, { pos: [-0.35 + i * 0.24, 0.35, 0], rot: [0, 0, 0.3] });
  }
  for (const dx of [-0.45, 0.45]) {
    part(barrier, G.cyl(0.02, 0.02, 0.4, 6), timber, { pos: [dx, 0.2, 0] });
  }

  addOutline(g);
  return g;
}

/**
 * ConstructionManager:
 * Governs active contracts, physical carpenter NPC (Kuttan Ashari),
 * on-site scaffolding, hammer timers and audio, and completion unlocks.
 */
export class ConstructionManager {
  activeContract: ActiveContractState | null = null;
  carpenter: CarpenterModel;

  private scene: THREE.Scene;
  private workshopRoot: THREE.Group;
  private currentScaffolding: THREE.Group | null = null;
  private carpenterStandby = new THREE.Vector3(-4.8, 0, -1.8);
  private carpenterTarget = new THREE.Vector3(-4.8, 0, -1.8);
  private carpenterSpeed = 2.8;
  private hammerAudioTimer = 0;
  private totalTimeElapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.carpenter = buildCarpenterModel();
    this.carpenter.root.position.copy(this.carpenterStandby);
    scene.add(this.carpenter.root);

    // Build roadside carpentry workbench
    this.workshopRoot = new THREE.Group();
    this.workshopRoot.position.set(-4.8, 0, -2.1);
    part(this.workshopRoot, G.box(1.2, 0.08, 0.6), toon(TONES.woodLight), { pos: [0, 0.76, 0] });
    for (const dx of [-0.5, 0.5]) {
      for (const dz of [-0.22, 0.22]) {
        part(this.workshopRoot, G.box(0.08, 0.74, 0.08), toon(PALETTE.wood), { pos: [dx, 0.37, dz] });
      }
    }
    // Lumber stack on bench
    for (let i = 0; i < 3; i++) {
      part(this.workshopRoot, G.box(1.1, 0.04, 0.2), toon(TONES.woodLight), { pos: [0.05, 0.82 + i * 0.042, -0.05] });
    }
    addOutline(this.workshopRoot);
    scene.add(this.workshopRoot);
  }

  hasActiveContract(): boolean {
    return this.activeContract !== null;
  }

  startContract(contract: ConstructionContractDef, money: number): { success: boolean; message: string } {
    if (this.hasActiveContract()) {
      return { success: false, message: 'Kuttan Ashari is already working on an ongoing project.' };
    }

    if (money < contract.cost) {
      return { success: false, message: `Need ₹${contract.cost} to commission Kuttan Ashari.` };
    }

    this.activeContract = {
      ...contract,
      progress01: 0,
      remainingSeconds: contract.durationSeconds,
      elapsedSeconds: 0,
    };

    // Spawn physical scaffolding at the installation site
    if (this.currentScaffolding) {
      this.scene.remove(this.currentScaffolding);
    }
    this.currentScaffolding = buildScaffoldingSite(contract.sitePosition);
    this.scene.add(this.currentScaffolding);

    // Move carpenter to the work site
    this.carpenterTarget.set(contract.sitePosition[0] + 0.65, contract.sitePosition[1], contract.sitePosition[2] + 0.7);

    return {
      success: true,
      message: `Signed contract with Kuttan Ashari for ${contract.targetName}! Work started.`,
    };
  }

  update(dt: number, onSfx?: (name: Sfx) => void): { completedContract: ConstructionContractDef | null } {
    this.totalTimeElapsed += dt;
    let completedContract: ConstructionContractDef | null = null;

    // Move carpenter toward target
    const cPos = this.carpenter.root.position;
    const dist = cPos.distanceTo(this.carpenterTarget);
    const isWalking = dist > 0.15;

    if (isWalking) {
      const dir = this.carpenterTarget.clone().sub(cPos).normalize();
      cPos.addScaledVector(dir, Math.min(dist, this.carpenterSpeed * dt));
      const targetFacing = Math.atan2(dir.x, dir.z);
      this.carpenter.root.rotation.y += (targetFacing - this.carpenter.root.rotation.y) * Math.min(1, dt * 10);
    }

    const isHammering = !isWalking && this.hasActiveContract();
    this.carpenter.update(dt, isWalking, isHammering, this.totalTimeElapsed);

    if (isHammering) {
      this.hammerAudioTimer -= dt;
      if (this.hammerAudioTimer <= 0) {
        this.hammerAudioTimer = 1.0;
        onSfx?.('clink');
      }
    }

    // Advance contract progress
    if (this.activeContract) {
      this.activeContract.elapsedSeconds += dt;
      this.activeContract.remainingSeconds = Math.max(0, this.activeContract.durationSeconds - this.activeContract.elapsedSeconds);
      this.activeContract.progress01 = Math.min(1.0, this.activeContract.elapsedSeconds / this.activeContract.durationSeconds);

      if (this.activeContract.progress01 >= 1.0) {
        completedContract = { ...this.activeContract };
        this.activeContract = null;

        // Dismantle scaffolding
        if (this.currentScaffolding) {
          this.scene.remove(this.currentScaffolding);
          this.currentScaffolding = null;
        }

        // Return carpenter to workshop
        this.carpenterTarget.copy(this.carpenterStandby);
      }
    }

    return { completedContract };
  }

  exportState(): any {
    if (!this.activeContract) return null;
    return {
      contractId: this.activeContract.contractId,
      contractorName: this.activeContract.contractorName,
      targetType: this.activeContract.targetType,
      targetId: this.activeContract.targetId,
      targetName: this.activeContract.targetName,
      targetLevel: this.activeContract.targetLevel,
      cost: this.activeContract.cost,
      durationSeconds: this.activeContract.durationSeconds,
      elapsed: this.activeContract.elapsedSeconds,
      remaining: this.activeContract.remainingSeconds,
      progress01: this.activeContract.progress01,
      sitePosition: this.activeContract.sitePosition,
      description: this.activeContract.description,
    };
  }

  importState(data: any): void {
    if (this.currentScaffolding) {
      this.scene.remove(this.currentScaffolding);
      this.currentScaffolding = null;
    }

    if (!data) {
      this.activeContract = null;
      this.carpenterTarget.copy(this.carpenterStandby);
      this.carpenter.root.position.copy(this.carpenterStandby);
      return;
    }

    const pos = data.sitePos ?? data.sitePosition ?? [0, 0, 0];
    const total = data.total ?? data.durationSeconds ?? 30;
    const rem = data.remaining ?? total;
    const elapsed = data.elapsed ?? total - rem;

    this.activeContract = {
      contractId: data.contractId ?? `contract_${Date.now()}`,
      contractorName: data.contractorName ?? 'Kuttan Ashari',
      malayalam: 'കുട്ടൻ ആശാരി',
      targetType: data.targetType ?? 'furniture',
      targetId: data.targetId ?? '',
      targetName: data.targetName ?? 'Upgrade',
      targetLevel: data.targetLevel ?? 2,
      cost: data.cost ?? 0,
      durationSeconds: total,
      sitePosition: pos,
      description: data.description ?? '',
      elapsedSeconds: elapsed,
      remainingSeconds: rem,
      progress01: Math.min(1.0, elapsed / total),
    };

    // Rebuild scaffolding
    this.currentScaffolding = buildScaffoldingSite(pos);
    this.scene.add(this.currentScaffolding);

    this.carpenterTarget.set(pos[0] + 0.65, pos[1], pos[2] + 0.7);
  }
}
