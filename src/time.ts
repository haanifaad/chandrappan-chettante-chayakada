/**
 * Simulation clock shared by the authoritative shop, NPC schedules and
 * presentation. It intentionally stores a minute-of-day rather than wall
 * time, making it deterministic and cheap to replicate.
 */

export type DayPeriod = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface ClockState {
  /** Day number of the current business run (one-based). */
  day: number;
  /** Minutes since midnight, normalized to 0…1439. */
  minute: number;
}

export const MINUTES_PER_DAY = 24 * 60;
/** A complete visual day lasts 12 real-time minutes while the shop is open. */
export const DEFAULT_CLOCK_SPEED = MINUTES_PER_DAY / (12 * 60);

export function normalizeMinute(minute: number): number {
  return ((Math.floor(minute) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function dayPeriod(minute: number): DayPeriod {
  const m = normalizeMinute(minute);
  if (m < 6 * 60) return 'night';
  if (m < 8 * 60) return 'dawn';
  if (m < 12 * 60) return 'morning';
  if (m < 17 * 60) return 'afternoon';
  if (m < 19 * 60) return 'evening';
  return 'night';
}

/** 0 at midnight, 1 at noon; useful for sun direction and brightness. */
export function daylight(minute: number): number {
  const sun = Math.sin(((normalizeMinute(minute) - 6 * 60) / (12 * 60)) * Math.PI);
  return Math.max(0, sun);
}

export class GameClock {
  private state: ClockState;

  constructor(initial: ClockState = { day: 1, minute: 7 * 60 + 30 }, readonly speed = DEFAULT_CLOCK_SPEED) {
    this.state = { day: Math.max(1, Math.floor(initial.day)), minute: normalizeMinute(initial.minute) };
  }

  get snapshot(): ClockState {
    return { ...this.state };
  }

  get minute() {
    return this.state.minute;
  }

  get period() {
    return dayPeriod(this.state.minute);
  }

  reset(day = 1, minute = 7 * 60 + 30) {
    this.state = { day: Math.max(1, Math.floor(day)), minute: normalizeMinute(minute) };
  }

  apply(next: ClockState) {
    this.state = { day: Math.max(1, Math.floor(next.day)), minute: normalizeMinute(next.minute) };
  }

  update(dt: number) {
    this.state.minute = normalizeMinute(this.state.minute + Math.max(0, dt) * this.speed);
  }
}
