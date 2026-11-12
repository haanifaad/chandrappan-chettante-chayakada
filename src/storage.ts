import type { CookMode } from './recipes';
import { normalizeMinute } from './time';
import type { LifestyleState } from './lifestyle';
import type { BusinessData } from './businesses';
import type { QuestState } from './quests';

/** Local persistence for customization, settings, lifestyle and runs (never required to play). */

export type ViewPreference = 'fp' | 'overview';

export interface Profile {
  shopName: string;
  trim: string;
  shirt: string;
  apron: string;
  mode: CookMode;
  view: ViewPreference;
  muted: boolean;
  /** Your name in multiplayer rooms. */
  playerName: string;
}

export const DEFAULT_PROFILE: Profile = {
  shopName: 'Chandrappan Chettante Chayakkada',
  trim: '#245C3C',
  shirt: '#5E93B6',
  apron: '#DB6846',
  mode: 'simple',
  view: 'fp',
  muted: false,
  playerName: '',
};

const KEY = 'chayakkada.profile.v1';

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const p = JSON.parse(raw) as Partial<Profile>;
    return { ...DEFAULT_PROFILE, ...p, shopName: (p.shopName ?? '').trim() || DEFAULT_PROFILE.shopName };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode) – the game still works */
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------- run progress

/** Saved at the start of each business day so a run can be continued. */
export interface RunSave {
  version: 2 | 3 | 4;
  day: number;
  /** Simulated minute-of-day; absent in v1 saves and migrated to opening time. */
  minute: number;
  money: number;
  reputation: number;
  streak: number;
  completed: number;
  lost: number;
  earnings: number;
  owned: string[];
  lifestyle?: Partial<LifestyleState>;
  businesses?: BusinessData[];
  quests?: QuestState[];
  hotel?: any;
  employees?: any[];
  helpers?: any[];
  families?: any[];
  furniture?: any[];
  placedItems?: any[];
  progression?: { currentStage?: number; completedPrerequisites?: string[]; prerequisites?: string[] };
  construction?: any;
}

const RUN_KEY = 'chayakkada.run.v1';
const RUN_KEY_V2 = 'chayakkada.run.v2';
const RUN_KEY_V3 = 'chayakkada.run.v3';
export const RUN_KEY_V4 = 'chayakkada.run.v4';

export function saveRun(r: RunSave) {
  try {
    localStorage.setItem(RUN_KEY_V4, JSON.stringify({ ...r, version: 4, minute: normalizeMinute(r.minute) }));
  } catch {
    /* ignore */
  }
}


export function migrateRunSave(r: Partial<RunSave>): RunSave {
  return {
    version: 4,
    day: Math.max(1, Math.floor(r.day ?? 1)),
    minute: normalizeMinute(typeof r.minute === 'number' ? r.minute : 7 * 60 + 30),
    money: typeof r.money === 'number' ? r.money : 0,
    reputation: typeof r.reputation === 'number' ? r.reputation : 5.0,
    streak: typeof r.streak === 'number' ? r.streak : 0,
    completed: typeof r.completed === 'number' ? r.completed : 0,
    lost: typeof r.lost === 'number' ? r.lost : 0,
    earnings: typeof r.earnings === 'number' ? r.earnings : 0,
    owned: Array.isArray(r.owned) ? r.owned.filter((id): id is string => typeof id === 'string') : [],
    lifestyle: r.lifestyle,
    businesses: r.businesses,
    quests: Array.isArray(r.quests) ? r.quests : undefined,
    hotel: r.hotel,
    employees: Array.isArray(r.employees)
      ? r.employees
      : Array.isArray((r as any).staff?.hired)
      ? (r as any).staff.hired
      : Array.isArray(r.helpers)
      ? r.helpers
      : undefined,
    helpers: Array.isArray(r.helpers) ? r.helpers : Array.isArray(r.employees) ? r.employees : undefined,
    families: Array.isArray(r.families) ? r.families : undefined,
    furniture: Array.isArray(r.furniture) ? r.furniture : undefined,
    placedItems: Array.isArray(r.placedItems) ? r.placedItems : Array.isArray(r.furniture) ? r.furniture : undefined,
    progression: r.progression
      ? {
          currentStage: r.progression.currentStage ?? 1,
          completedPrerequisites: r.progression.completedPrerequisites ?? r.progression.prerequisites ?? [],
        }
      : { currentStage: 1, completedPrerequisites: [] },
    construction: r.construction,
  };
}


export function loadRun(): RunSave | null {
  try {
    const raw = localStorage.getItem(RUN_KEY_V4) ?? localStorage.getItem(RUN_KEY_V3) ?? localStorage.getItem(RUN_KEY_V2) ?? localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Partial<RunSave>;
    if (typeof r.day !== 'number' || typeof r.reputation !== 'number' || r.reputation <= 0) return null;
    const migrated = migrateRunSave(r);
    // Persist the migrated v4 form once; keep older keys untouched for safety.
    if (!localStorage.getItem(RUN_KEY_V4)) saveRun(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(RUN_KEY);
    localStorage.removeItem(RUN_KEY_V2);
    localStorage.removeItem(RUN_KEY_V3);
    localStorage.removeItem(RUN_KEY_V4);
  } catch {
    /* ignore */
  }
}
