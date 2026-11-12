import * as THREE from 'three';

export interface LifestyleState {
  fatigue: number; // 0 (rested) to 100 (exhausted)
  sleepiness: number; // 0 (awake) to 100 (sleepy)
  bodyTemp: number; // 36.5 to 39.2 (Celsius)
  sweatLevel: number; // 0 (dry) to 100 (sweating)
  hydration: number; // 0 (dehydrated) to 100 (quenched)
  hunger: number; // 0 (famished) to 100 (full)
}

export const DEFAULT_LIFESTYLE: LifestyleState = {
  fatigue: 0,
  sleepiness: 0,
  bodyTemp: 37.0,
  sweatLevel: 0,
  hydration: 90,
  hunger: 85,
};

export class LifestyleManager {
  state: LifestyleState;

  constructor(initial: Partial<LifestyleState> = {}) {
    this.state = { ...DEFAULT_LIFESTYLE, ...initial };
  }

  get fatigue() {
    return this.state.fatigue;
  }
  get sleepiness() {
    return this.state.sleepiness;
  }
  get sweatLevel() {
    return this.state.sweatLevel;
  }
  get hydration() {
    return this.state.hydration;
  }
  get hunger() {
    return this.state.hunger;
  }
  get bodyTemp() {
    return this.state.bodyTemp;
  }

  /** Speed modifier based on fatigue, hunger, and sleepiness */
  get movementSpeedMultiplier(): number {
    let mul = 1.0;
    if (this.state.fatigue > 60) {
      mul *= THREE.MathUtils.lerp(1.0, 0.65, (this.state.fatigue - 60) / 40);
    }
    if (this.state.hunger < 20) {
      mul *= 0.88;
    }
    if (this.state.hydration < 20) {
      mul *= 0.88;
    }
    return THREE.MathUtils.clamp(mul, 0.5, 1.0);
  }

  /** Work efficiency multiplier for cooking timers */
  get workEfficiency(): number {
    let eff = 1.0;
    if (this.state.sleepiness > 70) {
      eff *= THREE.MathUtils.lerp(1.0, 0.75, (this.state.sleepiness - 70) / 30);
    }
    if (this.state.fatigue > 75) {
      eff *= 0.85;
    }
    return eff;
  }

  drinkWater(amount = 40) {
    this.state.hydration = Math.min(100, this.state.hydration + amount);
    this.state.bodyTemp = Math.max(36.6, this.state.bodyTemp - 0.5);
    this.state.sweatLevel = Math.max(0, this.state.sweatLevel - 30);
  }

  eatFood(amount = 45) {
    this.state.hunger = Math.min(100, this.state.hunger + amount);
    this.state.fatigue = Math.max(0, this.state.fatigue - 10);
  }

  wipeSweat() {
    this.state.sweatLevel = Math.max(0, this.state.sweatLevel - 50);
  }

  sleepRest() {
    this.state.sleepiness = 0;
    this.state.fatigue = 0;
    this.state.sweatLevel = 0;
    this.state.bodyTemp = 36.8;
    this.state.hydration = Math.max(40, this.state.hydration - 20);
    this.state.hunger = Math.max(35, this.state.hunger - 25);
  }

  update(
    dt: number,
    context: {
      isSitting: boolean;
      isMoving: boolean;
      isRunning: boolean;
      isCooking: boolean;
      isIndoors: boolean;
      isNearHearth: boolean;
      isRaining: boolean;
      minuteOfDay: number;
    },
  ) {
    const minScale = dt / 60; // scale per game minute

    // --- Fatigue ---
    if (context.isSitting) {
      // Sitting provides deep physical rest
      this.state.fatigue = Math.max(0, this.state.fatigue - 18 * minScale);
    } else if (context.isRunning) {
      this.state.fatigue = Math.min(100, this.state.fatigue + 14 * minScale);
    } else if (context.isCooking) {
      this.state.fatigue = Math.min(100, this.state.fatigue + 6 * minScale);
    } else if (context.isMoving) {
      this.state.fatigue = Math.min(100, this.state.fatigue + 2.5 * minScale);
    } else {
      // Standing idle
      this.state.fatigue = Math.max(0, this.state.fatigue - 4 * minScale);
    }

    // --- Sleepiness ---
    // Gradually increases over 24-hour cycle (~4.2 points per in-game hour)
    const lateNight = context.minuteOfDay > 22 * 60 || context.minuteOfDay < 5 * 60;
    const sleepinessRate = lateNight ? 7.5 : 4.0;
    this.state.sleepiness = Math.min(100, this.state.sleepiness + sleepinessRate * minScale);

    // --- Temperature & Sweating ---
    let ambientTemp = 24; // Munnar cool climate baseline in °C
    if (context.isRaining) ambientTemp -= 4;
    // Midday sun warming
    const middayFactor = Math.sin(((context.minuteOfDay - 6 * 60) / (12 * 60)) * Math.PI);
    if (middayFactor > 0 && !context.isRaining) {
      ambientTemp += middayFactor * 6;
    }

    let targetBodyTemp = 36.8;
    if (context.isNearHearth || context.isCooking) targetBodyTemp += 1.2;
    if (context.isRunning) targetBodyTemp += 1.1;
    if (ambientTemp > 26) targetBodyTemp += 0.5;
    if (context.isIndoors && !context.isNearHearth) targetBodyTemp -= 0.3;
    if (context.isRaining && !context.isIndoors) targetBodyTemp -= 0.6;

    this.state.bodyTemp = THREE.MathUtils.damp(this.state.bodyTemp, targetBodyTemp, 0.4, dt);

    // Sweating starts when body temperature elevates or after hard running
    if (this.state.bodyTemp > 37.4 || context.isRunning) {
      const sweatRate = (this.state.bodyTemp - 37.0) * 8;
      this.state.sweatLevel = Math.min(100, this.state.sweatLevel + sweatRate * minScale);
    } else {
      this.state.sweatLevel = Math.max(0, this.state.sweatLevel - 3 * minScale);
    }

    // --- Hydration ---
    let hydrationLoss = 1.8;
    if (this.state.sweatLevel > 40) hydrationLoss += 3.5;
    if (context.isRunning) hydrationLoss += 3.0;
    this.state.hydration = Math.max(0, this.state.hydration - hydrationLoss * minScale);

    // --- Hunger ---
    let hungerLoss = 1.4;
    if (context.isCooking || context.isRunning) hungerLoss += 1.8;
    this.state.hunger = Math.max(0, this.state.hunger - hungerLoss * minScale);
  }

  serialize(): LifestyleState {
    return { ...this.state };
  }

  deserialize(data?: Partial<LifestyleState>) {
    if (data) {
      this.state = { ...DEFAULT_LIFESTYLE, ...data };
    }
  }
}
