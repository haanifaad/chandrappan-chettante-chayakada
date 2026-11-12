import * as THREE from 'three';
import { CustomerModel, Look, createCustomerModel } from './customers';
import { PALETTE, TONES } from './palette';
import { G, group, part, toon } from './toon';
import { Employee, EmployeeRole } from './staff';
import { RECIPES, RecipeId } from './recipes';

export interface StaffPuppetCallbacks {
  onServeCustomer: (customerSlot: number, recipe: RecipeId) => void;
  onTableCleaned: (tableUid: string) => void;
  onKitchenAssisted: () => void;
  onXpGain: (empId: string, xp: number) => void;
  onLevelUp: (empId: string, newLevel: number) => void;
  onFloatText: (text: string, pos: THREE.Vector3, kind: 'gold' | 'bad') => void;
  onSfx: (name: string) => void;
}

export type StaffActionState =
  | 'idle'
  | 'walking_to_counter'
  | 'fetching_food'
  | 'carrying_food'
  | 'serving_customer'
  | 'walking_to_table'
  | 'scrubbing_table'
  | 'assisting_kitchen'
  | 'returning';

export class StaffPuppet {
  readonly employee: Employee;
  readonly model: CustomerModel;
  readonly role: EmployeeRole;
  state: StaffActionState = 'idle';

  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  private targetCustomerPos: THREE.Vector3 = new THREE.Vector3();
  private idlePosition: THREE.Vector3;
  private walkPhase = Math.random() * 10;
  private actionTimer = 0;
  private heldFoodMesh: THREE.Group | null = null;
  private currentDish: RecipeId | null = null;
  private targetCustomerSlot: number = -1;
  private targetTableUid: string = '';

  constructor(
    employee: Employee,
    scene: THREE.Scene,
    idlePos: THREE.Vector3,
    private callbacks: StaffPuppetCallbacks,
  ) {
    this.employee = employee;
    this.role = employee.role;
    this.idlePosition = idlePos.clone();
    this.currentTarget.copy(idlePos);

    // Look based on role and candidate
    let look: Look;
    if (employee.role === 'waiter') {
      look = {
        skin: '#C98A5E',
        shirt: '#FFFFFF',
        fullSleeve: true,
        lower: 'mundu',
        lowerColor: PALETTE.softWhite,
        border: PALETTE.leaf,
        hair: 'neat',
        hairColor: '#27271F',
        moustache: '#27271F',
        shoes: '#5A311E',
        height: 1.0,
      };
    } else if (employee.role === 'cleaner') {
      look = {
        skin: '#B07047',
        shirt: '#428B55',
        lower: 'pants',
        lowerColor: '#34342D',
        hair: 'short',
        hairColor: '#34342D',
        shoes: '#34342D',
        height: 0.96,
      };
    } else {
      // Cook / Kitchen helper
      look = {
        skin: '#C98A5E',
        shirt: '#DB6846',
        lower: 'mundu',
        lowerColor: PALETTE.softWhite,
        border: PALETTE.gold,
        hair: 'bun',
        hairColor: '#27271F',
        shoes: '#5A311E',
        height: 1.02,
      };
    }

    this.model = createCustomerModel(look);
    this.model.root.position.copy(idlePos);
    this.model.setMood('happy');
    scene.add(this.model.root);

    this.attachRoleProp();
  }

  private attachRoleProp(): void {
    if (this.role === 'waiter') {
      // Serving tray in right hand
      const tray = group(this.model.hand, [0, 0, 0.1]);
      part(tray, G.cyl(0.12, 0.14, 0.02, 14), toon(TONES.brass), { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] });
    } else if (this.role === 'cleaner') {
      // Yellow cleaning cloth/sponge in right hand
      part(this.model.hand, G.box(0.08, 0.05, 0.12), toon('#F4D03F'), { pos: [0, -0.02, 0.05] });
    } else if (this.role === 'cook') {
      // Wooden cooking ladle in hand
      part(this.model.hand, G.cyl(0.015, 0.015, 0.35, 6), toon(TONES.woodMid), { pos: [0, 0.1, 0.05], rot: [-Math.PI / 4, 0, 0] });
      part(this.model.hand, G.sphere(0.04, 8, 6), toon(TONES.steel), { pos: [0, 0.22, 0.16] });
    }
  }

  get position(): THREE.Vector3 {
    return this.model.root.position;
  }

  // Assign Waiter to deliver food
  assignWaiterDelivery(counterSlotPos: THREE.Vector3, customerSlotPos: THREE.Vector3, slot: number, dish: RecipeId): boolean {
    if (this.role !== 'waiter' || this.state !== 'idle') return false;
    this.targetCustomerSlot = slot;
    this.currentDish = dish;
    this.currentTarget.copy(counterSlotPos);
    this.targetCustomerPos.copy(customerSlotPos);
    this.state = 'walking_to_counter';
    this.employee.currentTask = `Fetching ${RECIPES[dish]?.name ?? dish}`;
    return true;
  }

  // Assign Cleaner to clean dirty table
  assignCleanTable(tablePos: THREE.Vector3, tableUid: string): boolean {
    if (this.role !== 'cleaner' || this.state !== 'idle') return false;
    this.targetTableUid = tableUid;
    // Walk to the front of the table
    this.currentTarget.set(tablePos.x, tablePos.y, tablePos.z + 0.65);
    this.state = 'walking_to_table';
    this.employee.currentTask = 'Walking to clean table';
    return true;
  }

  update(dt: number, isKitchenCookingActive: boolean): void {
    if (!this.employee.isWorking) {
      this.model.root.visible = false;
      return;
    }
    this.model.root.visible = true;

    // Movement speed scales with employee level (Level 1: 2.8, Level 10: 5.5)
    const baseSpeed = 2.6 + (this.employee.level ?? 1) * 0.28;
    const pos = this.model.root.position;

    // State Machine
    switch (this.state) {
      case 'idle':
        // Waiter / Cleaner resting at idle spot
        if (pos.distanceTo(this.idlePosition) > 0.2) {
          this.walkTowards(this.idlePosition, baseSpeed, dt);
        } else {
          this.setIdleAnim(dt);
          if (this.role === 'cook') {
            this.state = 'assisting_kitchen';
          }
        }
        break;

      case 'walking_to_counter':
        if (this.walkTowards(this.currentTarget, baseSpeed, dt)) {
          this.state = 'fetching_food';
          this.actionTimer = 0.6; // brief pickup pause
          this.employee.currentTask = `Picking up ${this.currentDish ? (RECIPES[this.currentDish]?.name ?? 'order') : 'order'}`;
        }
        break;

      case 'fetching_food':
        this.actionTimer -= dt;
        if (this.actionTimer <= 0) {
          this.spawnHeldFood();
          this.callbacks.onSfx('clink');
          this.currentTarget.set(this.targetCustomerPos.x, this.targetCustomerPos.y, this.targetCustomerPos.z + 0.65);
          this.state = 'carrying_food';
          this.employee.currentTask = `Delivering ${this.currentDish ? (RECIPES[this.currentDish]?.name ?? 'dish') : 'dish'} to customer`;
        }
        break;

      case 'carrying_food':
        if (this.walkTowards(this.currentTarget, baseSpeed, dt)) {
          this.state = 'serving_customer';
          this.actionTimer = 0.5;
        }
        break;

      case 'serving_customer':
        this.actionTimer -= dt;
        if (this.actionTimer <= 0) {
          if (this.currentDish !== null && this.targetCustomerSlot >= 0) {
            this.callbacks.onServeCustomer(this.targetCustomerSlot, this.currentDish);
            this.gainXP(25);
            this.callbacks.onFloatText('+25 XP (Served)', this.position, 'gold');
          }
          this.removeHeldFood();
          this.currentDish = null;
          this.targetCustomerSlot = -1;
          this.currentTarget.copy(this.idlePosition);
          this.state = 'returning';
          this.employee.currentTask = 'Returning to post';
        }
        break;

      case 'walking_to_table':
        if (this.walkTowards(this.currentTarget, baseSpeed, dt)) {
          this.state = 'scrubbing_table';
          this.actionTimer = 2.4; // 2.4 seconds scrubbing
          this.employee.currentTask = 'Scrubbing table clean ✨';
        }
        break;

      case 'scrubbing_table':
        this.actionTimer -= dt;
        this.animateScrubbing(dt);
        if (this.actionTimer <= 0) {
          this.callbacks.onTableCleaned(this.targetTableUid);
          this.gainXP(30);
          this.callbacks.onFloatText('+30 XP (Cleaned)', this.position, 'gold');
          this.callbacks.onSfx('success');
          this.targetTableUid = '';
          this.currentTarget.copy(this.idlePosition);
          this.state = 'returning';
          this.employee.currentTask = 'Table pristine!';
        }
        break;

      case 'assisting_kitchen':
        if (isKitchenCookingActive) {
          this.animateStirring(dt);
          this.employee.currentTask = 'Actively simmering & prepping';
          this.actionTimer += dt;
          if (this.actionTimer >= 4.0) {
            this.actionTimer = 0;
            this.callbacks.onKitchenAssisted();
            this.gainXP(15);
            this.callbacks.onFloatText('+15 XP (Kitchen Assist)', this.position, 'gold');
          }
        } else {
          this.setIdleAnim(dt);
          this.employee.currentTask = 'Kitchen ready for orders';
        }
        break;

      case 'returning':
        if (this.walkTowards(this.idlePosition, baseSpeed, dt)) {
          this.state = 'idle';
          this.employee.currentTask = 'On duty';
        }
        break;
    }
  }

  private walkTowards(target: THREE.Vector3, speed: number, dt: number): boolean {
    const pos = this.model.root.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.15) {
      return true; // reached target
    }

    const moveStep = Math.min(dist, speed * dt);
    pos.x += (dx / dist) * moveStep;
    pos.z += (dz / dist) * moveStep;

    // Face movement direction
    this.model.root.rotation.y = Math.atan2(dx, dz);

    // Walking animation
    this.walkPhase += dt * speed * 4.5;
    const swing = Math.sin(this.walkPhase) * 0.45;
    this.model.legs[0].rotation.x = swing;
    this.model.legs[1].rotation.x = -swing;
    this.model.arms[0].rotation.x = -swing * 0.7;
    this.model.arms[1].rotation.x = swing * 0.7;
    pos.y = this.idlePosition.y + Math.abs(Math.sin(this.walkPhase)) * 0.04; // natural footstep bob

    return false;
  }

  private setIdleAnim(dt: number): void {
    this.walkPhase += dt * 1.5;
    this.model.legs[0].rotation.x = 0;
    this.model.legs[1].rotation.x = 0;
    this.model.arms[0].rotation.x = Math.sin(this.walkPhase) * 0.05;
    this.model.arms[1].rotation.x = -Math.sin(this.walkPhase) * 0.05;
    this.model.root.position.y = this.idlePosition.y;
  }

  private animateScrubbing(dt: number): void {
    this.walkPhase += dt * 10;
    const scrub = Math.sin(this.walkPhase) * 0.35;
    this.model.arms[0].rotation.x = -Math.PI / 3 + scrub;
    this.model.arms[0].rotation.z = scrub * 0.5;
  }

  private animateStirring(dt: number): void {
    this.walkPhase += dt * 8;
    const stir = Math.sin(this.walkPhase) * 0.25;
    this.model.arms[0].rotation.x = -Math.PI / 3 + stir;
    this.model.arms[0].rotation.y = Math.cos(this.walkPhase) * 0.25;
  }

  private spawnHeldFood(): void {
    this.removeHeldFood();
    if (!this.currentDish) return;

    this.heldFoodMesh = new THREE.Group();
    // Glass or plate
    const isSnack = this.currentDish === 'pazhampori' || this.currentDish === 'parippuvada' || this.currentDish === 'dosa' || this.currentDish === 'puttu';
    if (isSnack) {
      part(this.heldFoodMesh, G.cyl(0.08, 0.08, 0.015, 12), toon(TONES.steel), { pos: [0, 0.04, 0] });
      part(this.heldFoodMesh, G.sphere(0.04, 8, 6), toon(TONES.fried), { pos: [0, 0.06, 0] });
    } else {
      part(this.heldFoodMesh, G.cyl(0.035, 0.025, 0.08, 10), toon(TONES.glass), { pos: [0, 0.04, 0] });
      part(this.heldFoodMesh, G.cyl(0.03, 0.02, 0.07, 8), toon(TONES.tea), { pos: [0, 0.038, 0] });
    }

    this.model.hand.add(this.heldFoodMesh);
  }

  private removeHeldFood(): void {
    if (this.heldFoodMesh) {
      this.model.hand.remove(this.heldFoodMesh);
      this.heldFoodMesh = null;
    }
  }

  gainXP(amount: number): void {
    this.employee.experience = (this.employee.experience ?? 0) + amount;
    this.callbacks.onXpGain(this.employee.id, amount);

    // Level formula: Level 1 -> 100 XP, Level 2 -> 200 XP, etc.
    const currentLvl = this.employee.level ?? 1;
    if (currentLvl < 10) {
      const requiredXp = currentLvl * 100;
      if (this.employee.experience >= requiredXp) {
        this.employee.level = currentLvl + 1;
        this.employee.experience -= requiredXp;
        this.callbacks.onLevelUp(this.employee.id, this.employee.level);
        this.callbacks.onFloatText(`⭐ LEVEL UP! (Lvl ${this.employee.level})`, this.position, 'gold');
        this.callbacks.onSfx('coin');
      }
    }
  }

  setTargetCustomerSlot(slot: number, slotPos: THREE.Vector3, dish: RecipeId): void {
    this.targetCustomerSlot = slot;
    this.currentDish = dish;
    this.currentTarget.copy(slotPos);
  }

  destroy(scene: THREE.Scene): void {
    this.removeHeldFood();
    scene.remove(this.model.root);
  }
}
