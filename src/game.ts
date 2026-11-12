import * as THREE from 'three';
import { CookingSession } from './cooking';
import { CookMode, RECIPES, RecipeId } from './recipes';
import { CUSTOMER_TYPES, Customer, CustomerType } from './customers';
import { CounterItem, ServingCounter } from './food';
import { Picker, Pickable } from './interactions';
import { CookingPanel, PanelView } from './cookingPanel';
import { QUEUE_SLOTS, SERVE_SLOTS, Shop } from './shop';
import { UPGRADES, UpgradeId } from './upgrades';
import { CustomerPuppet } from './mirror';
import type { CameraDirector } from './camera';
import type { Rain } from './effects';
import type { GameOverStats, Hud, OrderView } from './ui';
import type { Station, StationId } from './types';
import type { ResultsView } from './screens';
import type { Sfx } from './audio';
import type { CustSnap, GameEvent, Intent, ItemSnap, Phase, PlayerSnap, SessionSnap, Snapshot } from './protocol';
import { RunSave, clearRun, saveRun } from './storage';
import { GameClock } from './time';
import { LifestyleManager } from './lifestyle';
import { BusinessCycleManager } from './businessCycle';
import { BusinessManager } from './businesses';
import { Village } from './village';
import { SharedCustomerAI } from './customerAI';
import type { CharacterAnimState } from './models';
import { QuestManager, QuestState } from './quests';
import { HotelManager } from './hotel';
import { StaffManager } from './staff';
import { FamilyRegistryManager, type FamilyProfile } from './familyRegistry';
import { type ActiveFamilyGroup, createActiveFamily, tickFamilyChatter } from './family';
import { FurnitureManager } from './furniture';
import { ConstructionManager, ConstructionContractDef } from './construction';
import { ProgressionManager } from './progression';
import { StaffPuppet } from './staffPuppet';

export type { Phase } from './protocol';

/**
 * Central game state and rules: business days, spawning, cooking, serving,
 * money, reputation, upgrades, pause and game over.
 *
 * Multiplayer: in 'solo' and 'host' roles this class runs the shop. Every
 * player has their own cooking session and their own hands; guests send
 * intents which the host applies on their behalf. In the 'guest' role it
 * mirrors the host's snapshots and forwards the local player's intents.
 */

const MAX_REP = 5;
const STREAK_BONUS = 5;
/** Difficulty – tuned to be relaxed and forgiving. */
const EASY = {
  patienceMul: 1.6,
  cookSpeed: 1.3,
  firstSpawn: 3,
  spawnMin: 11,
  spawnRange: 5,
  spawnFloor: 7,
};
/** Co-op: customers come a little faster with more cooks. */
const MULTI_SPAWN = [1, 1, 0.8, 0.7, 0.62];
/** How close you must be to use a station or serve someone. */
const REACH_STATION = 3.8;
const REACH_SERVE = 4.8;
const SNAPSHOT_HZ = 12;

export type NetRole = 'solo' | 'host' | 'guest';

export const dayQuota = (day: number) => Math.min(12, 6 + (day - 1) * 2);

interface Flight {
  model: THREE.Object3D;
  from: THREE.Vector3;
  customer: Customer;
  t: number;
}

export interface Player {
  id: string;
  name: string;
  shirt: string;
  apron: string;
  session: CookingSession | null;
  held: CounterItem | null;
  /** Eye position and facing. */
  pos: THREE.Vector3;
  yaw: number;
  anim?: CharacterAnimState;
}

export interface RemotePlayer {
  id: string;
  name: string;
  shirt: string;
  apron: string;
  pos: THREE.Vector3;
  yaw: number;
  anim?: CharacterAnimState;
  speed?: number;
}

/** What the game needs from the network (implemented in main over Net). */
export interface GameLink {
  toHost(msg: Record<string, unknown>): void;
  toPlayer(id: string, msg: Record<string, unknown>): void;
  broadcast(msg: Record<string, unknown>, unreliable?: boolean): void;
}

export interface GameEvents {
  onDayEnd(v: ResultsView): void;
  onGameOver(): void;
  /** Big event banner (Customer Rush); null hides it. */
  onEvent(text: string | null, frac: number): void;
  sfx(name: Sfx): void;
  /** Guests: the host changed weather / shop look / phase. */
  onHeavyRain(on: boolean): void;
  onShopLook(name: string, trim: string): void;
  onDayStart(): void;
  onWaiting(): void;
}

const RUSH_SECONDS = 30;
const RUSH_BONUS = 3;
const RUSH_TEXT = 'Chayakkadayil innu nalla thirakku!';

export const FUNNY_LINES = [
  'Chetta, ivide WiFi undo? Password "chaya123" aano?',
  'Ee mazha ini eppo theerum, chetta?',
  'Ningalude chaya kudichal pinne vere chaya venda!',
  'Pazhampori-kku ithrem valuppam evide ninnu padichu?',
  'Chetta, ee kadakku Instagram page undo?',
  'Munnar-il ithrem nalla chaya vere evideyum kittilla!',
  'Mazha kandappo thanne chaya ormma vannu!',
  'Ente diet naale muthal aanu. Innu oru pazhampori koodi!',
];

/** Common shape for customers on the host (Customer) and guests (CustomerPuppet). */
interface CustomerView {
  id: number;
  name: string;
  order: RecipeId;
  frac: number;
  wrong: boolean;
  waiting: boolean;
  arriving: boolean;
  line: string | null;
  position: THREE.Vector3;
  scale: number;
  famId?: string;
  famLead?: boolean;
  famName?: string;
  isSpecialEvent?: boolean;
  eventTitle?: string;
  multiOrder?: { recipe: RecipeId; quantity: number; delivered: number }[];
}

export class Game {
  role: NetRole = 'solo';
  localId = 'local';
  players = new Map<string, Player>();
  private link: GameLink | null = null;

  phase: Phase = 'menu';
  shopName = '';
  trim = '#245C3C';
  money = 0;
  reputation = MAX_REP;
  day = 1;
  /** Authoritative in solo/host mode; guests mirror it from snapshots. */
  readonly clock = new GameClock();
  level = 1;
  streak = 0;
  completed = 0;
  lost = 0;
  earnings = 0;
  today = { completed: 0, lost: 0, earnings: 0, spawned: 0, handled: 0, bonus: 0 };
  owned = new Set<UpgradeId>();
  heavyRain = false;
  rush: { t: number } | null = null;
  private rushPlannedAt = -1;
  private announced = new Set<number>();
  private dayStart: RunSave | null = null;
  paused = false;
  mode: CookMode = 'simple';
  /** Portions per cook – bulk cooking for busy moments. */
  batch = 1;

  readonly lifestyle = new LifestyleManager();
  readonly businessCycle = new BusinessCycleManager();
  readonly businessManager = new BusinessManager();
  readonly quests = new QuestManager();
  readonly hotel = new HotelManager();
  readonly staff = new StaffManager();
  readonly familyRegistry = new FamilyRegistryManager();
  readonly activeFamilies = new Map<string, ActiveFamilyGroup>();
  readonly furnitureManager: FurnitureManager;
  readonly progression: ProgressionManager;
  readonly construction: ConstructionManager;
  readonly staffPuppets = new Map<string, StaffPuppet>();
  private dirtyTableTimer = 25;
  village: Village;

  openStation: Station | null = null;
  customers: Customer[] = [];

  private spawnTimer = EASY.firstSpawn;
  private dayEndTimer = -1;
  private flights: Flight[] = [];
  private counter: ServingCounter;
  private panel: CookingPanel;
  private stationPick = new Map<string, Pickable>();
  private v = new THREE.Vector3();
  private snapTimer = 0;
  private snapDirty = false;
  private overStats: GameOverStats | null = null;
  private heldKey = '';

  // guest mirror state
  private puppets = new Map<number, CustomerPuppet>();
  private guestSession: CookingSession | null = null;
  private guestSessionKey = '';
  private guestHeld: number | null = null;
  private remoteSnaps: PlayerSnap[] = [];
  private lastSnap: Snapshot | null = null;
  private itemKeys = new Map<number, string>();

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private dom: HTMLElement,
    private shop: Shop,
    private picker: Picker,
    private hud: Hud,
    private director: CameraDirector,
    private rain: Rain,
    private events: GameEvents,
  ) {
    this.village = new Village(scene);
    this.counter = new ServingCounter(scene, SERVE_SLOTS);
    this.furnitureManager = new FurnitureManager(scene);
    this.progression = new ProgressionManager(1);
    this.construction = new ConstructionManager(scene);
    for (const f of this.furnitureManager.getAll()) {
      picker.add({ kind: 'furniture', key: `furn:${f.uid}`, root: f.root, ringRadius: 0.65 });
    }
    for (const s of shop.stations) {
      const p: Pickable = { kind: 'station', key: `station:${s.id}`, root: s.root, ringRadius: s.ringRadius };
      this.stationPick.set(s.id, p);
      picker.add(p);
    }
    this.panel = new CookingPanel(hud.layer, {
      onChoose: (r) => this.intent('start', { r, m: this.mode, b: this.batch }),
      onAction: (a) => this.intent('act', { a }),
      onCollect: () => this.intent('collect', {}),
      onDiscard: () => this.intent('discard', {}),
      onClose: () => this.closePanel(),
      onMode: (m) => {
        this.mode = m;
        this.refreshPanel();
      },
      onBatch: (n) => {
        this.batch = n;
        this.refreshPanel();
      },
      onGoTo: (id) => {
        const st = this.shop.stations.find((s) => s.id === id);
        if (st) this.openPanel(st);
      },
    });
    this.players.set(this.localId, this.newPlayer(this.localId, 'You', '#5E93B6', '#DB6846'));
  }

  private newPlayer(id: string, name: string, shirt: string, apron: string): Player {
    return { id, name, shirt, apron, session: null, held: null, pos: new THREE.Vector3(-0.5, 2.3, -0.05), yaw: 0 };
  }

  // ------------------------------------------------------------ roles & net

  get isGuest() {
    return this.role === 'guest';
  }
  get isAuthority() {
    return this.role !== 'guest';
  }
  get multiplayer() {
    return this.role !== 'solo';
  }

  /** Switch between solo / host / guest. Keeps the local player's look. */
  setRole(role: NetRole, localId: string, link: GameLink | null) {
    const me = this.me;
    this.role = role;
    this.link = link;
    this.players.clear();
    this.localId = localId;
    this.players.set(localId, { ...me, id: localId, session: null, held: null });
    this.remoteSnaps = [];
    this.clearPuppets();
  }

  setLocalLook(name: string, shirt: string, apron: string) {
    const me = this.me;
    me.name = name;
    me.shirt = shirt;
    me.apron = apron;
  }

  get me(): Player {
    return this.players.get(this.localId)!;
  }

  /** Every frame: where the local player is (camera eye + facing). */
  setLocalPose(eye: THREE.Vector3, yaw: number, anim?: CharacterAnimState) {
    this.me.pos.copy(eye);
    this.me.yaw = yaw;
    if (anim) this.me.anim = anim;
  }

  /** Host: a guest said hello. */
  addPlayer(id: string, name: string, shirt: string, apron: string) {
    if (!this.isAuthority) return;
    this.players.set(id, this.newPlayer(id, name, shirt, apron));
    this.tellAll({ k: 'toast', text: `${name} joined the shop!`, kind: 'gold' });
    this.snapDirty = true;
  }

  /** Host: a guest left – free their hands and station. */
  removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p || id === this.localId) return;
    if (p.held) p.held.held = false;
    this.players.delete(id);
    this.updateBusyStations();
    this.tellAll({ k: 'toast', text: `${p.name} left the shop.`, kind: 'info' });
    this.snapDirty = true;
  }

  /** Host: receive a guest's message. */
  onNetMessage(from: string, msg: Record<string, unknown>) {
    if (this.isAuthority) {
      const p = this.players.get(from);
      if (msg.t === 'pose' && p) {
        p.pos.set(Number(msg.x), Number(msg.y), Number(msg.z));
        p.yaw = Number(msg.yaw);
        if (msg.anim) p.anim = msg.anim as CharacterAnimState;
      } else if (msg.t === 'act' && p) {
        this.apply(from, msg.a as Intent, (msg.args ?? {}) as Record<string, unknown>);
      }
    } else {
      if (msg.t === 'snap') this.applySnapshot(msg as unknown as Snapshot);
      else if (msg.t === 'ev') this.handleEvent(msg.ev as GameEvent);
    }
  }

  /** Remote players to draw as avatars (everyone except me). */
  remotePlayers(): RemotePlayer[] {
    if (this.isAuthority)
      return [...this.players.values()].filter((p) => p.id !== this.localId).map((p) => ({ ...p, pos: p.pos.clone(), anim: p.anim }));
    return this.remoteSnaps.map((p) => ({ id: p.id, name: p.name, shirt: p.shirt, apron: p.apron, pos: new THREE.Vector3(p.x, p.y, p.z), yaw: p.yaw, anim: p.anim, speed: p.speed }));
  }

  // ------------------------------------------------------------- feedback

  private handleEvent(ev: GameEvent) {
    switch (ev.k) {
      case 'panel':
        if (this.panel.isOpen) this.panel.say(ev.text, ev.tone);
        break;
      case 'toast':
        this.hud.toast(ev.text, ev.kind);
        break;
      case 'sfx':
        this.events.sfx(ev.name as Sfx);
        break;
      case 'float': {
        const s = this.toScreen(this.v.set(ev.x, ev.y, ev.z));
        if (s.visible) this.hud.floatText(ev.text, s.x, s.y, ev.kind);
        break;
      }
      case 'look':
        this.director.lookAt(new THREE.Vector3(ev.x, ev.y, ev.z));
        break;
      case 'close':
        this.closePanel();
        break;
    }
  }

  /** Feedback for one player (local or remote). */
  private tell(pid: string, ev: GameEvent) {
    if (pid === this.localId) this.handleEvent(ev);
    else this.link?.toPlayer(pid, { t: 'ev', ev });
  }

  /** Feedback for everyone in the shop. */
  private tellAll(ev: GameEvent) {
    this.handleEvent(ev);
    if (this.role === 'host') this.link?.broadcast({ t: 'ev', ev });
  }

  private sfxAll(name: Sfx) {
    this.tellAll({ k: 'sfx', name });
  }

  // ------------------------------------------------------------------ input

  private get patienceBonus() {
    return this.owned.has('roof') ? 10 : 0;
  }
  private get cookSpeed() {
    return EASY.cookSpeed * (this.owned.has('stove') ? 1.25 : 1);
  }
  private get queueSize() {
    return this.owned.has('seating') ? 4 : 3;
  }
  /** Customers expected today (host spawns and rush add bonus ones). */
  get quota() {
    return dayQuota(this.day) + this.today.bonus;
  }
  private get playing() {
    return this.phase === 'playing' && !this.paused;
  }

  hover(p: Pickable | null, x: number, y: number) {
    this.hud.setTooltip(p && this.phase === 'playing' ? this.describe(p) : null, x, y);
  }

  click(p: Pickable | null) {
    if (!this.playing || !p) return;
    if (p.kind === 'station') {
      const st = this.shop.stations.find((s) => `station:${s.id}` === p.key);
      if (!st) return;
      if (!this.within(st.root.getWorldPosition(this.v), REACH_STATION)) {
        this.hud.toast(`Walk closer to the ${st.name}.`, 'info');
        return;
      }
      this.openPanel(st);
    } else if (p.kind === 'item') {
      const uid = Number(p.key.split(':')[1]);
      this.pickItem(uid);
    } else if (p.kind === 'customer') {
      this.serveId(Number(p.key.split(':')[1]));
    } else if (p.kind === 'furniture') {
      const uid = p.key.split(':')[1];
      const item = this.furnitureManager.get(uid);
      if (item) {
        if (item.isDirty) {
          this.cleanTable(uid);
        } else {
          this.toggleManagement();
        }
      }
    }
  }

  private within(p: THREE.Vector3, reach: number) {
    const me = this.me.pos;
    return Math.hypot(p.x - me.x, p.z - me.z) <= reach;
  }

  /** HUD shortcut / 3D click: pick up or put down a counter item. */
  pickItem(uid: number) {
    if (!this.playing) return;
    if (this.localHeld()?.uid === uid) this.intent('drop', {});
    else this.intent('pick', { uid });
  }

  putDown() {
    if (this.localHeld()) this.intent('drop', {});
  }

  serveId(id: number) {
    if (!this.playing) return;
    const view = this.views().find((c) => c.id === id);
    if (!view || !view.waiting) return;
    if (!this.within(view.position, REACH_SERVE)) {
      this.hud.toast(`Walk closer to serve the ${view.name}.`, 'info');
      return;
    }
    this.intent('serve', { id });
  }

  escape() {
    if (this.panel.isOpen) this.closePanel();
    else if (this.localHeld()) this.putDown();
  }

  togglePause() {
    if (this.phase !== 'playing' || this.isGuest) return;
    this.paused = !this.paused;
    this.picker.enabled = !this.paused;
    this.hud.setPaused(this.paused, true);
    this.snapDirty = true;
  }

  /** First person: 1 = look at the counter/customers, 2 = look at the kitchen. */
  look(where: 'counter' | 'kitchen') {
    if (where === 'counter') this.director.lookAt(new THREE.Vector3(0.6, 1.75, 2.9));
    else this.director.lookAt(new THREE.Vector3(-2.7, 1.15, 0.4));
  }

  /** Send an intent to the host, or apply it locally when we are the authority. */
  private intent(name: Intent, args: Record<string, unknown>) {
    if (!this.playing) return;
    if (this.isGuest) this.link?.toHost({ t: 'act', a: name, args });
    else {
      this.apply(this.localId, name, args);
      this.refreshPanel();
    }
  }

  private localSession(): CookingSession | null {
    return this.isGuest ? this.guestSession : this.me.session;
  }

  private localHeld(): CounterItem | null {
    if (!this.isGuest) return this.me.held;
    return this.counter.list().find((i) => i.uid === this.guestHeld) ?? null;
  }

  private views(): CustomerView[] {
    if (this.isGuest) {
      return [...this.puppets.values()].map((p) => ({
        id: p.id,
        name: p.famName ? `${p.famName} (${p.type.name})` : p.type.name,
        order: p.snap.o,
        frac: p.snap.f,
        wrong: p.snap.w,
        waiting: p.waiting,
        arriving: p.snap.st === 'arriving',
        line: p.snap.ln,
        position: p.position,
        scale: p.model.root.scale.y,
        famId: p.snap.famId,
        famLead: p.snap.famLead,
        famName: p.snap.famName,
        multiOrder: p.snap.multiOrder ? p.snap.multiOrder.map((m) => ({ recipe: m.r, quantity: m.q, delivered: m.d })) : undefined,
      }));
    }
    return this.customers.map((c) => {
      const fam = c.famId ? this.activeFamilies.get(c.famId) : undefined;
      return {
        id: c.id,
        name: c.famName ? `${c.famName} (${c.type.name})` : c.type.name,
        order: c.order,
        frac: c.patience / c.patienceMax,
        wrong: c.wrongCount > 0,
        waiting: c.waiting,
        arriving: c.state === 'arriving',
        line: c.lineTimer > 0 ? c.line : null,
        position: c.position,
        scale: c.scale,
        famId: c.famId,
        famLead: c.famLead,
        famName: c.famName,
        isSpecialEvent: fam?.isSpecialEvent,
        eventTitle: fam?.eventTitle,
        multiOrder: fam ? fam.order.items : undefined,
      };
    });
  }

  private describe(p: Pickable): string {
    const held = this.localHeld();
    if (p.kind === 'station') {
      const st = this.shop.stations.find((s) => `station:${s.id}` === p.key)!;
      const s = this.localSession();
      const other = this.stationUser(st.id);
      if (s?.station === st.id) return `${st.name} — cooking ${s.recipe.name}`;
      if (other) return `${st.name} — ${other} is cooking here`;
      return `${st.name} — click to cook`;
    }
    if (p.kind === 'item') {
      const item = this.counter.list().find((i) => `item:${i.uid}` === p.key);
      if (!item) return '';
      return held === item ? 'Click to put it down' : `${RECIPES[item.recipe].name} — click to pick up`;
    }
    if (p.kind === 'furniture') {
      const uid = p.key.split(':')[1];
      const item = this.furnitureManager.get(uid);
      if (!item) return '';
      if (item.isDirty) return `${item.getCurrentTierDef().name} (Dirty! Click to clean ✨)`;
      return `${item.getCurrentTierDef().name} (Lvl ${item.level}) — click to manage`;
    }
    const c = this.views().find((x) => `cust:${x.id}` === p.key);
    if (!c) return '';
    if (!c.waiting) return c.name;
    if (c.multiOrder) {
      const remaining = c.multiOrder.filter((i) => i.delivered < i.quantity).map((i) => `${i.quantity - i.delivered}x ${RECIPES[i.recipe]?.name ?? i.recipe}`).join(', ');
      return held ? `Serve ${RECIPES[held.recipe]?.name ?? held.recipe} to ${c.name}` : `${c.name} Order: ${remaining || 'Ready'}`;
    }
    return held ? `Serve ${RECIPES[held.recipe].name} to ${c.name}` : `${c.name} wants ${RECIPES[c.order].name}`;
  }

  /** Name of another player cooking at this station, if any. */
  private stationUser(id: StationId): string | null {
    if (this.isGuest) return this.remoteSnaps.find((p) => p.s && RECIPES[p.s.r].station === id)?.name ?? null;
    for (const p of this.players.values()) if (p.id !== this.localId && p.session?.station === id) return p.name;
    return null;
  }

  // ---------------------------------------------------------------- cooking

  private panelView(st: Station): PanelView {
    const wanted: Partial<Record<RecipeId, number>> = {};
    for (const c of this.views()) if (c.waiting) wanted[c.order] = (wanted[c.order] ?? 0) + 1;
    const s = this.localSession();
    const busyAt =
      s && s.station !== st.id ? { id: s.station, name: this.shop.stations.find((x) => x.id === s.station)!.name } : null;
    const other = this.stationUser(st.id);
    return {
      station: st,
      mode: this.mode,
      session: s && s.station === st.id ? s : null,
      busyAt,
      lockedBy: !s && other ? other : null,
      wanted,
      counterFull: this.counter.full,
      batch: this.batch,
    };
  }

  private openPanel(st: Station) {
    if (this.openStation) this.picker.mark(`station:${this.openStation.id}`, null);
    this.openStation = st;
    const p = this.stationPick.get(st.id)!;
    this.picker.focus(p);
    this.picker.mark(p.key, 'selected');
    this.panel.open(this.panelView(st), this.localSession()?.station === st.id ? 'Welcome back! Keep cooking.' : '');
    this.hud.setPanelOpen(true);
    // first person: turn so the station sits above the panel
    this.director.lookAt(st.root.getWorldPosition(new THREE.Vector3()), -0.38);
  }

  closePanel() {
    if (this.openStation) this.picker.mark(`station:${this.openStation.id}`, null);
    this.openStation = null;
    this.picker.focus(null);
    this.panel.close();
    this.hud.setPanelOpen(false);
  }

  private refreshPanel() {
    if (this.openStation && this.panel.isOpen) this.panel.render(this.panelView(this.openStation));
  }

  // ------------------------------------------------- authoritative actions

  private apply(pid: string, name: Intent, a: Record<string, unknown>) {
    const p = this.players.get(pid);
    if (!p || !this.playing) return;
    switch (name) {
      case 'start':
        return this.applyStart(p, a.r as RecipeId, a.m as CookMode, Number(a.b) || 1);
      case 'act':
        return this.applyAct(p, String(a.a));
      case 'collect':
        return this.applyCollect(p);
      case 'discard':
        return this.applyDiscard(p);
      case 'pick': {
        const item = this.counter.list().find((i) => i.uid === Number(a.uid));
        if (item) this.pickUp(p, item);
        return;
      }
      case 'drop':
        return this.drop(p);
      case 'serve': {
        const c = this.customers.find((x) => x.id === Number(a.id));
        if (c) this.serve(p, c);
        return;
      }
      case 'door': {
        if (this.village) {
          const doorId = String(a.doorId);
          const open = this.village.toggleDoor(doorId);
          this.sfxAll('click');
          this.tellAll({ k: 'toast', text: open ? 'Door opened' : 'Door closed', kind: 'info' });
          this.snapDirty = true;
        }
        return;
      }
      case 'drink': {
        this.lifestyle.drinkWater();
        this.sfxAll('pour');
        this.tell(p.id, { k: 'toast', text: 'Drank fresh water (+Hydration, -Body Temp)', kind: 'good' });
        return;
      }
      case 'clean': {
        this.businessCycle.recordCleaning();
        this.tell(p.id, { k: 'toast', text: 'Cleaned shop counter & tables (+Cleanliness)', kind: 'good' });
        return;
      }
      case 'closeShop': {
        const res = this.businessCycle.startClosing();
        this.tellAll({ k: 'toast', text: res.message, kind: res.success ? 'gold' : 'bad' });
        this.snapDirty = true;
        return;
      }
      case 'lockShop': {
        const res = this.businessCycle.lockShop();
        this.tellAll({ k: 'toast', text: res.message, kind: res.success ? 'gold' : 'bad' });
        this.snapDirty = true;
        return;
      }
      case 'claimShop': {
        const busId = Number(a.businessId);
        const success = this.businessManager.claimBusiness(busId, p.id, p.name);
        if (success) {
          const bus = this.businessManager.get(busId)!;
          this.tellAll({ k: 'toast', text: `${p.name} leased ${bus.name}!`, kind: 'gold' });
          this.snapDirty = true;
        }
        return;
      }
      case 'setPrice': {
        const busId = Number(a.businessId);
        const r = a.recipe as RecipeId;
        const price = Number(a.price);
        this.businessManager.setPrice(busId, r, price);
        this.snapDirty = true;
        return;
      }
      case 'sleep': {
        const ledger = this.businessCycle.processSleepAndAdvanceDay(
          this.day,
          this.money,
          this.reputation,
          this.clock,
          this.lifestyle,
        );
        this.day = ledger.day + 1;
        this.money = ledger.closingBalance;
        this.today = { completed: 0, lost: 0, earnings: 0, spawned: 0, handled: 0, bonus: 0 };
        this.spawnTimer = 2;
        this.pushStats();
        this.hud.showDailyLedger(ledger, () => {
          this.tellAll({ k: 'toast', text: `Good morning! Day ${this.day} begins in Munnar.`, kind: 'gold' });
        });
        this.snapDirty = true;
        return;
      }
      case 'upgradeFurniture': {
        const uid = String(a.uid);
        this.upgradeFurniture(uid);
        return;
      }
      case 'toggleFurniturePlaced': {
        const uid = String(a.uid);
        this.toggleFurniturePlaced(uid);
        return;
      }
      case 'cleanTable': {
        const uid = String(a.uid);
        this.cleanTable(uid);
        return;
      }
      case 'signContract': {
        const contract = a.contract as ConstructionContractDef;
        this.signContract(contract);
        return;
      }
      case 'advanceStage': {
        this.advanceStage();
        return;
      }
      case 'recruitStaff': {
        const id = String(a.id);
        this.hireStaff(id);
        return;
      }
      case 'fireStaff': {
        const id = String(a.id);
        this.fireStaff(id);
        return;
      }
      case 'setStaffWage': {
        const id = String(a.id);
        const delta = Number(a.delta);
        this.adjustStaffWage(id, delta);
        return;
      }
    }
  }

  private applyStart(p: Player, id: RecipeId, mode: CookMode, batch: number) {
    if (p.session) return;
    const r = RECIPES[id];
    if (!r) return;
    for (const o of this.players.values()) {
      if (o !== p && o.session?.station === r.station) {
        this.tell(p.id, { k: 'panel', text: `${o.name} is cooking at this station. Try another one!`, tone: 'bad' });
        return;
      }
    }
    p.session = new CookingSession(r, mode === 'advanced' ? 'advanced' : 'simple', this.cookSpeed, [1, 3, 5].includes(batch) ? batch : 1);
    this.updateBusyStations();
    this.tell(p.id, { k: 'sfx', name: 'ignite' });
    this.tell(p.id, {
      k: 'panel',
      text: mode === 'simple' ? `Let's make ${r.name}! Prepare, then ${r.cookVerb.toLowerCase()}.` : `Let's make ${r.name}! Click the steps in order.`,
      tone: 'info',
    });
    this.snapDirty = true;
  }

  private applyAct(p: Player, action: string) {
    const s = p.session;
    if (!s) return;
    const res = s.act(action);
    const sfx: Sfx = !res.ok ? 'error' : s.timer ? (s.station === 'fryer' || s.station === 'tawa' ? 'sizzle' : 'boil') : action === 'pour' ? 'pour' : 'step';
    this.tell(p.id, { k: 'sfx', name: sfx });
    this.tell(p.id, { k: 'panel', text: res.message, tone: res.ok ? (s.done ? 'good' : 'info') : 'bad' });
    this.snapDirty = true;
  }

  private applyCollect(p: Player) {
    const s = p.session;
    if (!s || !s.done) return;
    if (this.counter.full) {
      this.tell(p.id, { k: 'panel', text: 'The counter is full! Serve someone first.', tone: 'bad' });
      return;
    }
    const item = this.counter.place(s.recipe.id, s.batch)!;
    this.picker.add({ kind: 'item', key: `item:${item.uid}`, root: item.model });
    this.tell(p.id, { k: 'sfx', name: s.recipe.station === 'chaya' ? 'pour' : 'clink' });
    p.session = null;
    this.updateBusyStations();
    // easy mode: it goes straight into the cook's hand
    if (!p.held) this.pickUp(p, item);
    const who = this.customers.find((c) => c.waiting && c.order === s.recipe.id);
    const name = `${s.recipe.name}${s.batch > 1 ? ` ×${s.batch}` : ''}`;
    if (p.held === item) {
      this.tell(p.id, { k: 'close' });
      this.tell(p.id, { k: 'toast', text: `${name} in hand! Now click ${who ? `the ${who.type.name}` : 'the customer'}.`, kind: 'good' });
      if (who) this.tell(p.id, { k: 'look', x: who.position.x, y: 1.6, z: who.position.z });
    } else this.tell(p.id, { k: 'panel', text: `${name} is on the counter.`, tone: 'good' });
    this.snapDirty = true;
  }

  private applyDiscard(p: Player) {
    if (!p.session) return;
    const name = p.session.recipe.name;
    p.session = null;
    this.updateBusyStations();
    this.tell(p.id, { k: 'panel', text: `${name} discarded. Start again?`, tone: 'info' });
    this.snapDirty = true;
  }

  private updateBusyStations() {
    const ids: StationId[] = [];
    if (this.isGuest) {
      if (this.guestSession) ids.push(this.guestSession.station);
      for (const p of this.remoteSnaps) if (p.s) ids.push(RECIPES[p.s.r].station);
    } else for (const p of this.players.values()) if (p.session) ids.push(p.session.station);
    this.shop.setStationsBusy(ids);
  }

  // ---------------------------------------------------------------- serving

  private pickUp(p: Player, item: CounterItem) {
    for (const o of this.players.values()) {
      if (o !== p && o.held === item) {
        this.tell(p.id, { k: 'toast', text: `${o.name} is holding that.`, kind: 'info' });
        return;
      }
    }
    if (p.held) this.drop(p);
    p.held = item;
    item.held = true;
    this.snapDirty = true;
  }

  private drop(p: Player) {
    if (!p.held) return;
    const item = p.held;
    p.held = null;
    item.held = [...this.players.values()].some((o) => o.held === item);
    this.snapDirty = true;
  }

  private serve(p: Player, c: Customer) {
    if (!this.playing || !c.waiting || c.resolved) return;

    if (c.famId) {
      const fam = this.activeFamilies.get(c.famId);
      if (fam) {
        this.serveFamily(p, c, fam);
        return;
      }
    }

    if (!p.held) {
      // easy mode: their dish is already waiting on the counter – hand it over
      const free = this.counter.list().filter((i) => i.recipe === c.order && ![...this.players.values()].some((o) => o.held === i));
      if (!free.length) {
        this.tell(p.id, { k: 'toast', text: `${c.type.name} wants ${RECIPES[c.order].name}. Cook it first!`, kind: 'info' });
        return;
      }
      this.pickUp(p, free[0]);
    }
    const item = p.held!;
    if (item.recipe === c.order) {
      // one portion leaves the batch and flies into the customer's hand
      p.held = null;
      item.held = false;
      const { portion, emptied } = this.counter.takeOne(item);
      this.picker.remove(`item:${item.uid}`);
      if (!emptied) {
        this.picker.add({ kind: 'item', key: `item:${item.uid}`, root: item.model });
        this.pickUp(p, item); // keep holding the rest of the batch
      }
      this.flights.push({ model: portion, from: portion.position.clone(), customer: c, t: 0 });
      c.resolved = true;
      c.carry = c.order;
      if (!c.paid) {
        c.paid = true;
        const bus = this.businessManager.get(c.businessId) ?? this.businessManager.get(0)!;
        const price = bus.menuPricing[c.order] ?? RECIPES[c.order].price;
        bus.money += price;
        this.businessCycle.recordSale(c.order, price);
        this.money += price;
        this.earnings += price;
        this.completed++;
        this.today.completed++;
        this.today.earnings += price;
        this.streak++;
        this.floatAll(c, `+${price}`, 'gold');
        this.sfxAll('clink');
        this.sfxAll('coin');
        this.sfxAll('success');
        if (this.multiplayer) this.tellAll({ k: 'toast', text: `${p.name} served ${RECIPES[c.order].name} at ${bus.name} (+₹${price})`, kind: 'good' });
        if (this.streak % STREAK_BONUS === 0 && this.reputation < MAX_REP) {
          this.reputation++;
          this.tellAll({ k: 'toast', text: `${STREAK_BONUS} happy customers in a row! Reputation +1 ♥`, kind: 'gold' });
        }
        const d1 = this.quests.processEvent({ kind: 'serve_recipe', recipe: c.order });
        const d2 = this.quests.processEvent({ kind: 'serve_customer', customerTypeId: c.type.id });
        const d3 = this.quests.processEvent({ kind: 'earn_money', money: price });
        const d4 = this.quests.processEvent({ kind: 'streak', streak: this.streak });
        this.notifyQuests([...d1, ...d2, ...d3, ...d4]);
      }
      c.react('happy');
      c.say(c.pickLine('happy'), 3);
      c.leave(true);
    } else {
      // wrong dish: the customer refuses and it stays in your hand
      c.wrongCount++;
      this.sfxAll('bad');
      if (c.wrongCount === 1) {
        c.react('angry');
        c.say(c.pickLine('wrong'), 3.5);
        this.tell(p.id, { k: 'toast', text: `Wrong order! ${c.type.name} wanted ${RECIPES[c.order].name}. One more chance.`, kind: 'bad' });
      } else {
        this.fail(c, 'Wrong order again!');
      }
    }
    this.snapDirty = true;
  }

  private serveFamily(p: Player, c: Customer, fam: ActiveFamilyGroup) {
    const unfulfilled = fam.order.items.filter((i) => i.delivered < i.quantity);
    if (!unfulfilled.length) return;

    if (!p.held) {
      // Pick up any ready dish for this family from the counter
      const neededRecipes = new Set(unfulfilled.map((i) => i.recipe));
      const free = this.counter.list().filter((i) => neededRecipes.has(i.recipe) && ![...this.players.values()].some((o) => o.held === i));
      if (!free.length) {
        const remainingNames = unfulfilled.map((i) => `${i.quantity - i.delivered}x ${RECIPES[i.recipe]?.name ?? i.recipe}`).join(', ');
        this.tell(p.id, { k: 'toast', text: `${fam.name} wants: ${remainingNames}. Cook first!`, kind: 'info' });
        return;
      }
      this.pickUp(p, free[0]);
    }

    const item = p.held!;
    const targetItem = fam.order.items.find((i) => i.recipe === item.recipe && i.delivered < i.quantity);
    if (targetItem) {
      // Hand over one portion
      p.held = null;
      item.held = false;
      const { portion, emptied } = this.counter.takeOne(item);
      this.picker.remove(`item:${item.uid}`);
      if (!emptied) {
        this.picker.add({ kind: 'item', key: `item:${item.uid}`, root: item.model });
        this.pickUp(p, item);
      }
      this.flights.push({ model: portion, from: portion.position.clone(), customer: c, t: 0 });
      targetItem.delivered++;
      c.carry = item.recipe;

      // Group patience boost for all members (+16s)
      for (const m of fam.members) {
        m.patience = Math.min(m.patienceMax, m.patience + 16);
      }

      this.sfxAll('clink');
      c.react('happy');
      const deliveredCount = fam.order.items.reduce((s, x) => s + x.delivered, 0);
      const totalCount = fam.order.items.reduce((s, x) => s + x.quantity, 0);
      const recipeName = RECIPES[item.recipe]?.name ?? item.recipe;
      c.say(`Delivered ${recipeName}! (${deliveredCount}/${totalCount})`, 2.5);
      this.floatAll(c, `✓ ${recipeName}`, 'gold');

      // Check if all items in the family multi-order are complete
      if (fam.order.items.every((i) => i.delivered >= i.quantity)) {
        fam.order.fullyDelivered = true;
        const baseTotal = fam.order.totalPrice;
        const tip = Math.round(baseTotal * (fam.tipMultiplier - 1.0));
        const grandTotal = baseTotal + tip;

        this.money += grandTotal;
        this.earnings += grandTotal;
        this.completed += fam.members.length;
        this.today.completed += fam.members.length;
        this.today.earnings += grandTotal;
        this.streak += fam.members.length;

        this.sfxAll('coin');
        this.sfxAll('success');
        this.floatAll(fam.leader, `+₹${grandTotal}`, 'gold');
        this.tellAll({
          k: 'toast',
          text: `✨ ${fam.name} order complete! Bill: ₹${baseTotal}${tip > 0 ? ` + ₹${tip} tip` : ''} (+₹${grandTotal})`,
          kind: 'gold',
        });

        if (fam.isSpecialEvent) {
          this.tellAll({
            k: 'toast',
            text: `🎉 ${fam.eventTitle} celebrated successfully!`,
            kind: 'gold',
          });
        }

        // Record visit and loyalty progression
        const visitRes = this.familyRegistry.recordVisit(fam.profileId, this.day, 1.0);
        if (visitRes.loyaltyChanged && visitRes.newTier) {
          this.tellAll({
            k: 'toast',
            text: `⭐ ${fam.name} reached ${visitRes.newTier.toUpperCase()} loyalty status!`,
            kind: 'gold',
          });
        }

        // Check family quest completion
        const prof = this.familyRegistry.getFamily(fam.profileId);
        if (prof && prof.quest && !prof.quest.completed) {
          if (prof.quest.id === 'quest_menon_3visits' && prof.visitCount >= 3) prof.quest.completed = true;
          else if (prof.quest.id === 'quest_sharma_bday' && fam.isSpecialEvent) prof.quest.completed = true;
          else if (prof.quest.id === 'quest_blr_vlog' && prof.visitCount >= 1) prof.quest.completed = true;
          else if (prof.quest.id === 'quest_koya_banquet' && totalCount >= 5) prof.quest.completed = true;

          if (prof.quest.completed) {
            this.tellAll({
              k: 'toast',
              text: `📜 Family Quest Complete: "${prof.quest.title}"! Open Management (B) to claim.`,
              kind: 'gold',
            });
            this.sfxAll('success');
          }
        }

        // Process standard quest triggers
        const completedQuests: QuestState[] = [];
        for (const it of fam.order.items) {
          for (let k = 0; k < it.quantity; k++) {
            completedQuests.push(...this.quests.processEvent({ kind: 'serve_recipe', recipe: it.recipe }));
          }
        }
        completedQuests.push(...this.quests.processEvent({ kind: 'earn_money', money: grandTotal }));
        completedQuests.push(...this.quests.processEvent({ kind: 'streak', streak: this.streak }));
        this.notifyQuests(completedQuests);

        // All family members celebrate, say their thank you line, and depart
        for (const m of fam.members) {
          m.resolved = true;
          m.paid = true;
          m.react('happy');
          m.say(fam.happyGreeting || m.pickLine('happy'), 4);
          m.leave(true);
        }
      }
    } else {
      // Wrong dish for this family
      c.wrongCount++;
      this.sfxAll('bad');
      const recipeName = RECIPES[item.recipe]?.name ?? item.recipe;
      if (c.wrongCount === 1) {
        c.react('angry');
        c.say(`${fam.name} did not order ${recipeName}!`, 3);
        this.tell(p.id, { k: 'toast', text: `Wrong dish! ${fam.name} doesn't need ${recipeName}.`, kind: 'bad' });
      } else {
        this.failFamily(fam, 'Wrong order again!');
      }
    }
    this.snapDirty = true;
  }

  private failFamily(fam: ActiveFamilyGroup, why: string) {
    this.reputation = Math.max(0, this.reputation - 1);
    this.streak = 0;
    this.lost += fam.members.length;
    this.today.lost += fam.members.length;
    for (const m of fam.members) {
      if (!m.resolved) {
        m.resolved = true;
        m.say(fam.angryGreeting || m.pickLine('angry'), 3.5);
        m.leave(false);
      }
    }
    this.floatAll(fam.leader, '−1 ♥', 'bad');
    this.sfxAll('bad');
    this.tellAll({ k: 'toast', text: `${why} ${fam.name} left unhappy. −1 ♥`, kind: 'bad' });
    this.snapDirty = true;
    if (this.reputation <= 0) this.gameOver();
  }

  private fail(c: Customer, why: string) {
    if (c.resolved) return;
    if (c.famId) {
      const fam = this.activeFamilies.get(c.famId);
      if (fam) {
        this.failFamily(fam, why);
        return;
      }
    }
    c.resolved = true;
    this.reputation = Math.max(0, this.reputation - 1);
    this.streak = 0;
    this.lost++;
    this.today.lost++;
    c.say(c.pickLine('angry'), 3);
    c.leave(false);
    this.floatAll(c, '−1 ♥', 'bad');
    this.sfxAll('bad');
    this.tellAll({ k: 'toast', text: `${why} ${c.type.name} left unhappy. −1 ♥`, kind: 'bad' });
    this.snapDirty = true;
    if (this.reputation <= 0) this.gameOver();
  }

  private floatAll(c: Customer, text: string, kind: 'gold' | 'bad') {
    this.tellAll({ k: 'float', text, kind, x: c.position.x, y: 2.0, z: c.position.z });
  }

  notifyQuests(completed: QuestState[]) {
    for (const q of completed) {
      this.tellAll({ k: 'toast', text: `🏆 Quest Complete: ${q.title}! Press Q to claim reward.`, kind: 'gold' });
      this.sfxAll('success');
    }
  }

  claimQuest(id: string) {
    const reward = this.quests.claim(id);
    if (!reward) return;
    this.money += reward.money;
    this.earnings += reward.money;
    if (this.reputation < MAX_REP) {
      this.reputation = Math.min(MAX_REP, this.reputation + reward.reputation);
    }
    this.sfxAll('coin');
    this.tellAll({ k: 'toast', text: `Claimed ₹${reward.money} & +${reward.reputation} ♥!`, kind: 'gold' });
    this.pushStats();
    this.snapDirty = true;
  }

  toggleQuests() {
    this.hud.toggleQuests(this.quests.exportState(), (id) => this.claimQuest(id));
  }

  toggleManagement() {
    this.hud.toggleManagement(
      this.hotel,
      this.staff,
      this.familyRegistry,
      this.furnitureManager,
      this.construction,
      this.progression,
      this.money,
      this.reputation,
      (num: number) => this.cleanRoom(num),
      (id: string) => this.hireStaff(id),
      (id: string) => this.fireStaff(id),
      (id: string) => this.toggleStaffDuty(id),
      (id: string, delta: number) => this.adjustStaffWage(id, delta),
      (uid: string) => this.upgradeFurniture(uid),
      (uid: string) => this.cleanTable(uid),
      (uid: string) => this.toggleFurniturePlaced(uid),
      (contract: ConstructionContractDef) => this.signContract(contract),
      () => this.advanceStage(),
      (famId: string) => this.claimFamilyQuest(famId),
    );
  }

  upgradeFurniture(uid: string) {
    if (this.isGuest) {
      this.intent('upgradeFurniture', { uid });
      return;
    }
    const item = this.furnitureManager.get(uid);
    if (!item) return;
    const nextTier = item.getNextTierDef();
    if (!nextTier) {
      this.tellAll({ k: 'toast', text: `${item.def.name} is already at maximum level!`, kind: 'info' });
      return;
    }
    if (this.money < nextTier.cost) {
      this.tellAll({ k: 'toast', text: `Need ₹${nextTier.cost} to upgrade ${item.def.name}.`, kind: 'bad' });
      return;
    }
    if (this.progression.currentStage < nextTier.stageRequired) {
      this.tellAll({
        k: 'toast',
        text: `Requires Business Stage ${nextTier.stageRequired} (Current: Stage ${this.progression.currentStage}).`,
        kind: 'bad',
      });
      return;
    }
    if (this.reputation < nextTier.reputationRequired) {
      this.tellAll({ k: 'toast', text: `Requires ${nextTier.reputationRequired}♥ reputation.`, kind: 'bad' });
      return;
    }

    if (nextTier.buildTimeSeconds > 0) {
      // Must be constructed by Kuttan Ashari!
      const contract: ConstructionContractDef = {
        contractId: `contract_${item.uid}_${nextTier.level}`,
        contractorName: 'Kuttan Ashari',
        malayalam: 'കുട്ടൻ ആശാരി',
        targetType: 'furniture',
        targetId: item.uid,
        targetName: `${item.def.name} (Lvl ${nextTier.level})`,
        targetLevel: nextTier.level,
        cost: nextTier.cost,
        durationSeconds: nextTier.buildTimeSeconds,
        sitePosition: [item.position.x, item.position.y, item.position.z],
        description: `Install ${nextTier.name}.`,
      };
      this.signContract(contract);
    } else {
      this.money -= nextTier.cost;
      item.upgrade();
      this.sfxAll('upgrade');
      this.sfxAll('success');
      this.tellAll({
        k: 'toast',
        text: `Upgraded ${item.def.name} to Level ${item.level}: ${nextTier.name}!`,
        kind: 'gold',
      });
      this.progression.completePrerequisite(`upgrade_${item.def.id}_lvl_${item.level}`);
      this.pushStats();
      this.snapDirty = true;
    }
  }

  cleanTable(uid: string) {
    if (this.isGuest) {
      this.intent('cleanTable', { uid });
      return;
    }
    if (this.furnitureManager.cleanTable(uid)) {
      this.businessCycle.recordCleaning();
      this.sfxAll('success');
      this.tellAll({ k: 'toast', text: 'Table wiped spotless and clean! ✨ (+Cleanliness)', kind: 'good' });
      this.pushStats();
      this.snapDirty = true;
    }
  }

  toggleFurniturePlaced(uid: string) {
    if (this.isGuest) {
      this.intent('toggleFurniturePlaced', { uid });
      return;
    }
    const item = this.furnitureManager.get(uid);
    if (!item) return;
    const newPlaced = !item.isPlaced;
    item.setPlaced(newPlaced);
    this.sfxAll('click');
    this.tellAll({
      k: 'toast',
      text: newPlaced ? `Installed ${item.def.name} in shop floor.` : `Stored ${item.def.name} in inventory.`,
      kind: 'info',
    });
    this.snapDirty = true;
  }

  signContract(contract: ConstructionContractDef) {
    if (this.isGuest) {
      this.intent('signContract', { contract });
      return;
    }
    const res = this.construction.startContract(contract, this.money);
    if (res.success) {
      this.money -= contract.cost;
      this.sfxAll('coin');
      this.sfxAll('clink');
      this.tellAll({ k: 'toast', text: res.message, kind: 'gold' });
      this.pushStats();
      this.snapDirty = true;
    } else {
      this.tellAll({ k: 'toast', text: res.message, kind: 'bad' });
    }
  }

  advanceStage() {
    if (this.isGuest) {
      this.intent('advanceStage', {});
      return;
    }
    const res = this.progression.advanceToNextStage(this.money, this.reputation);
    if (res.success && res.newStage) {
      this.sfxAll('bell');
      this.sfxAll('success');
      this.tellAll({
        k: 'toast',
        text: `🎉 BUSINESS PROMOTED! Welcome to Stage ${res.newStage.stage}: ${res.newStage.name} (${res.newStage.malayalam})!`,
        kind: 'gold',
      });
      this.pushStats();
      this.snapDirty = true;
    } else {
      this.tellAll({ k: 'toast', text: res.reason ?? 'Cannot advance stage.', kind: 'bad' });
    }
  }

  private syncStaffPuppets() {
    // Add puppets for hired staff
    for (const emp of this.staff.hired) {
      if (!this.staffPuppets.has(emp.id)) {
        let idlePos: THREE.Vector3;
        if (emp.role === 'waiter') idlePos = new THREE.Vector3(-1.0, 0.35, 0.8);
        else if (emp.role === 'cleaner') idlePos = new THREE.Vector3(2.8, 0.35, 0.4);
        else idlePos = new THREE.Vector3(-2.4, 0.35, -0.4); // cook

        const puppet = new StaffPuppet(emp, this.scene, idlePos, {
          onServeCustomer: (slot, dish) => this.serveCustomerFromStaff(slot, dish),
          onTableCleaned: (tableUid) => this.cleanTableFromStaff(tableUid),
          onKitchenAssisted: () => {
            // Speed up active cooking sessions
            for (const p of this.players.values()) {
              if (p.session?.timer) {
                p.session.timer.elapsed += 1.2;
              }
            }
          },
          onXpGain: (empId, xp) => {
            this.staff.addXP(empId, xp);
          },
          onLevelUp: (empId, newLevel) => {
            const e = this.staff.getEmployee(empId);
            this.tellAll({
              k: 'toast',
              text: `⭐ ${e?.name ?? 'Employee'} leveled up to Level ${newLevel}! Work speed increased.`,
              kind: 'gold',
            });
            this.pushStats();
          },
          onFloatText: (text, pos, kind) => {
            this.floatAllAt(pos, text, kind);
          },
          onSfx: (name) => this.sfxAll(name as Sfx),
        });
        this.staffPuppets.set(emp.id, puppet);
      }
    }

    // Remove puppets for fired staff
    for (const [id, puppet] of this.staffPuppets.entries()) {
      if (!this.staff.isHired(id)) {
        puppet.destroy(this.scene);
        this.staffPuppets.delete(id);
      }
    }
  }

  private tickAutonomousStaff(_dt?: number) {
    // 1. Waiter autonomous dispatch
    const idleWaiter = Array.from(this.staffPuppets.values()).find(
      (p) => p.role === 'waiter' && p.state === 'idle' && p.employee.isWorking,
    );
    if (idleWaiter) {
      const readyDishes = this.counter.list();
      if (readyDishes.length > 0) {
        // Find customer waiting for one of these dishes
        const waitingCustomer = this.customers.find(
          (c) => c.waiting && !c.resolved && readyDishes.some((d) => d.recipe === c.order),
        );
        if (waitingCustomer) {
          const matchDish = waitingCustomer.order;
          idleWaiter.assignWaiterDelivery(SERVE_SLOTS[0], waitingCustomer.slotPos, waitingCustomer.slot, matchDish);
        }
      }
    }

    // 2. Cleaner autonomous dispatch
    const idleCleaner = Array.from(this.staffPuppets.values()).find(
      (p) => p.role === 'cleaner' && p.state === 'idle' && p.employee.isWorking,
    );
    if (idleCleaner) {
      const dirtyTables = this.furnitureManager.getDirtyTables();
      if (dirtyTables.length > 0) {
        const table = dirtyTables[0];
        idleCleaner.assignCleanTable(table.position, table.uid);
      }
    }
  }

  private tickTableDirtying(dt: number) {
    this.dirtyTableTimer -= dt;
    if (this.dirtyTableTimer <= 0) {
      this.dirtyTableTimer = 25 + Math.random() * 20; // every 25-45s
      const table = this.furnitureManager.dirtyRandomTable();
      if (table) {
        this.snapDirty = true;
      }
    }
  }

  private serveCustomerFromStaff(slot: number, dish: RecipeId) {
    const c = this.customers.find((x) => x.slot === slot && x.waiting && !x.resolved);
    if (!c) return;

    const free = this.counter.list().filter((i) => i.recipe === dish);
    if (free.length > 0) {
      const { portion, emptied } = this.counter.takeOne(free[0]);
      this.picker.remove(`item:${free[0].uid}`);
      if (!emptied) {
        this.picker.add({ kind: 'item', key: `item:${free[0].uid}`, root: free[0].model });
      }
      this.flights.push({ model: portion, from: portion.position.clone(), customer: c, t: 0 });
    }

    c.resolved = true;
    c.carry = dish;
    if (!c.paid) {
      c.paid = true;
      const price = RECIPES[dish].price;
      this.money += price;
      this.earnings += price;
      this.completed++;
      this.today.completed++;
      this.today.earnings += price;
      this.streak++;
      this.floatAll(c, `+${price}`, 'gold');
      this.sfxAll('coin');
      this.sfxAll('success');
      this.tellAll({ k: 'toast', text: `Suku served ${RECIPES[dish].name} (+₹${price})!`, kind: 'good' });
      this.quests.processEvent({ kind: 'serve_recipe', recipe: dish });
      this.pushStats();
    }
    c.react('happy');
    this.snapDirty = true;
  }

  private cleanTableFromStaff(tableUid: string) {
    if (this.furnitureManager.cleanTable(tableUid)) {
      this.businessCycle.recordCleaning();
      this.tellAll({ k: 'toast', text: 'Appu cleaned the dining table! ✨ (+Cleanliness)', kind: 'good' });
      this.pushStats();
      this.snapDirty = true;
    }
  }

  private floatAllAt(pos: THREE.Vector3, text: string, kind: 'gold' | 'bad') {
    this.events.onEvent(text, 1.0);
    this.tellAll({ k: 'float', text, kind, x: pos.x, y: pos.y + 1.2, z: pos.z });
  }

  claimFamilyQuest(famId: string) {
    const reward = this.familyRegistry.claimQuest(famId);
    if (!reward) return;
    this.money += reward.money;
    this.reputation = Math.min(MAX_REP, this.reputation + reward.reputation);
    this.sfxAll('success');
    this.tellAll({ k: 'toast', text: `Claimed Family Quest reward: ₹${reward.money} & +${reward.reputation} ♥!`, kind: 'gold' });
    this.pushStats();
    this.snapDirty = true;
  }

  cleanRoom(roomNumber: number) {
    if (this.hotel.cleanRoom(roomNumber)) {
      this.sfxAll('success');
      this.tellAll({ k: 'toast', text: `Room ${roomNumber} cleaned sparkling clean! ✨`, kind: 'good' });
    }
  }

  hireStaff(id: string) {
    const res = this.staff.hire(id, this.money);
    if (res.success && res.employee) {
      this.money -= res.employee.dailyWage;
      this.sfxAll('coin');
      this.tellAll({ k: 'toast', text: res.message, kind: 'gold' });
      this.pushStats();
    } else {
      this.tellAll({ k: 'toast', text: res.message, kind: 'bad' });
    }
  }

  fireStaff(id: string) {
    if (this.staff.fire(id)) {
      this.tellAll({ k: 'toast', text: 'Employee departed.', kind: 'info' });
    }
  }

  toggleStaffDuty(id: string) {
    const active = this.staff.toggleDuty(id);
    this.tellAll({ k: 'toast', text: active ? 'Staff on duty.' : 'Staff on break.', kind: 'info' });
  }

  adjustStaffWage(id: string, delta: number) {
    const emp = this.staff.hired.find((e) => e.id === id);
    if (emp) {
      this.staff.setWage(id, emp.dailyWage + delta);
    }
  }

  // --------------------------------------------------------------- spawning

  private freeSlot(): number {
    const taken = new Set(this.customers.filter((c) => c.state === 'arriving' || c.state === 'waiting').map((c) => c.slot));
    const free = QUEUE_SLOTS.slice(0, this.queueSize)
      .map((_, i) => i)
      .filter((i) => !taken.has(i));
    return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
  }

  private pickType(): CustomerType {
    const total = CUSTOMER_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of CUSTOMER_TYPES) if ((r -= t.weight) <= 0) return t;
    return CUSTOMER_TYPES[0];
  }

  /**
   * The bus stopped next door: up to `count` passengers come over as
   * customers (if the day still needs them). Returns how many came.
   */
  busArrived(door: THREE.Vector3, count: number): number {
    if (!this.playing || this.isGuest) return 0;
    let n = 0;
    for (let i = 0; i < count && this.today.spawned < this.quota; i++) {
      const c = this.spawn(undefined, door.clone().add(new THREE.Vector3((i - 1) * 0.45, 0, 0)));
      if (!c) break;
      n++;
    }
    if (n) this.tellAll({ k: 'toast', text: n > 1 ? `${n} new customers off the bus!` : 'A customer hops off the bus!', kind: 'info' });
    return n;
  }

  spawn(type?: CustomerType, start?: THREE.Vector3): Customer | null {
    if (this.isGuest || this.businessCycle.phase !== 'open') return null;
    const slot = this.freeSlot();
    if (slot < 0) return null;
    const t = type ?? this.pickType();
    const order = t.favourites[Math.floor(Math.random() * t.favourites.length)];
    const spawnPt = start ?? new THREE.Vector3((Math.random() > 0.5 ? 1 : -1) * 18, 0, 4);

    const queueCounts = new Map<number, number>();
    for (const c of this.customers) {
      queueCounts.set(c.businessId, (queueCounts.get(c.businessId) ?? 0) + 1);
    }
    const businessCenters = new Map<number, THREE.Vector3>();
    if (this.village) {
      for (const loc of this.village.businessLocations) {
        businessCenters.set(loc.id, loc.center);
      }
    }

    const targetBusId = SharedCustomerAI.selectBestBusiness({
      customerType: t,
      desiredRecipe: order,
      spawnPoint: spawnPt,
      businessManager: this.businessManager,
      queueCounts,
      businessCenters,
    });

    let targetPos = QUEUE_SLOTS[slot];
    if (this.village) {
      const loc = this.village.businessLocations.find((l) => l.id === targetBusId);
      if (loc && loc.queueSlots.length > 0) {
        targetPos = loc.queueSlots[slot % loc.queueSlots.length];
      }
    }

    const side = targetPos.x + (Math.random() - 0.5) * 3 < 0 ? -1 : 1;
    const mul = EASY.patienceMul + this.patienceBonus / t.patience;
    const c = new Customer(t, order, slot, targetPos, mul, side, start, targetBusId);
    this.scene.add(c.model.root);
    this.customers.push(c);
    this.picker.add({ kind: 'customer', key: `cust:${c.id}`, root: c.model.root });
    this.today.spawned++;
    this.pushStats();
    return c;
  }

  spawnFamily(profile?: FamilyProfile, start?: THREE.Vector3): Customer | null {
    if (this.isGuest || this.businessCycle.phase !== 'open') return null;
    const slot = this.freeSlot();
    if (slot < 0) return null;

    let targetProfile = profile;
    if (!targetProfile) {
      const candidates = this.familyRegistry.pickCandidatesForDay(this.day);
      if (!candidates.length) return null;
      const activeProfileIds = new Set(Array.from(this.activeFamilies.values()).map((f) => f.profileId));
      const available = candidates.filter((f) => !activeProfileIds.has(f.id));
      if (!available.length) return null;
      targetProfile = available[0];
    }

    const spawnPt = start ?? new THREE.Vector3((Math.random() > 0.5 ? 1 : -1) * 18, 0, 4);
    let targetPos = QUEUE_SLOTS[slot];
    if (this.village) {
      const loc = this.village.businessLocations.find((l) => l.id === 0);
      if (loc && loc.queueSlots.length > 0) {
        targetPos = loc.queueSlots[slot % loc.queueSlots.length];
      }
    }

    const mul = EASY.patienceMul + this.patienceBonus / 40;
    const side = targetPos.x < 0 ? -1 : 1;
    const famGroup = createActiveFamily(targetProfile, slot, targetPos, mul, side, spawnPt);
    this.activeFamilies.set(famGroup.id, famGroup);

    for (const m of famGroup.members) {
      this.scene.add(m.model.root);
      this.customers.push(m);
      this.picker.add({ kind: 'customer', key: `cust:${m.id}`, root: m.model.root });
    }

    this.today.spawned += famGroup.members.length;
    this.pushStats();

    const orderSummary = famGroup.order.items.map((i) => `${i.quantity}x ${RECIPES[i.recipe]?.name ?? i.recipe}`).join(', ');
    const eventBadge = famGroup.isSpecialEvent ? ` [${famGroup.eventTitle}]` : '';
    this.tellAll({
      k: 'toast',
      text: `👨‍👩‍👧‍👦 ${famGroup.name} (${famGroup.origin})${eventBadge} arrived! Order: ${orderSummary}`,
      kind: 'gold',
    });

    return famGroup.leader;
  }

  // ------------------------------------------------------------ host + events

  /** Host: bring a specific customer now (adds to today's count). */
  hostSpawn(typeId: string): boolean {
    if (this.phase !== 'playing' || this.isGuest) return false;
    const t = CUSTOMER_TYPES.find((x) => x.id === typeId);
    if (!t) return false;
    if (this.freeSlot() < 0) {
      this.hud.toast('The queue is full! Serve someone first.', 'info');
      return false;
    }
    this.today.bonus++;
    this.spawn(t);
    this.tellAll({ k: 'toast', text: `${t.name} is coming!`, kind: 'info' });
    return true;
  }

  /** Host: bring a family now (for debugging or VIP visit). */
  hostSpawnFamily(profileId?: string): boolean {
    if (this.phase !== 'playing' || this.isGuest) return false;
    let prof: FamilyProfile | undefined;
    if (profileId) {
      prof = this.familyRegistry.getFamily(profileId);
    } else {
      const candidates = this.familyRegistry.pickCandidatesForDay(this.day);
      prof = candidates[0];
    }
    if (!prof) return false;
    if (this.freeSlot() < 0) {
      this.hud.toast('The queue is full! Serve someone first.', 'info');
      return false;
    }
    this.today.bonus += 3;
    const res = this.spawnFamily(prof);
    return !!res;
  }

  startRush() {
    if (this.phase !== 'playing' || this.rush || this.isGuest) return;
    this.rush = { t: RUSH_SECONDS };
    this.today.bonus += RUSH_BONUS;
    this.spawnTimer = Math.min(this.spawnTimer, 1);
    this.sfxAll('rush');
    this.tellAll({ k: 'toast', text: `${RUSH_TEXT} Customer Rush!`, kind: 'gold' });
    this.pushStats();
  }

  setHeavyRain(on: boolean) {
    if (this.isGuest) return;
    this.heavyRain = on;
    this.tellAll({ k: 'toast', text: on ? 'Heavy rain! Customers will come a little slower.' : 'The rain is easing off.', kind: 'info' });
    this.snapDirty = true;
  }

  funnyLine() {
    if (this.phase !== 'playing' || this.isGuest) return;
    const line = FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)];
    const waiting = this.customers.filter((c) => c.waiting);
    if (waiting.length) waiting[Math.floor(Math.random() * waiting.length)].say(line, 5);
    else this.tellAll({ k: 'toast', text: `Chandrappan: "Chandrappeettaa, business polikkunnu!"`, kind: 'gold' });
  }

  giveMoney(n: number) {
    if (this.isGuest) return;
    this.money += n;
    this.sfxAll('coin');
    this.tellAll({ k: 'toast', text: `Host gift: +₹${n}`, kind: 'gold' });
    this.pushStats();
    if (this.phase === 'dayEnd') this.events.onDayEnd(this.resultsView());
  }

  /** Host: replay the current day from its start (money, hearts, customers). */
  resetDay() {
    if (this.phase !== 'playing' || !this.dayStart || this.isGuest) return;
    const snap = this.dayStart;
    this.clearDayObjects();
    Object.assign(this, {
      money: snap.money,
      reputation: snap.reputation,
      streak: snap.streak,
      completed: snap.completed,
      lost: snap.lost,
      earnings: snap.earnings,
    });
    this.clock.reset(snap.day, snap.minute);
    this.today = { completed: 0, lost: 0, earnings: 0, spawned: 0, handled: 0, bonus: 0 };
    this.rush = null;
    this.planRush();
    this.spawnTimer = 2;
    this.tellAll({ k: 'toast', text: `Day ${this.day} restarted.`, kind: 'info' });
    this.pushStats();
  }

  private planRush() {
    // from day 2, one surprise rush partway through the day (60% chance)
    this.rushPlannedAt = this.day >= 2 && Math.random() < 0.6 ? Math.floor(this.quota * (0.3 + Math.random() * 0.3)) : -1;
  }

  private snapshotDay() {
    this.dayStart = {
      version: 4,
      day: this.day,
      minute: this.clock.minute,
      money: this.money,
      reputation: this.reputation,
      streak: this.streak,
      completed: this.completed,
      lost: this.lost,
      earnings: this.earnings,
      owned: [...this.owned],
      lifestyle: this.lifestyle.serialize(),
      businesses: this.businessManager.serialize(),
      quests: this.quests.exportState(),
      hotel: this.hotel.exportState(),
      employees: this.staff.exportState(),
      families: this.familyRegistry.exportState(),
      furniture: this.furnitureManager.exportState(),
      progression: this.progression.exportState(),
      construction: this.construction.exportState(),
    };
    if (!this.multiplayer) saveRun(this.dayStart);
  }

  // ------------------------------------------------------------------- days

  /** Open the shop: from the menu (fresh run) or for the next day. */
  startRun(shopName: string, mode: CookMode) {
    this.restartState();
    this.shopName = shopName;
    this.mode = mode;
    this.phase = 'playing';
    this.picker.enabled = true;
    this.planRush();
    this.snapshotDay();
    this.pushStats();
    this.tellAll({ k: 'toast', text: `Day 1 — ${dayQuota(1)} customers today. Kada thurannu!`, kind: 'gold' });
  }

  /** Continue a saved run at the start of its day. */
  continueRun(save: RunSave, shopName: string, mode: CookMode) {
    this.restartState();
    this.shopName = shopName;
    this.mode = mode;
    Object.assign(this, {
      day: save.day,
      money: save.money,
      reputation: save.reputation,
      streak: save.streak,
      completed: save.completed,
      lost: save.lost,
      earnings: save.earnings,
    });
    this.clock.reset(save.day, save.minute);
    if (save.lifestyle) this.lifestyle.deserialize(save.lifestyle);
    if (save.businesses) this.businessManager.applySnapshot(save.businesses);
    if (save.quests) this.quests.quests = save.quests;
    if (save.hotel) this.hotel.importState(save.hotel);
    if (save.employees) this.staff.importState(save.employees);
    if (save.families) this.familyRegistry.importState(save.families);
    if (save.furniture) this.furnitureManager.importState(save.furniture);
    if (save.progression) this.progression.importState(save.progression);
    if (save.construction) this.construction.importState(save.construction);
    for (const id of save.owned as UpgradeId[]) {
      if (!UPGRADES.some((u) => u.id === id)) continue;
      this.owned.add(id);
      this.shop.addUpgrade(id, false);
      if (id === 'roof') this.rain.shelter.z1 = 4.25;
      if (id === 'hotel_wing' && this.hotel.rooms.length === 0) {
        this.hotel.unlockRooms('budget_nonac', 4);
      }
      if (id === 'hotel_balcony' && !this.hotel.rooms.some((r) => r.tier === 'deluxe_fan')) {
        this.hotel.unlockRooms('deluxe_fan', 4);
      }
    }
    this.phase = 'playing';
    this.picker.enabled = true;
    this.planRush();
    this.snapshotDay();
    this.pushStats();
    this.tellAll({ k: 'toast', text: `Welcome back! Day ${this.day} — ${this.quota} customers today.`, kind: 'gold' });
  }

  nextDay() {
    if (this.phase !== 'dayEnd' || this.isGuest) return;
    this.day++;
    this.clock.reset(this.day, 7 * 60 + 30);
    this.today = { completed: 0, lost: 0, earnings: 0, spawned: 0, handled: 0, bonus: 0 };
    this.spawnTimer = 2;
    this.phase = 'playing';
    this.picker.enabled = true;
    this.planRush();
    this.snapshotDay();
    this.pushStats();
    this.tellAll({ k: 'toast', text: `Day ${this.day} — ${dayQuota(this.day)} customers today!`, kind: 'gold' });
  }

  buy(id: UpgradeId): boolean {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || this.owned.has(id) || this.money < u.cost || this.phase !== 'dayEnd' || this.isGuest) return false;
    this.money -= u.cost;
    this.owned.add(id);
    this.level = 1 + this.owned.size;
    this.shop.addUpgrade(id, true);
    this.sfxAll('upgrade');
    if (id === 'roof') this.rain.shelter.z1 = 4.25;
    if (id === 'hotel_wing') {
      this.hotel.unlockRooms('budget_nonac', 4);
      this.tellAll({ k: 'toast', text: '🏨 Munnar Lodge Floor opened! 4 Budget Rooms available upstairs.', kind: 'gold' });
    }
    if (id === 'hotel_balcony') {
      this.hotel.unlockRooms('deluxe_fan', 4);
      this.tellAll({ k: 'toast', text: '🌄 Valley Balcony & 4 Deluxe Rooms opened!', kind: 'gold' });
    }
    this.tellAll({ k: 'toast', text: `${u.name} bought! Shop level ${this.level}.`, kind: 'gold' });
    this.pushStats();
    return true;
  }

  private endDay() {
    this.phase = 'dayEnd';
    this.rush = null;
    this.events.onEvent(null, 0);
    this.closePanel();
    for (const p of this.players.values()) {
      p.held = null;
      p.session = null;
    }
    this.clearCounter();
    this.updateBusyStations();
    this.picker.enabled = false;
    this.hud.setTooltip(null);

    const { totalRoomRentEarned, checkouts } = this.hotel.processNightTick();
    const payroll = this.staff.calculateDailyPayroll();
    if (totalRoomRentEarned > 0) {
      this.money += totalRoomRentEarned;
      this.earnings += totalRoomRentEarned;
      this.today.earnings += totalRoomRentEarned;
      this.tellAll({ k: 'toast', text: `🏨 Hotel Accommodation Revenue: +₹${totalRoomRentEarned}`, kind: 'gold' });
    }
    if (payroll > 0) {
      this.money = Math.max(0, this.money - payroll);
      this.tellAll({ k: 'toast', text: `👨‍🍳 Staff Payroll: -₹${payroll}`, kind: 'info' });
    }
    for (const g of checkouts) {
      this.tellAll({ k: 'toast', text: `🏨 ${g.name} completed stay and checked out!`, kind: 'info' });
    }

    this.events.onDayEnd(this.resultsView());
  }

  resultsView(): ResultsView {
    return {
      day: this.day,
      completed: this.today.completed,
      lost: this.today.lost,
      earnings: this.today.earnings,
      reputation: this.reputation,
      maxReputation: MAX_REP,
      money: this.money,
      nextQuota: dayQuota(this.day + 1),
      owned: new Set(this.owned),
      canAct: !this.isGuest,
      hotelIncome: this.hotel.dailyHotelRevenue,
      payroll: this.staff.calculateDailyPayroll(),
    };
  }

  // ------------------------------------------------------------------- loop

  update(dt: number, t: number) {
    this.counter.update(dt, t);
    if (this.isGuest) this.updateGuest(dt, t);
    else this.updateAuthority(dt, t);
    this.syncLocalMarks();
    if (this.panel.isOpen) this.panel.tick();
    this.updateHud();
  }

  private updateAuthority(dt: number, t: number) {
    if (this.village) this.village.update(dt);
    const me = this.me;
    this.lifestyle.update(dt, {
      isSitting: me.anim === 'sit',
      isMoving: me.anim === 'walk' || me.anim === 'run',
      isRunning: me.anim === 'run',
      isCooking: me.session !== null,
      isIndoors: me.pos.z < 2.0,
      isNearHearth: Math.hypot(me.pos.x - (-2.8), me.pos.z - (-0.7)) < 2.2,
      isRaining: this.heavyRain,
      minuteOfDay: this.clock.minute,
    });
    this.hud.setLifestyle(this.lifestyle.serialize());

    // customers face the nearest cook (or the first-person camera in solo)
    for (const c of this.customers) {
      if (!this.multiplayer) c.faceTarget = this.director.firstPerson ? this.director.eye : null;
      else {
        let best: THREE.Vector3 | null = null;
        let bd = Infinity;
        for (const p of this.players.values()) {
          const d = p.pos.distanceToSquared(c.position);
          if (d < bd) (bd = d), (best = p.pos);
        }
        c.faceTarget = best;
      }
    }

    if (this.playing) {
      this.clock.update(dt);
      const newGuest = this.hotel.update(dt);
      if (newGuest) {
        this.tellAll({ k: 'toast', text: `🏨 ${newGuest.name} checked into Munnar Lodge!`, kind: 'gold' });
      }
      this.staff.update(dt, this.hotel);

      // Construction contractor update
      const { completedContract } = this.construction.update(dt, (sfx) => this.sfxAll(sfx));
      if (completedContract) {
        if (completedContract.targetType === 'furniture') {
          const furn = this.furnitureManager.get(completedContract.targetId);
          if (furn) {
            furn.upgrade();
            this.tellAll({
              k: 'toast',
              text: `🔨 Kuttan Ashari finished installing ${furn.def.name} (Level ${furn.level})!`,
              kind: 'gold',
            });
            this.sfxAll('upgrade');
            this.sfxAll('success');
            this.progression.completePrerequisite(`upgrade_${furn.def.id}_lvl_${furn.level}`);
          }
        }
        this.pushStats();
        this.snapDirty = true;
      }

      // Physical staff synchronization and autonomous tasks
      this.syncStaffPuppets();
      const isKitchenCooking = this.panel.isOpen || [...this.players.values()].some((p) => p.session !== null);
      for (const puppet of this.staffPuppets.values()) {
        puppet.update(dt, isKitchenCooking);
      }
      this.tickAutonomousStaff(dt);
      this.tickTableDirtying(dt);
      for (const p of this.players.values()) {
        if (p.session?.update(dt)) {
          const s = p.session;
          this.tell(p.id, { k: 'panel', text: s.done ? `${s.recipe.name} is ready! Collect it.` : 'Done! Next step…', tone: s.done ? 'good' : 'info' });
          if (p.id === this.localId) this.refreshPanel();
          this.snapDirty = true;
        }
      }

      if (this.rushPlannedAt >= 0 && this.today.spawned >= this.rushPlannedAt) {
        this.rushPlannedAt = -1;
        this.startRush();
      }
      if (this.rush) {
        this.rush.t -= dt;
        this.events.onEvent(RUSH_TEXT, Math.max(0, this.rush.t / RUSH_SECONDS));
        if (this.rush.t <= 0) {
          this.rush = null;
          this.events.onEvent(null, 0);
        }
      }
      if (this.today.spawned < this.quota) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          let c: Customer | null = null;
          if (this.activeFamilies.size < 2 && Math.random() < 0.28) {
            c = this.spawnFamily();
          }
          if (!c) {
            c = this.spawn();
          }
          let gap = Math.max(EASY.spawnFloor, EASY.spawnMin - this.day * 0.5) + Math.random() * EASY.spawnRange;
          gap *= MULTI_SPAWN[Math.min(4, this.players.size)];
          if (this.rush) gap = 2.5 + Math.random() * 1.5;
          else if (this.heavyRain) gap *= 1.4;
          this.spawnTimer = c ? gap : 2;
        }
      }
      for (const c of this.customers) {
        if (c.waiting && !this.announced.has(c.id)) {
          this.announced.add(c.id);
          this.sfxAll('bell');
        }
      }

      for (const fam of this.activeFamilies.values()) {
        tickFamilyChatter(fam, dt);
      }

      for (const c of this.customers) {
        if (c.waiting && !c.resolved) {
          c.patience -= dt;
          if (c.patience <= 0) this.fail(c, 'Too slow!');
        }
        c.update(dt, t);
      }
      this.updateFlights(dt);

      for (const c of this.customers.filter((x) => x.state === 'gone')) {
        this.scene.remove(c.model.root);
        this.picker.remove(`cust:${c.id}`);
        this.today.handled++;
        this.pushStats();
      }
      this.customers = this.customers.filter((x) => x.state !== 'gone');

      for (const [id, fam] of this.activeFamilies.entries()) {
        if (fam.members.every((m) => m.state === 'gone')) {
          this.activeFamilies.delete(id);
        }
      }

      // the day ends once every customer of the day has been served or has left
      if (this.phase === 'playing' && this.today.spawned >= this.quota && this.customers.length === 0) {
        if (this.dayEndTimer < 0) this.dayEndTimer = 1.2;
        this.dayEndTimer -= dt;
        if (this.dayEndTimer <= 0) {
          this.dayEndTimer = -1;
          this.endDay();
        }
      }
    }

    // keep the guests in sync
    if (this.role === 'host') {
      this.snapTimer -= dt;
      if (this.snapTimer <= 0 || this.snapDirty) {
        this.snapTimer = 1 / SNAPSHOT_HZ;
        this.snapDirty = false;
        this.link?.broadcast(this.snapshot() as unknown as Record<string, unknown>, true);
      }
    }
  }

  private updateFlights(dt: number) {
    for (const f of this.flights) {
      f.t = Math.min(1, f.t + dt / 0.45);
      const to = f.customer.model.hand.getWorldPosition(this.v);
      f.model.position.lerpVectors(f.from, to, f.t);
      f.model.position.y += Math.sin(f.t * Math.PI) * 0.6;
      if (f.t >= 1) {
        f.customer.model.hand.add(f.model);
        f.model.position.set(0, -0.05, 0.05);
        f.model.rotation.set(0, 0, 0);
        f.model.scale.setScalar(0.9);
      }
    }
    this.flights = this.flights.filter((f) => f.t < 1);
  }

  /** Selected/target outlines and the "in hand" card for the local player. */
  private syncLocalMarks() {
    const held = this.localHeld();
    for (const it of this.counter.list()) this.picker.mark(`item:${it.uid}`, held === it ? 'selected' : null);
    for (const c of this.views()) {
      const isTarget =
        held &&
        c.waiting &&
        (c.order === held.recipe ||
          (c.multiOrder?.some((i) => i.recipe === held.recipe && i.delivered < i.quantity) ?? false));
      this.picker.mark(`cust:${c.id}`, isTarget ? 'target' : null);
    }
    const key = held ? `${held.uid}:${this.counter.count(held)}` : '';
    if (key !== this.heldKey) {
      this.heldKey = key;
      this.hud.setHeld(held ? held.recipe : null, held ? this.counter.count(held) : 1);
    }
  }

  private toScreen(p: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = p.clone().project(this.camera);
    const r = this.dom.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width + r.left, y: ((1 - v.y) / 2) * r.height + r.top, visible: v.z < 1 && Math.abs(v.x) < 1.2 };
  }

  private updateHud() {
    const show = this.phase === 'playing';
    const held = this.localHeld();
    this.hud.setReady(
      show ? this.counter.list().map((i) => ({ uid: i.uid, recipe: i.recipe, held: i === held, count: this.counter.count(i) })) : [],
    );
    const views = this.views();
    const seenFamIds = new Set<string>();
    const orderViews: OrderView[] = [];
    if (show) {
      for (const c of views) {
        if (!c.waiting) continue;
        if (c.famId) {
          if (seenFamIds.has(c.famId)) continue;
          seenFamIds.add(c.famId);
        }
        orderViews.push({
          id: c.id,
          name: c.name,
          recipe: c.order,
          frac: c.frac,
          wrong: c.wrong,
          famName: c.famName,
          isSpecialEvent: c.isSpecialEvent,
          eventTitle: c.eventTitle,
          multiOrder: c.multiOrder,
        });
      }
    }
    this.hud.setOrders(orderViews);
    this.hud.setBubbles(
      views
        .filter((c) => !c.arriving || c.line)
        .map((c) => {
          const s = this.toScreen(this.v.copy(c.position).setY(2.25 * c.scale));
          return {
            id: c.id,
            name: c.name,
            recipe: c.order,
            frac: c.frac,
            wrong: c.wrong,
            x: s.x,
            y: s.y,
            visible: s.visible && (c.waiting || !!c.line),
            line: c.line,
            done: !c.waiting,
          };
        }),
    );
    if (this.openStation) {
      const s = this.toScreen(this.openStation.root.getWorldPosition(this.v).add(new THREE.Vector3(0, this.openStation.labelHeight, 0)));
      this.hud.placeLabel(this.openStation.name, s.x, s.y, s.visible);
    } else this.hud.placeLabel(null);
  }

  pushStats() {
    if (this.isAuthority) this.level = 1 + this.owned.size;
    this.hud.setStats({
      shopName: this.shopName,
      money: this.money,
      reputation: this.reputation,
      maxReputation: MAX_REP,
      day: this.day,
      level: this.level,
      handled: this.today.handled,
      quota: this.quota,
      stageNum: this.progression.currentStage,
      stageName: this.progression.getCurrentStageDef().name,
      eraName: this.progression.getEraName(),
    });
    this.snapDirty = true;
  }

  // -------------------------------------------------------------- snapshots

  private sessionSnap(s: CookingSession | null): SessionSnap | null {
    if (!s) return null;
    return { r: s.recipe.id, m: s.mode, b: s.batch, i: s.index, a: [...s.added], tm: s.timer ? [s.timer.elapsed, s.timer.duration] : null };
  }

  snapshot(): Snapshot {
    return {
      t: 'snap',
      v: 2,
      ph: this.phase,
      pa: this.paused,
      name: this.shopName,
      trim: this.trim,
      money: this.money,
      rep: this.reputation,
      day: this.day,
      lvl: this.level,
      handled: this.today.handled,
      quota: this.quota,
      owned: [...this.owned],
      heavy: this.heavyRain,
      rush: this.rush ? this.rush.t / RUSH_SECONDS : -1,
      clock: this.clock.snapshot,
      cs: this.customers.map(
        (c): CustSnap => ({
          id: c.id,
          ty: c.type.id,
          o: c.order,
          x: +c.position.x.toFixed(3),
          z: +c.position.z.toFixed(3),
          ry: +c.model.root.rotation.y.toFixed(3),
          st: c.state,
          mood: c.mood,
          react: c.reacts,
          ln: c.lineTimer > 0 ? c.line : null,
          f: +(c.patience / c.patienceMax).toFixed(3),
          w: c.wrongCount > 0,
          c: c.carry,
          bId: c.businessId,
          famId: c.famId,
          famLead: c.famLead,
          famName: c.famName,
          multiOrder: c.famId
            ? this.activeFamilies.get(c.famId)?.order.items.map((it) => ({ r: it.recipe, q: it.quantity, d: it.delivered }))
            : undefined,
          scale: c.scale !== 1 ? c.scale : undefined,
        }),
      ),
      it: this.counter.list().map(
        (i): ItemSnap => ({
          uid: i.uid,
          r: i.recipe,
          n: this.counter.count(i),
          sl: i.slot,
          hb: [...this.players.values()].find((p) => p.held === i)?.id ?? null,
        }),
      ),
      pl: [...this.players.values()].map(
        (p): PlayerSnap => ({
          id: p.id,
          name: p.name,
          shirt: p.shirt,
          apron: p.apron,
          x: +p.pos.x.toFixed(3),
          y: +p.pos.y.toFixed(3),
          z: +p.pos.z.toFixed(3),
          yaw: +p.yaw.toFixed(3),
          s: this.sessionSnap(p.session),
          h: p.held?.uid ?? null,
          anim: p.anim,
        }),
      ),
      businesses: this.businessManager.serialize(),
      furniture: this.furnitureManager.exportState().map((f) => ({
        uid: f.uid,
        defId: f.defId,
        lvl: f.level,
        x: +f.x.toFixed(3),
        y: +f.y.toFixed(3),
        z: +f.z.toFixed(3),
        ry: +f.ry.toFixed(3),
        p: f.placed,
        d: f.dirty,
      })),
      construction: this.construction.activeContract
        ? {
            cId: this.construction.activeContract.contractId,
            cName: this.construction.activeContract.contractorName,
            tId: this.construction.activeContract.targetId,
            tName: this.construction.activeContract.targetName,
            tLvl: this.construction.activeContract.targetLevel,
            rem: +this.construction.activeContract.remainingSeconds.toFixed(1),
            dur: this.construction.activeContract.durationSeconds,
            prog: +this.construction.activeContract.progress01.toFixed(2),
            x: this.construction.activeContract.sitePosition[0],
            y: this.construction.activeContract.sitePosition[1],
            z: this.construction.activeContract.sitePosition[2],
          }
        : null,
      staff: Array.from(this.staffPuppets.values()).map((p) => ({
        id: p.employee.id,
        r: p.role,
        lvl: p.employee.level ?? 1,
        xp: p.employee.experience ?? 0,
        x: +p.position.x.toFixed(3),
        y: +p.position.y.toFixed(3),
        z: +p.position.z.toFixed(3),
        ry: +p.model.root.rotation.y.toFixed(3),
        st: p.state,
        task: p.employee.currentTask,
      })),
      stage: this.progression.currentStage,
      era: this.progression.getEra(),
      res:
        this.phase === 'dayEnd'
          ? {
              day: this.day,
              completed: this.today.completed,
              lost: this.today.lost,
              earnings: this.today.earnings,
              reputation: this.reputation,
              maxReputation: MAX_REP,
              money: this.money,
              nextQuota: dayQuota(this.day + 1),
            }
          : undefined,
      over: this.phase === 'over' ? (this.overStats ?? undefined) : undefined,
    };
  }

  /** Guests: mirror the host's shop. */
  private applySnapshot(s: Snapshot) {
    const prev = this.lastSnap;
    this.lastSnap = s;
    const prevPhase = this.phase;
    this.phase = s.ph;
    this.paused = s.pa;
    this.money = s.money;
    this.reputation = s.rep;
    this.day = s.day;
    this.clock.apply(s.clock ?? { day: s.day, minute: 7 * 60 + 30 });
    this.level = s.lvl;
    this.today.handled = s.handled;
    this.today.bonus = s.quota - dayQuota(s.day);
    if (s.businesses) this.businessManager.applySnapshot(s.businesses);
    if (s.furniture) {
      this.furnitureManager.importState(
        s.furniture.map((f) => ({
          uid: f.uid,
          defId: f.defId,
          level: f.lvl,
          x: f.x,
          y: f.y,
          z: f.z,
          ry: f.ry,
          placed: f.p,
          dirty: f.d,
        })),
      );
    }
    if (s.construction) {
      this.construction.importState({
        contractId: s.construction.cId,
        contractorName: s.construction.cName,
        targetId: s.construction.tId,
        targetName: s.construction.tName,
        targetLevel: s.construction.tLvl,
        remaining: s.construction.rem,
        total: s.construction.dur,
        sitePos: [s.construction.x, s.construction.y, s.construction.z],
      });
    } else if (this.construction.hasActiveContract()) {
      this.construction.activeContract = null;
    }
    if (typeof s.stage === 'number') {
      this.progression.currentStage = s.stage;
    }
    if (s.name !== this.shopName || s.trim !== this.trim) {
      this.shopName = s.name;
      this.trim = s.trim;
      this.events.onShopLook(s.name, s.trim);
    }

    // upgrades
    const owned = new Set(s.owned);
    if ([...this.owned].some((id) => !owned.has(id))) {
      this.shop.clearUpgrades();
      this.owned.clear();
      this.rain.shelter.z1 = 3.1;
    }
    for (const id of owned) {
      if (this.owned.has(id)) continue;
      this.owned.add(id);
      this.shop.addUpgrade(id, prevPhase === 'dayEnd' || s.ph === 'dayEnd');
      if (id === 'roof') this.rain.shelter.z1 = 4.25;
    }
    if (s.heavy !== this.heavyRain) {
      this.heavyRain = s.heavy;
      this.events.onHeavyRain(s.heavy);
    }
    this.events.onEvent(s.rush >= 0 ? RUSH_TEXT : null, Math.max(0, s.rush));

    // customers
    const seen = new Set<number>();
    for (const cs of s.cs) {
      seen.add(cs.id);
      let p = this.puppets.get(cs.id);
      if (!p) {
        p = new CustomerPuppet(cs);
        this.puppets.set(cs.id, p);
        this.scene.add(p.model.root);
        this.picker.add({ kind: 'customer', key: `cust:${cs.id}`, root: p.model.root });
      } else p.apply(cs);
    }
    for (const [id, p] of this.puppets) {
      if (seen.has(id)) continue;
      this.scene.remove(p.model.root);
      this.picker.remove(`cust:${id}`);
      this.puppets.delete(id);
    }

    // counter
    const items = new Set<number>();
    for (const is of s.it) {
      items.add(is.uid);
      let item = this.counter.list().find((i) => i.uid === is.uid);
      const key = `${is.r}:${is.sl}`;
      if (!item || this.itemKeys.get(is.uid) !== key) {
        item = this.counter.placeAt(is.sl, is.r, is.n, is.uid);
        this.itemKeys.set(is.uid, key);
        this.picker.remove(`item:${is.uid}`);
        this.picker.add({ kind: 'item', key: `item:${is.uid}`, root: item.model });
      } else if (this.counter.count(item) !== is.n) {
        this.counter.setCount(item, is.n);
        this.picker.remove(`item:${is.uid}`);
        this.picker.add({ kind: 'item', key: `item:${is.uid}`, root: item.model });
      }
      item.held = !!is.hb;
    }
    for (const item of this.counter.list()) {
      if (items.has(item.uid)) continue;
      this.picker.remove(`item:${item.uid}`);
      this.counter.remove(item);
      this.itemKeys.delete(item.uid);
    }

    // players
    const me = s.pl.find((p) => p.id === this.localId);
    this.remoteSnaps = s.pl.filter((p) => p.id !== this.localId);
    this.guestHeld = me?.h ?? null;
    const sk = JSON.stringify(me?.s ? { ...me.s, tm: !!me.s.tm } : null);
    if (sk !== this.guestSessionKey) {
      this.guestSessionKey = sk;
      this.guestSession = me?.s ? this.rebuildSession(me.s) : null;
      this.refreshPanel();
    } else if (this.guestSession && me?.s?.tm) {
      this.guestSession.timer = { elapsed: me.s.tm[0], duration: me.s.tm[1] };
    }
    this.updateBusyStations();

    // phases
    this.picker.enabled = s.ph === 'playing' && !s.pa;
    if (!prev || prev.pa !== s.pa) this.hud.setPaused(s.pa, false);
    if (prevPhase !== s.ph || !prev) {
      if (s.ph === 'dayEnd') this.closePanel();
      if (s.ph === 'playing') {
        this.hud.showGameOver(null);
        this.events.onDayStart();
      } else if (s.ph === 'over' && s.over) {
        this.closePanel();
        this.hud.showGameOver(s.over, false);
      } else if (s.ph === 'menu') {
        this.closePanel();
        this.events.onWaiting();
      }
    }
    if (s.ph === 'dayEnd' && s.res && (prevPhase !== 'dayEnd' || prev?.money !== s.money || prev?.owned.length !== s.owned.length)) {
      this.events.onDayEnd({ ...s.res, owned: new Set(s.owned), canAct: false });
    }
    this.pushStats();
  }

  private rebuildSession(ss: SessionSnap): CookingSession {
    const sess = new CookingSession(RECIPES[ss.r], ss.m, 1, ss.b);
    sess.index = ss.i;
    sess.added = [...ss.a];
    sess.timer = ss.tm ? { elapsed: ss.tm[0], duration: ss.tm[1] } : null;
    return sess;
  }

  private updateGuest(dt: number, t: number) {
    for (const p of this.puppets.values()) p.update(dt, t);
    // advance the cooking timer between snapshots so the bar fills smoothly
    const tm = this.guestSession?.timer;
    if (tm && this.playing) tm.elapsed = Math.min(tm.duration, tm.elapsed + dt);
  }

  private clearPuppets() {
    for (const [id, p] of this.puppets) {
      this.scene.remove(p.model.root);
      this.picker.remove(`cust:${id}`);
    }
    this.puppets.clear();
    for (const it of this.counter.list()) this.picker.remove(`item:${it.uid}`);
    this.counter.clear();
    this.itemKeys.clear();
    this.guestSession = null;
    this.guestSessionKey = '';
    this.guestHeld = null;
    this.lastSnap = null;
  }

  // ------------------------------------------------------- game over/restart

  private gameOver() {
    this.phase = 'over';
    if (!this.multiplayer) clearRun();
    this.rush = null;
    this.events.onEvent(null, 0);
    this.closePanel();
    for (const p of this.players.values()) p.held = null;
    this.picker.enabled = false;
    this.hud.setTooltip(null);
    this.overStats = { days: this.day, completed: this.completed, lost: this.lost, earnings: this.earnings, level: this.level };
    this.hud.showGameOver(this.overStats, true);
    this.events.onGameOver();
    this.snapDirty = true;
  }

  private clearCounter() {
    for (const it of this.counter.list()) this.picker.remove(`item:${it.uid}`);
    this.counter.clear();
    for (const p of this.players.values()) p.held = null;
  }

  /** Remove customers, food and the active cooking sessions. */
  private clearDayObjects() {
    for (const c of this.customers) {
      this.scene.remove(c.model.root);
      this.picker.remove(`cust:${c.id}`);
    }
    this.customers = [];
    this.activeFamilies.clear();
    this.announced.clear();
    this.clearCounter();
    this.flights = [];
    for (const p of this.players.values()) p.session = null;
    this.updateBusyStations();
    this.closePanel();
    this.events.onEvent(null, 0);
  }

  /** Clean slate: no customers, food, upgrades or money. */
  restartState() {
    this.clearDayObjects();
    this.clearPuppets();
    this.rush = null;
    this.shop.clearUpgrades();
    this.rain.shelter.z1 = 3.1;
    this.closePanel();
    this.owned.clear();
    this.quests.initDefaultQuests();
    this.hotel.rooms = [];
    this.hotel.dailyHotelRevenue = 0;
    this.hotel.totalHistoricalGuestsServed = 0;
    this.staff.hired = [];
    this.activeFamilies.clear();
    this.familyRegistry.initDefaultRoster();
    this.furnitureManager.initDefaultShopFurniture();
    this.progression.currentStage = 1;
    this.construction.activeContract = null;
    for (const puppet of this.staffPuppets.values()) {
      puppet.destroy(this.scene);
    }
    this.staffPuppets.clear();
    Object.assign(this, { money: 0, reputation: MAX_REP, day: 1, level: 1, streak: 0, completed: 0, lost: 0, earnings: 0 });
    this.clock.reset(1, 7 * 60 + 30);
    this.today = { completed: 0, lost: 0, earnings: 0, spawned: 0, handled: 0, bonus: 0 };
    this.paused = false;
    this.overStats = null;
    this.spawnTimer = EASY.firstSpawn;
    this.dayEndTimer = -1;
    this.hud.setPaused(false, true);
    this.hud.showGameOver(null);
    this.pushStats();
  }

  toMenu() {
    this.restartState();
    this.phase = 'menu';
    this.picker.enabled = false;
    this.snapDirty = true;
  }
}
