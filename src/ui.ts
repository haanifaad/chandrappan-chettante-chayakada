import type { HudStats } from './types';
import { RECIPES, RecipeId } from './recipes';
import { foodIcon } from './icons';
import type { LifestyleState } from './lifestyle';
import type { DailyLedger } from './businessCycle';
import type { BusinessData } from './businesses';
import type { QuestState } from './quests';
import { HotelManager, ROOM_TIER_DEFS } from './hotel';
import { StaffManager, CANDIDATES } from './staff';
import type { FamilyRegistryManager } from './familyRegistry';
import { FurnitureManager } from './furniture';
import { ConstructionManager, ConstructionContractDef } from './construction';
import { ProgressionManager, STAGES } from './progression';

/** HTML HUD: stats, controls, orders list, speech bubbles, held item, toasts, lifestyle, prompts and overlays. */

export interface OrderView {
  id: number;
  name: string;
  recipe: RecipeId;
  frac: number;
  wrong: boolean;
  famName?: string;
  isSpecialEvent?: boolean;
  eventTitle?: string;
  multiOrder?: { recipe: RecipeId; quantity: number; delivered: number }[];
}

export interface BubbleView extends OrderView {
  x: number;
  y: number;
  visible: boolean;
  line: string | null;
  done: boolean;
}

export interface GameOverStats {
  days: number;
  completed: number;
  lost: number;
  earnings: number;
  level: number;
}

export interface Hud {
  setStats(s: HudStats): void;
  setTooltip(text: string | null, x?: number, y?: number): void;
  placeLabel(text: string | null, x?: number, y?: number, visible?: boolean): void;
  setOrders(list: OrderView[]): void;
  setBubbles(list: BubbleView[]): void;
  setHeld(recipe: RecipeId | null, count?: number): void;
  setReady(items: { uid: number; recipe: RecipeId; held: boolean; count: number }[]): void;
  toast(text: string, kind?: 'info' | 'good' | 'bad' | 'gold'): void;
  floatText(text: string, x: number, y: number, kind?: 'gold' | 'bad'): void;
  setPaused(paused: boolean, canResume?: boolean): void;
  showGameOver(stats: GameOverStats | null, canRestart?: boolean): void;
  /** Multiplayer: room code, players and mic state. Null hides it. */
  setRoom(room: RoomView | null): void;
  setMic(on: boolean, available: boolean): void;
  setNameTags(tags: NameTag[]): void;
  setPanelOpen(open: boolean): void;
  setVisible(visible: boolean): void;
  setViewMode(firstPerson: boolean): void;
  setMuted(muted: boolean): void;
  setEvent(text: string | null, frac?: number): void;
  setLifestyle(s: LifestyleState): void;
  setInteractionPrompt(prompt: string | null): void;
  showDailyLedger(ledger: DailyLedger, onContinue: () => void): void;
  hideDailyLedger(): void;
  showBusinessModal(
    bus: BusinessData,
    isOwner: boolean,
    onClaim: () => void,
    onToggleOpen: () => void,
    onClose: () => void,
  ): void;
  hideBusinessModal(): void;
  showQuests(quests: QuestState[], onClaim: (id: string) => void): void;
  hideQuests(): void;
  toggleQuests(quests: QuestState[], onClaim: (id: string) => void): void;
  showManagement(
    hotel: HotelManager,
    staff: StaffManager,
    familyRegistry: FamilyRegistryManager,
    furniture: FurnitureManager,
    construction: ConstructionManager,
    progression: ProgressionManager,
    money: number,
    reputation: number,
    onCleanRoom: (num: number) => void,
    onHire: (id: string) => void,
    onFire: (id: string) => void,
    onToggleDuty: (id: string) => void,
    onAdjustWage: (id: string, delta: number) => void,
    onUpgradeFurniture?: (uid: string) => void,
    onCleanFurnitureTable?: (uid: string) => void,
    onToggleFurniturePlaced?: (uid: string) => void,
    onSignConstructionContract?: (contract: ConstructionContractDef) => void,
    onAdvanceProgressionStage?: () => void,
    onClaimFamilyQuest?: (famId: string) => void,
  ): void;
  hideManagement(): void;
  toggleManagement(
    hotel: HotelManager,
    staff: StaffManager,
    familyRegistry: FamilyRegistryManager,
    furniture: FurnitureManager,
    construction: ConstructionManager,
    progression: ProgressionManager,
    money: number,
    reputation: number,
    onCleanRoom: (num: number) => void,
    onHire: (id: string) => void,
    onFire: (id: string) => void,
    onToggleDuty: (id: string) => void,
    onAdjustWage: (id: string, delta: number) => void,
    onUpgradeFurniture?: (uid: string) => void,
    onCleanFurnitureTable?: (uid: string) => void,
    onToggleFurniturePlaced?: (uid: string) => void,
    onSignConstructionContract?: (contract: ConstructionContractDef) => void,
    onAdvanceProgressionStage?: () => void,
    onClaimFamilyQuest?: (famId: string) => void,
  ): void;
  /** Container for the cooking panel. */
  layer: HTMLElement;
}

export interface RoomView {
  code: string;
  host: boolean;
  players: { name: string; me: boolean; host: boolean; speaking: boolean; mic: boolean }[];
}

export interface NameTag {
  id: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
  speaking: boolean;
  /** 0…1 how loud they are to you (proximity). */
  near: number;
}

export interface HudActions {
  onResetCamera(): void;
  onTogglePause(): void;
  onPutDown(): void;
  onPickItem(uid: number): void;
  onServe(customerId: number): void;
  onRestart(): void;
  onMainMenu(): void;
  onToggleView(): void;
  onLook(where: 'counter' | 'kitchen'): void;
  onToggleMute(): void;
  onToggleMic(): void;
  onLeaveRoom(): void;
  onToggleQuests?: () => void;
  onToggleManagement?: () => void;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const barColor = (f: number) => (f > 0.5 ? 'var(--success)' : f > 0.25 ? 'var(--gold)' : 'var(--terracotta)');

export function createHud(root: HTMLElement, actions: HudActions): Hud {
  root.innerHTML = `
    <section class="hud-card hud-shop" aria-label="Shop">
      <div class="hud-shop-name" data-el="shopName"></div>
      <div class="hud-shop-meta"><span data-el="day"></span><span class="dot">•</span><span data-el="level"></span></div>
      <div class="day-progress"><div data-el="dayBar"></div></div>
      <div class="day-count" data-el="dayCount"></div>
    </section>

    <section class="hud-card hud-wallet" aria-label="Money and reputation">
      <div class="hud-money"><span class="coin">₹</span><span data-el="money">0</span></div>
      <div class="hud-divider"></div>
      <div class="hud-hearts" data-el="hearts" aria-label="Reputation"></div>
    </section>
    <div class="event-banner" data-el="event" hidden>
      <div class="event-text" data-el="eventText"></div>
      <div class="event-bar"><div data-el="eventBar"></div></div>
    </div>
    <div class="toasts" data-el="toasts" aria-live="polite"></div>

    <section class="hud-actions" aria-label="Controls">
      <button class="hud-btn" data-act="pause" title="Pause (P)">❚❚</button>
      <button class="hud-btn" data-act="quests" data-el="questsBtn" title="Quests (Q)">📜</button>
      <button class="hud-btn" data-act="mgmt" data-el="mgmtBtn" title="Hotel & Staff Management (B)">🏨</button>
      <button class="hud-btn wide mic" data-act="mic" data-el="micBtn" title="Microphone (T)" hidden>🎙 Off</button>
      <button class="hud-btn" data-act="mute" data-el="muteBtn" title="Mute (M)">♪</button>
      <button class="hud-btn wide" data-act="view" data-el="viewBtn" title="Switch camera (V)">Overview</button>
      <button class="hud-btn" data-act="reset" title="Reset camera (R)">⟲</button>
    </section>

    <section class="hud-card hud-orders" aria-label="Orders">
      <div class="hud-title">Orders</div>
      <div class="orders-list" data-el="orders"></div>
      <div class="hud-empty" data-el="ordersEmpty">No orders yet. Customers are on their way…</div>
    </section>

    <section class="hud-card hud-held" aria-label="Held item">
      <div class="hud-title">In hand</div>
      <div class="held-body" data-el="held"></div>
      <div class="ready" data-el="ready"></div>
    </section>

    <section class="hud-card hud-lifestyle" data-el="lifestyle" aria-label="Player condition">
      <div class="hud-title" style="margin-bottom: 2px;">Condition</div>
      <div class="lifestyle-row">
        <span class="lifestyle-label">Stamina</span>
        <div class="lifestyle-track"><div class="lifestyle-fill stamina" data-el="lifeStamina" style="width: 100%;"></div></div>
      </div>
      <div class="lifestyle-row">
        <span class="lifestyle-label">Energy</span>
        <div class="lifestyle-track"><div class="lifestyle-fill energy" data-el="lifeEnergy" style="width: 100%;"></div></div>
      </div>
      <div class="lifestyle-row">
        <span class="lifestyle-label">Water</span>
        <div class="lifestyle-track"><div class="lifestyle-fill hydration" data-el="lifeWater" style="width: 100%;"></div></div>
      </div>
      <div class="lifestyle-row">
        <span class="lifestyle-label">Food</span>
        <div class="lifestyle-track"><div class="lifestyle-fill hunger" data-el="lifeFood" style="width: 100%;"></div></div>
      </div>
      <div class="lifestyle-row" style="justify-content: space-between; margin-top: 2px;">
        <span style="font-size: 11px; opacity: 0.8;" data-el="lifeTemp">37.0°C</span>
        <span class="sweat-badge" data-el="lifeSweat" hidden>💦 Sweating</span>
      </div>
    </section>

    <div class="interaction-prompt" data-el="interactionPrompt" hidden>
      <span class="key-badge">E</span> <span data-el="promptText">Interact</span>
    </div>

    <section class="hud-card hud-room" data-el="room" hidden></section>
    <div class="nametags" data-el="nametags"></div>
    <div class="bubbles" data-el="bubbles"></div>
    <div class="floaters" data-el="floaters"></div>
    <div class="panel-layer" data-el="panelLayer"></div>

    <div class="look-btns" data-el="lookBtns">
      <button class="hud-btn wide" data-act="look-counter" title="Look at the counter (1)">1 · Counter</button>
      <button class="hud-btn wide" data-act="look-kitchen" title="Look at the kitchen (2)">2 · Kitchen</button>
    </div>
    <div class="hud-hint" data-el="hint"></div>
    <div class="hud-tooltip" data-el="tooltip" hidden></div>
    <div class="hud-label" data-el="label" hidden></div>

    <div class="overlay" data-el="pause" hidden>
      <div class="overlay-card">
        <h2>Chaya break ☕</h2>
        <p data-el="pauseText">The shop is paused. Customers will wait.</p>
        <button class="btn-primary" data-act="resume" data-el="resumeBtn">Resume</button>
      </div>
    </div>
    <div class="overlay" data-el="gameover" hidden>
      <div class="overlay-card">
        <h2 class="bad">Chandrappante Kada Pooti!</h2>
        <p>The customers have lost faith… for today.</p>
        <dl class="stats" data-el="goStats"></dl>
        <div class="modal-actions center">
          <button class="btn-ghost" data-act="menu">Main Menu</button>
          <button class="btn-primary" data-act="restart" data-el="restartBtn">Try Again</button>
        </div>
      </div>
    </div>

    <div class="overlay" data-el="ledgerModal" hidden>
      <div class="overlay-card ledger-card">
        <div class="ledger-title" data-el="ledgerTitle">Daily Financial Ledger</div>
        <table class="ledger-table" data-el="ledgerTable"></table>
        <div class="modal-actions center">
          <button class="btn-primary" data-el="ledgerContinueBtn">Start Next Day</button>
        </div>
      </div>
    </div>

    <div class="overlay" data-el="businessModal" hidden>
      <div class="overlay-card business-modal-card">
        <h2 data-el="busModalTitle">Business</h2>
        <p data-el="busModalDesc"></p>
        <div class="modal-actions center" style="margin-top: 20px;">
          <button class="btn-primary" data-el="busClaimBtn">Lease Shop</button>
          <button class="btn-ghost" data-el="busOpenToggleBtn">Open / Close</button>
          <button class="btn-ghost" data-el="busCloseBtn">Back</button>
        </div>
      </div>
    </div>

    <div class="overlay" data-el="questsModal" hidden>
      <div class="overlay-card quests-card">
        <div class="quests-header">
          <h2>📜 Munnar Notice Board & Quests</h2>
          <button class="btn-ghost sm" data-el="questsCloseBtn">✕</button>
        </div>
        <p class="quests-sub">Fulfill orders for local families & tourists to earn extra cash and reputation!</p>
        <div class="quests-tabs" data-el="questsTabs">
          <button class="tab-btn active" data-tab="all">All</button>
          <button class="tab-btn" data-tab="daily">Daily</button>
          <button class="tab-btn" data-tab="weekly">Weekly</button>
          <button class="tab-btn" data-tab="special">Special</button>
        </div>
        <div class="quests-list" data-el="questsList"></div>
      </div>
    </div>

    <div class="overlay" data-el="mgmtModal" hidden>
      <div class="overlay-card mgmt-card">
        <div class="quests-header">
          <h2>🏢 Chayakkada Business Empire</h2>
          <button class="btn-ghost sm" data-el="mgmtCloseBtn">✕</button>
        </div>
        <div class="quests-tabs" data-el="mgmtTabs">
          <button class="tab-btn active" data-tab="furniture">🪑 Furniture & Equipment</button>
          <button class="tab-btn" data-tab="construction">🔨 Carpenter Kuttan</button>
          <button class="tab-btn" data-tab="staff">👥 Staff & XP</button>
          <button class="tab-btn" data-tab="progression">📈 25-Stage Progression</button>
          <button class="tab-btn" data-tab="hotel">🏨 Hotel Lodge</button>
          <button class="tab-btn" data-tab="families">👨‍👩‍👧 Families & Regulars</button>
        </div>
        <div class="mgmt-content" data-el="mgmtContent"></div>
      </div>
    </div>
  `;

  const el = (name: string) => root.querySelector<HTMLElement>(`[data-el="${name}"]`)!;
  const tooltip = el('tooltip');
  const label = el('label');
  const ordersEl = el('orders');
  const bubblesEl = el('bubbles');
  const orderRows = new Map<number, HTMLElement>();
  const bubbleEls = new Map<number, HTMLElement>();
  const nameEls = new Map<string, HTMLElement>();
  let lastStats: HudStats | null = null;

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (b && !(b as HTMLButtonElement).disabled) {
      const act = b.dataset.act;
      if (act === 'reset') actions.onResetCamera();
      if (act === 'pause' || act === 'resume') actions.onTogglePause();
      if (act === 'putdown') actions.onPutDown();
      if (act === 'restart') actions.onRestart();
      if (act === 'pick') actions.onPickItem(Number(b.dataset.uid));
      if (act === 'menu') actions.onMainMenu();
      if (act === 'view') actions.onToggleView();
      if (act === 'mute') actions.onToggleMute();
      if (act === 'mic') actions.onToggleMic();
      if (act === 'leave') actions.onLeaveRoom();
      if (act === 'quests') actions.onToggleQuests?.();
      if (act === 'mgmt') actions.onToggleManagement?.();
      if (act === 'look-counter') actions.onLook('counter');
      if (act === 'look-kitchen') actions.onLook('kitchen');
      return;
    }
    const bubble = (e.target as HTMLElement).closest<HTMLElement>('[data-serve]');
    if (bubble) actions.onServe(Number(bubble.dataset.serve));
  });

  const hud: Hud = {
    layer: el('panelLayer'),

    setStats(s) {
      el('shopName').textContent = s.shopName;
      el('day').textContent = `Day ${s.day}`;
      el('level').textContent = s.stageName ? `Stage ${s.stageNum}: ${s.stageName}` : `Shop Lv ${s.level}`;
      el('dayCount').textContent = `${s.handled} / ${s.quota} customers today`;
      el('dayBar').style.width = `${Math.min(100, (s.handled / Math.max(1, s.quota)) * 100)}%`;
      const money = el('money');
      money.textContent = s.money.toLocaleString('en-IN');
      if (lastStats && s.money !== lastStats.money) {
        money.parentElement!.classList.remove('bump');
        void money.offsetWidth;
        money.parentElement!.classList.add('bump');
      }
      if (!lastStats || lastStats.reputation !== s.reputation || lastStats.maxReputation !== s.maxReputation) {
        const hearts = el('hearts');
        hearts.innerHTML = '';
        for (let i = 0; i < s.maxReputation; i++) {
          const h = document.createElement('span');
          h.className = i < s.reputation ? 'heart full' : 'heart';
          h.textContent = '♥';
          hearts.append(h);
        }
        if (lastStats && s.reputation < lastStats.reputation) hearts.classList.add('hurt');
        setTimeout(() => hearts.classList.remove('hurt'), 500);
      }
      lastStats = { ...s };
    },

    setTooltip(text, x = 0, y = 0) {
      tooltip.hidden = !text;
      if (text) {
        tooltip.textContent = text;
        tooltip.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
      }
    },

    placeLabel(text, x = 0, y = 0, visible = true) {
      label.hidden = !text;
      if (!text) return;
      label.textContent = text;
      label.style.visibility = visible ? 'visible' : 'hidden';
      label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    },

    setOrders(list) {
      el('ordersEmpty').hidden = list.length > 0;
      const keep = new Set(list.map((o) => o.id));
      for (const [id, row] of orderRows) if (!keep.has(id)) (row.remove(), orderRows.delete(id));
      for (const o of list) {
        let row = orderRows.get(o.id);
        if (!row) {
          row = document.createElement('div');
          row.className = 'order-row';
          row.dataset.serve = String(o.id);
          const famBadge = o.famName
            ? `<div class="fam-badge ${o.isSpecialEvent ? 'special' : ''}">👨‍👩‍👧‍👦 ${escapeHtml(o.famName)}${o.eventTitle ? ` • ${escapeHtml(o.eventTitle)}` : ''}</div>`
            : '';
          const multiDetails = o.multiOrder && o.multiOrder.length > 0
            ? `<div class="multi-details">${o.multiOrder.map((m) => `<span>${m.quantity} ${RECIPES[m.recipe].name}${m.delivered > 0 ? ` (${m.delivered}/${m.quantity}✓)` : ''}</span>`).join(' • ')}</div>`
            : `<div class="order-item">${RECIPES[o.recipe].name}</div>`;

          row.innerHTML = `${foodIcon(o.recipe, 34)}<div class="order-info">${famBadge}${multiDetails}<div class="order-who">${o.name}</div><div class="pbar"><div></div></div></div>`;
          ordersEl.append(row);
          orderRows.set(o.id, row);
        } else if (o.multiOrder) {
          const multiEl = row.querySelector('.multi-details');
          if (multiEl) {
            multiEl.innerHTML = o.multiOrder.map((m) => `<span>${m.quantity} ${RECIPES[m.recipe].name}${m.delivered > 0 ? ` (${m.delivered}/${m.quantity}✓)` : ''}</span>`).join(' • ');
          }
        }
        const bar = row.querySelector<HTMLElement>('.pbar > div')!;
        bar.style.width = `${Math.max(0, o.frac * 100)}%`;
        bar.style.background = barColor(o.frac);
        row.classList.toggle('wrong', o.wrong);
      }
    },

    setBubbles(list) {
      const keep = new Set(list.map((b) => b.id));
      for (const [id, b] of bubbleEls) if (!keep.has(id)) (b.remove(), bubbleEls.delete(id));
      for (const v of list) {
        let b = bubbleEls.get(v.id);
        if (!b) {
          b = document.createElement('div');
          b.className = 'bubble';
          b.dataset.serve = String(v.id);
          b.innerHTML = `<div class="bubble-line"></div><div class="bubble-order">${foodIcon(v.recipe, 30)}<span>${RECIPES[v.recipe].name}</span></div><div class="pbar"><div></div></div>`;
          bubblesEl.append(b);
          bubbleEls.set(v.id, b);
        }
        b.style.visibility = v.visible ? 'visible' : 'hidden';
        b.style.transform = `translate(-50%, -100%) translate(${v.x}px, ${v.y}px)`;
        const line = b.querySelector<HTMLElement>('.bubble-line')!;
        if (v.line) {
          if (line.textContent !== v.line) line.textContent = v.line;
          line.hidden = false;
        } else line.hidden = true;
        b.classList.toggle('done', v.done);
        b.classList.toggle('wrong', v.wrong);
        const bar = b.querySelector<HTMLElement>('.pbar > div')!;
        bar.style.width = `${Math.max(0, v.frac * 100)}%`;
        bar.style.background = barColor(v.frac);
      }
    },

    setHeld(recipe, count = 1) {
      const held = el('held');
      held.innerHTML = recipe
        ? `<div class="held-item">${foodIcon(recipe, 44)}<div><div class="held-name">${RECIPES[recipe].name}${count > 1 ? ` ×${count}` : ''}</div><div class="held-tip">${count > 1 ? 'Click each customer who ordered it' : 'Click the customer who ordered it'}</div></div></div>
           <button class="btn-ghost small" data-act="putdown">Put down (Esc)</button>`
        : `<div class="held-tip">Empty. Click ready food on the counter to pick it up.</div>`;
      held.parentElement!.classList.toggle('active', !!recipe);
      // bubbles only become click targets while serving, so they never block the kitchen
      root.classList.toggle('holding', !!recipe);
    },

    setReady(items) {
      const key = items.map((i) => `${i.uid}x${i.count}${i.held ? 'h' : ''}`).join(',');
      const box = el('ready');
      if (box.dataset.key === key) return;
      box.dataset.key = key;
      box.innerHTML = items.length
        ? `<div class="hud-title">Ready on counter</div><div class="ready-row">${items
            .map(
              (i) =>
                `<button class="ready-btn ${i.held ? 'on' : ''}" data-act="pick" data-uid="${i.uid}" title="${i.held ? 'Put down' : 'Pick up'} ${RECIPES[i.recipe].name}">${foodIcon(i.recipe, 30)}<span>${RECIPES[i.recipe].name}${i.count > 1 ? ` ×${i.count}` : ''}</span></button>`,
            )
            .join('')}</div>`
        : '';
    },

    toast(text, kind = 'info') {
      const t = document.createElement('div');
      t.className = `toast ${kind}`;
      t.textContent = text;
      const box = el('toasts');
      box.prepend(t);
      while (box.children.length > 3) box.lastElementChild!.remove();
      setTimeout(() => t.classList.add('out'), 3800);
      setTimeout(() => t.remove(), 4200);
    },

    floatText(text, x, y, kind = 'gold') {
      const f = document.createElement('div');
      f.className = `floater ${kind}`;
      f.innerHTML = kind === 'gold' ? `<span class="coin">₹</span>${text}` : text;
      f.style.left = `${x}px`;
      f.style.top = `${y}px`;
      el('floaters').append(f);
      setTimeout(() => f.remove(), 1500);
    },

    setPaused(p, canResume = true) {
      el('pause').hidden = !p;
      el('resumeBtn').hidden = !canResume;
      el('pauseText').textContent = canResume ? 'The shop is paused. Customers will wait.' : 'The host paused the shop. Back in a moment!';
      (root.querySelector('[data-act="pause"]') as HTMLButtonElement).disabled = !canResume;
      root.querySelector('[data-act="pause"]')!.textContent = p ? '▶' : '❚❚';
    },

    showGameOver(stats, canRestart = true) {
      el('gameover').hidden = !stats;
      if (!stats) return;
      el('restartBtn').hidden = !canRestart;
      el('goStats').innerHTML = `
        <dt>Days survived</dt><dd>${stats.days}</dd>
        <dt>Orders completed</dt><dd>${stats.completed}</dd>
        <dt>Customers lost</dt><dd>${stats.lost}</dd>
        <dt>Lifetime earnings</dt><dd>₹${stats.earnings}</dd>
        <dt>Final shop level</dt><dd>${stats.level}</dd>`;
    },

    setPanelOpen(open) {
      el('hint').hidden = open;
    },

    setVisible(visible) {
      root.classList.toggle('hud-hidden', !visible);
    },

    setRoom(room) {
      const card = el('room');
      card.hidden = !room;
      root.classList.toggle('in-room', !!room);
      el('micBtn').hidden = !room;
      if (!room) return;
      card.innerHTML = `
        <div class="room-head"><span class="hud-title">Room</span><b class="room-code">${room.code}</b>
          <button class="btn-ghost small" data-act="leave">Leave</button></div>
        <ul class="room-players">${room.players
          .map(
            (p) =>
              `<li class="${p.speaking ? 'speaking' : ''}"><span class="mic-dot ${p.mic ? 'on' : ''}"></span>${escapeHtml(p.name)}${p.me ? ' <i>(you)</i>' : ''}${
                p.host ? ' <span class="host-badge">host</span>' : ''
              }</li>`,
          )
          .join('')}</ul>`;
    },

    setMic(on, available) {
      const b = el('micBtn') as HTMLButtonElement;
      b.textContent = on ? '🎙 On' : '🎙 Off';
      b.classList.toggle('on', on);
      b.disabled = !available;
    },

    setNameTags(tags) {
      const box = el('nametags');
      const keep = new Set(tags.map((t) => t.id));
      for (const [id, n] of nameEls) if (!keep.has(id)) (n.remove(), nameEls.delete(id));
      for (const t of tags) {
        let n = nameEls.get(t.id);
        if (!n) {
          n = document.createElement('div');
          n.className = 'nametag';
          box.append(n);
          nameEls.set(t.id, n);
        }
        const label = `${t.speaking ? '🔊 ' : ''}${t.name}`;
        if (n.textContent !== label) n.textContent = label;
        n.classList.toggle('speaking', t.speaking);
        n.style.visibility = t.visible ? 'visible' : 'hidden';
        n.style.opacity = String(0.55 + t.near * 0.45);
        n.style.transform = `translate(-50%, -100%) translate(${t.x}px, ${t.y}px)`;
      }
    },

    setMuted(m) {
      const b = el('muteBtn');
      b.textContent = m ? '♪̸' : '♪';
      b.classList.toggle('off', m);
      b.title = m ? 'Unmute (M)' : 'Mute (M)';
    },

    setEvent(text, frac = 0) {
      const box = el('event');
      box.hidden = !text;
      if (!text) return;
      el('eventText').textContent = text;
      el('eventBar').style.width = `${Math.round(frac * 100)}%`;
    },

    setViewMode(fp) {
      el('viewBtn').textContent = fp ? 'Overview' : 'Shop view';
      el('lookBtns').hidden = !fp;
      el('hint').innerHTML = fp
        ? 'Drag to look · <b>WASD</b> walk · <b>Shift</b> run · <b>Space</b> jump · <b>E</b> interact · <b>V</b> overview · <b>R</b> reset'
        : 'Left-drag rotate · Right-drag pan · Wheel zoom · <b>V</b> third person view · <b>R</b> reset';
    },

    setLifestyle(s: LifestyleState) {
      const staminaPct = Math.max(0, Math.min(100, 100 - s.fatigue));
      const energyPct = Math.max(0, Math.min(100, 100 - s.sleepiness));
      el('lifeStamina').style.width = `${staminaPct}%`;
      el('lifeEnergy').style.width = `${energyPct}%`;
      el('lifeWater').style.width = `${s.hydration}%`;
      el('lifeFood').style.width = `${s.hunger}%`;
      el('lifeTemp').textContent = `${s.bodyTemp.toFixed(1)}°C`;
      el('lifeSweat').hidden = s.sweatLevel < 40;
    },

    setInteractionPrompt(prompt: string | null) {
      const p = el('interactionPrompt');
      if (!prompt) {
        p.hidden = true;
      } else {
        p.hidden = false;
        el('promptText').textContent = prompt;
      }
    },

    showDailyLedger(ledger: DailyLedger, onContinue: () => void) {
      const modal = el('ledgerModal');
      modal.hidden = false;
      el('ledgerTitle').textContent = `Day ${ledger.day} Business Ledger`;

      const tbody = `
        <tr><td>Opening Balance</td><td>₹${ledger.openingBalance}</td></tr>
        <tr><td>Gross Revenue (${ledger.customersServed} served)</td><td style="color: var(--leaf)">+ ₹${ledger.grossRevenue}</td></tr>
        <tr><td>Ingredient Restock Cost</td><td style="color: var(--terracotta)">- ₹${ledger.ingredientCost}</td></tr>
        <tr><td>Employee Wages</td><td style="color: var(--terracotta)">- ₹${ledger.employeeWages}</td></tr>
        <tr><td>Firewood, Kerosene & Electricity</td><td style="color: var(--terracotta)">- ₹${ledger.utilityExpenses}</td></tr>
        ${ledger.cleanlinessBonus > 0 ? `<tr><td>Cleanliness Tip Bonus</td><td style="color: var(--gold)">+ ₹${ledger.cleanlinessBonus}</td></tr>` : ''}
        <tr class="ledger-total"><td>Net Daily Profit</td><td>₹${ledger.netProfit}</td></tr>
        <tr style="font-weight: 800; font-size: 15px;"><td>New Cash Balance</td><td>₹${ledger.closingBalance}</td></tr>
      `;
      el('ledgerTable').innerHTML = tbody;

      const btn = el('ledgerContinueBtn');
      btn.onclick = () => {
        modal.hidden = true;
        onContinue();
      };
    },

    hideDailyLedger() {
      el('ledgerModal').hidden = true;
    },

    showBusinessModal(bus, isOwner, onClaim, onToggleOpen, onClose) {
      const modal = el('businessModal');
      modal.hidden = false;
      el('busModalTitle').textContent = bus.name;
      el('busModalDesc').innerHTML = `
        <b>Location:</b> ${bus.locationName}<br>
        <b>Owner:</b> ${bus.ownerName}<br>
        <b>Status:</b> ${bus.isOpen ? '🟢 Open for Business' : '🔴 Closed'}<br>
        <b>Reputation:</b> ${bus.reputation.toFixed(1)} / 5.0<br>
        <b>Cleanliness:</b> ${bus.cleanliness}%<br>
        ${bus.hasLodge ? `<b>Lodge Facility:</b> Active (${bus.lodgeOccupancy} guests staying)` : ''}
      `;

      const claimBtn = el('busClaimBtn') as HTMLButtonElement;
      claimBtn.hidden = isOwner || bus.ownerId !== null;
      claimBtn.onclick = () => {
        onClaim();
        modal.hidden = true;
      };

      const openBtn = el('busOpenToggleBtn') as HTMLButtonElement;
      openBtn.hidden = !isOwner;
      openBtn.textContent = bus.isOpen ? 'Close Shop' : 'Open Shop';
      openBtn.onclick = () => {
        onToggleOpen();
        modal.hidden = true;
      };

      el('busCloseBtn').onclick = () => {
        modal.hidden = true;
        onClose();
      };
    },

    hideBusinessModal() {
      el('businessModal').hidden = true;
    },

    showQuests(quests: QuestState[], onClaim: (id: string) => void) {
      const modal = el('questsModal');
      modal.hidden = false;
      let activeTab = 'all';

      const render = () => {
        const list = el('questsList');
        const filtered = activeTab === 'all' ? quests : quests.filter((q) => q.type === activeTab);
        list.innerHTML = filtered.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          const typeBadge = `<span class="quest-badge ${q.type}">${q.type.toUpperCase()}</span>`;
          let actionHtml = '';
          if (q.claimed) {
            actionHtml = `<span class="quest-claimed">Claimed ✓</span>`;
          } else if (q.completed) {
            actionHtml = `<button class="btn-primary sm pulse-btn" data-claim="${escapeHtml(q.id)}">Claim Reward</button>`;
          } else {
            actionHtml = `<span class="quest-progress-txt">${q.progress}/${q.target}</span>`;
          }

          return `
            <div class="quest-card ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}">
              <div class="quest-card-top">
                <div class="quest-title-row">
                  ${typeBadge}
                  <span class="quest-title">${escapeHtml(q.title)}</span>
                </div>
                <div class="quest-rewards">
                  <span class="reward-pill money">₹${q.rewardMoney}</span>
                  <span class="reward-pill rep">+${q.rewardReputation} ♥</span>
                </div>
              </div>
              <div class="quest-desc">${escapeHtml(q.description)}</div>
              <div class="quest-progress-row">
                <div class="quest-bar"><div class="quest-fill" style="width: ${pct}%;"></div></div>
                <div class="quest-action">${actionHtml}</div>
              </div>
            </div>
          `;
        }).join('');

        list.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((btn) => {
          btn.onclick = () => {
            const qid = btn.dataset.claim!;
            onClaim(qid);
            const found = quests.find((x) => x.id === qid);
            if (found) {
              found.claimed = true;
              render();
            }
          };
        });
      };

      const tabs = el('questsTabs');
      tabs.onclick = (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
        if (!btn) return;
        tabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab ?? 'all';
        render();
      };

      el('questsCloseBtn').onclick = () => {
        modal.hidden = true;
      };

      render();
    },

    hideQuests() {
      el('questsModal').hidden = true;
    },

    toggleQuests(quests: QuestState[], onClaim: (id: string) => void) {
      const modal = el('questsModal');
      if (modal.hidden) {
        hud.showQuests(quests, onClaim);
      } else {
        hud.hideQuests();
      }
    },

    showManagement(
      hotel: HotelManager,
      staff: StaffManager,
      familyRegistry: FamilyRegistryManager,
      furniture: FurnitureManager,
      construction: ConstructionManager,
      progression: ProgressionManager,
      money: number,
      reputation: number,
      onCleanRoom: (num: number) => void,
      onHire: (id: string) => void,
      onFire: (id: string) => void,
      onToggleDuty: (id: string) => void,
      onAdjustWage: (id: string, delta: number) => void,
      onUpgradeFurniture?: (uid: string) => void,
      onCleanFurnitureTable?: (uid: string) => void,
      onToggleFurniturePlaced?: (uid: string) => void,
      onSignConstructionContract?: (contract: ConstructionContractDef) => void,
      onAdvanceProgressionStage?: () => void,
      onClaimFamilyQuest?: (famId: string) => void,
    ) {
      const modal = el('mgmtModal');
      modal.hidden = false;
      let activeTab = 'furniture';

      const render = () => {
        const content = el('mgmtContent');

        if (activeTab === 'furniture') {
          // Furniture & Equipment Tab
          const allItems = furniture.getAll();
          const dirtyTables = furniture.getDirtyTables();
          const isBuilding = construction.hasActiveContract();

          content.innerHTML = `
            <div class="staff-summary">
              <span>Installed Items: ${allItems.length}</span>
              <span>Dirty Tables: ${dirtyTables.length > 0 ? `<strong style="color:var(--terracotta);">${dirtyTables.length} (Needs cleaning!)</strong>` : '<strong style="color:var(--success);">0 (Pristine ✨)</strong>'}</span>
              <span>Available Funds: <strong>₹${money}</strong></span>
            </div>
            ${
              isBuilding
                ? `<div style="background:#fff8e1; border:1px solid #ffd54f; padding:8px 12px; border-radius:6px; margin:10px 0; font-size:12px; font-weight:700; color:#856404;">
                    🔨 Kuttan Ashari is currently on-site working on: ${escapeHtml(construction.activeContract!.targetName)} (${Math.round(construction.activeContract!.progress01 * 100)}% complete)
                   </div>`
                : ''
            }
            <div class="furniture-grid">
              ${allItems
                .map((item) => {
                  const curTier = item.getCurrentTierDef();
                  const nextTier = item.getNextTierDef();
                  const isMax = nextTier === null;
                  const isDirty = item.isDirty;

                  let actionBtn = '';
                  if (item.def.id === 'table_teak' && isDirty) {
                    actionBtn += `<button class="sm-btn btn-primary" data-clean-table="${item.uid}" style="margin-bottom:6px;">✨ Wipe Table Clean</button>`;
                  }

                  if (isMax) {
                    actionBtn += `<span class="furniture-badge max">⭐ Max Level 3 Reached</span>`;
                  } else if (isBuilding && construction.activeContract?.targetId === item.uid) {
                    actionBtn += `<button class="sm-btn btn-ghost" disabled>🔨 Installing (${Math.round(construction.activeContract.progress01 * 100)}%)</button>`;
                  } else {
                    const canAfford = money >= nextTier.cost;
                    const canStage = progression.currentStage >= nextTier.stageRequired;
                    const canRep = reputation >= nextTier.reputationRequired;
                    const canBuy = canAfford && canStage && canRep && !isBuilding;
                    let reason = '';
                    if (!canAfford) reason = `Need ₹${nextTier.cost}`;
                    else if (!canStage) reason = `Req Stage ${nextTier.stageRequired}`;
                    else if (!canRep) reason = `Req ${nextTier.reputationRequired}♥`;
                    else if (isBuilding) reason = 'Carpenter Busy';

                    actionBtn += `
                      <button class="sm-btn ${canBuy ? 'btn-primary' : 'btn-ghost'}" data-upgrade-furniture="${item.uid}" ${canBuy ? '' : 'disabled'}>
                        🔨 Upgrade to Lvl ${nextTier.level} (₹${nextTier.cost})
                      </button>
                      ${reason ? `<span style="font-size:10px; color:var(--terracotta); margin-top:2px;">${reason}</span>` : ''}
                    `;
                  }

                  return `
                    <div class="furniture-card ${isDirty ? 'dirty' : ''}">
                      <div class="furniture-header">
                        <div>
                          <div class="furniture-title">${escapeHtml(curTier.name)}</div>
                          <div class="furniture-malayalam">${escapeHtml(item.def.malayalam)} (${escapeHtml(item.def.category)})</div>
                        </div>
                        <span class="furniture-badge ${isDirty ? 'dirty' : ''}">Lvl ${item.level}</span>
                      </div>
                      <div class="furniture-perks">
                        ${escapeHtml(curTier.perkDescription)}
                      </div>
                      ${
                        nextTier
                          ? `<div class="furniture-next">
                              <strong>Next (Lvl ${nextTier.level}):</strong> ${escapeHtml(nextTier.name)}<br/>
                              <span style="font-size:10.5px; opacity:0.85;">${escapeHtml(nextTier.perkDescription)} (Build: ${nextTier.buildTimeSeconds}s)</span>
                            </div>`
                          : ''
                      }
                      <div style="display:flex; flex-direction:column; align-items:flex-end; margin-top:4px; gap:4px;">
                        ${actionBtn}
                        <button class="sm-btn ${item.isPlaced ? 'btn-ghost' : 'btn-primary'}" data-toggle-furniture="${item.uid}" style="font-size:11px; padding:3px 8px;">
                          ${item.isPlaced ? '📦 Store / Remove' : '📍 Place in Shop'}
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          content.querySelectorAll<HTMLButtonElement>('[data-upgrade-furniture]').forEach((btn) => {
            btn.onclick = () => {
              const uid = btn.dataset.upgradeFurniture!;
              onUpgradeFurniture?.(uid);
              render();
            };
          });

          content.querySelectorAll<HTMLButtonElement>('[data-clean-table]').forEach((btn) => {
            btn.onclick = () => {
              const uid = btn.dataset.cleanTable!;
              onCleanFurnitureTable?.(uid);
              render();
            };
          });

          content.querySelectorAll<HTMLButtonElement>('[data-toggle-furniture]').forEach((btn) => {
            btn.onclick = () => {
              const uid = btn.dataset.toggleFurniture!;
              onToggleFurniturePlaced?.(uid);
              render();
            };
          });
        } else if (activeTab === 'construction') {
          // Construction & Carpenter Tab
          const isBusy = construction.hasActiveContract();
          const contract = construction.activeContract;

          // Prepare list of potential contracts from furniture
          const availableContracts: ConstructionContractDef[] = [];
          for (const item of furniture.getAll()) {
            const next = item.getNextTierDef();
            if (next) {
              availableContracts.push({
                contractId: `contract_${item.uid}_${next.level}`,
                contractorName: 'Kuttan Ashari',
                malayalam: 'കുട്ടൻ ആശാരി',
                targetType: 'furniture',
                targetId: item.uid,
                targetName: `${item.def.name} -> ${next.name}`,
                targetLevel: next.level,
                cost: next.cost,
                durationSeconds: next.buildTimeSeconds,
                sitePosition: [item.position.x, item.position.y, item.position.z],
                description: `Install Level ${next.level} ${next.name} with authentic woodwork and assembly.`,
              });
            }
          }

          content.innerHTML = `
            <div class="construction-hero">
              <div class="carpenter-avatar">🔨</div>
              <div class="carpenter-meta">
                <h4>Kuttan Ashari (കുട്ടൻ ആശാരി)</h4>
                <p>Master Traditional Carpenter of Munnar. Signs construction contracts, constructs scaffolding on-site, and installs shop equipment.</p>
              </div>
            </div>

            ${
              isBusy && contract
                ? `
                <div style="background:#fefce8; border:2px solid #ca8a04; border-radius:8px; padding:14px; margin-bottom:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; font-size:14px; color:#854d0e;">🔨 Ongoing Project: ${escapeHtml(contract.targetName)}</span>
                    <span style="font-weight:700; font-size:12px; color:#a16207;">${Math.round(contract.progress01 * 100)}%</span>
                  </div>
                  <div class="staff-xp-bar" style="height:10px; margin:8px 0 6px 0;">
                    <div class="staff-xp-fill" style="width:${Math.round(contract.progress01 * 100)}%; background:#eab308;"></div>
                  </div>
                  <div style="font-size:11.5px; color:#713f12;">
                    Time Remaining: <strong>${Math.ceil(contract.remainingSeconds)}s</strong> • Kuttan Ashari is actively working at the site with tools & scaffolding.
                  </div>
                </div>
              `
                : `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:#166534; font-weight:700;">
                  ✓ Kuttan Ashari is ready for new contracts. Select an upgrade below to hire him.
                </div>
              `
            }

            <h3 style="font-size:14px; margin:14px 0 8px; color:var(--wood);">Available Construction Contracts</h3>
            <div class="contract-list">
              ${availableContracts
                .map((c) => {
                  const canAfford = money >= c.cost;
                  const canSign = canAfford && !isBusy;

                  return `
                    <div class="contract-card">
                      <div class="contract-info">
                        <span class="contract-name">${escapeHtml(c.targetName)}</span>
                        <span class="contract-details">Duration: ${c.durationSeconds}s • Upfront Payment: ₹${c.cost}</span>
                      </div>
                      <button class="sm-btn ${canSign ? 'btn-primary' : 'btn-ghost'}" data-sign-contract="${c.contractId}" ${canSign ? '' : 'disabled'}>
                        Sign & Pay ₹${c.cost}
                      </button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          content.querySelectorAll<HTMLButtonElement>('[data-sign-contract]').forEach((btn) => {
            btn.onclick = () => {
              const cid = btn.dataset.signContract;
              const found = availableContracts.find((c) => c.contractId === cid);
              if (found) {
                onSignConstructionContract?.(found);
                render();
              }
            };
          });
        } else if (activeTab === 'progression') {
          // 25-Stage Progression Tab
          const curDef = progression.getCurrentStageDef();
          const nextDef = progression.getNextStageDef();
          const canAdv = progression.canAdvance(money, reputation);
          const allStages = STAGES;

          content.innerHTML = `
            <div class="progression-hero">
              <span class="progression-era-badge">${escapeHtml(progression.getEraName())}</span>
              <div class="progression-stage-title">
                Stage ${curDef.stage}: ${escapeHtml(curDef.name)} <span style="font-size:14px; font-weight:400; opacity:0.85;">(${escapeHtml(curDef.malayalam)})</span>
              </div>
              <div style="font-size:12px; font-style:italic; color:#2e7d32; margin-bottom:6px;">"${escapeHtml(curDef.tagline)}"</div>
              <div class="progression-desc">${escapeHtml(curDef.description)}</div>
              <div style="font-size:12px; font-weight:700; color:var(--charcoal);">
                🍲 Signature Dish: <strong>${escapeHtml(curDef.signatureDish)}</strong>
              </div>
              <div class="progression-unlocks">
                ${curDef.keyUnlocks.map((u) => `<span class="unlock-pill">✓ ${escapeHtml(u)}</span>`).join('')}
              </div>
            </div>

            ${
              nextDef
                ? `
              <div class="progression-next-box">
                <div style="font-weight:800; font-size:14px; color:var(--wood); margin-bottom:8px;">
                  Target: Stage ${nextDef.stage} — ${escapeHtml(nextDef.name)} (${escapeHtml(nextDef.malayalam)})
                </div>
                <div class="req-item ${money >= nextDef.capitalRequired ? 'met' : 'unmet'}">
                  ${money >= nextDef.capitalRequired ? '✓' : '✗'} Capital: ₹${Math.floor(money).toLocaleString()} / ₹${nextDef.capitalRequired.toLocaleString()}
                </div>
                <div class="req-item ${reputation >= nextDef.reputationRequired ? 'met' : 'unmet'}">
                  ${reputation >= nextDef.reputationRequired ? '✓' : '✗'} Reputation: ${reputation.toFixed(1)} / ${nextDef.reputationRequired.toFixed(1)} ♥
                </div>
                ${nextDef.prerequisites
                  .map((p) => {
                    const isMet = progression.completedPrerequisites.has(p);
                    return `
                      <div class="req-item ${isMet ? 'met' : 'unmet'}">
                        ${isMet ? '✓' : '✗'} Milestone: ${escapeHtml(p.replace(/_/g, ' '))}
                      </div>
                    `;
                  })
                  .join('')}
                
                <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                  <button class="sm-btn ${canAdv.canAdvance ? 'btn-primary' : 'btn-ghost'}" data-advance-stage ${canAdv.canAdvance ? '' : 'disabled'} style="font-size:13px; padding:6px 16px;">
                    🚀 Advance to Stage ${nextDef.stage}
                  </button>
                  ${!canAdv.canAdvance ? `<span style="font-size:11px; color:var(--terracotta);">${escapeHtml(canAdv.reason ?? '')}</span>` : ''}
                </div>
              </div>
            `
                : `
              <div style="background:#fff8e1; border:1px solid #ffd54f; border-radius:8px; padding:12px; font-weight:800; color:#856404; text-align:center;">
                🏆 Maximum Progression Reached: The Golden Samovar Palace (Stage 25)
              </div>
            `
            }

            <h3 style="font-size:14px; margin:16px 0 8px; color:var(--wood);">All 25 Progression Stages</h3>
            <div style="max-height:220px; overflow-y:auto; border:1px solid rgba(0,0,0,0.1); border-radius:6px; background:#fff;">
              ${allStages
                .map((st) => {
                  const isCurrent = st.stage === progression.currentStage;
                  const isUnlocked = st.stage <= progression.currentStage;
                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-bottom:1px solid #f0f0f0; ${isCurrent ? 'background:#e8f5e9; font-weight:800;' : ''}">
                      <span style="font-size:12px; ${isUnlocked ? 'color:var(--charcoal);' : 'color:#999;'}">
                        Stage ${st.stage}: ${escapeHtml(st.name)} (${escapeHtml(st.malayalam)})
                      </span>
                      <span style="font-size:11px; color:${isCurrent ? 'var(--leaf)' : isUnlocked ? '#666' : '#bbb'};">
                        ${isCurrent ? '● ACTIVE' : isUnlocked ? 'Unlocked' : `Locked (₹${st.capitalRequired.toLocaleString()})`}
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          content.querySelector<HTMLButtonElement>('[data-advance-stage]')?.addEventListener('click', () => {
            onAdvanceProgressionStage?.();
            render();
          });
        } else if (activeTab === 'hotel') {
          // Hotel tab
          const totalRooms = hotel.rooms.length;
          const occupiedRooms = hotel.rooms.filter((r) => r.isOccupied).length;
          const occPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
          const revenue = hotel.dailyHotelRevenue;

          if (totalRooms === 0) {
            content.innerHTML = `
              <div class="room-summary">
                <span>🏨 Munnar Residency Lodge: Not yet built</span>
              </div>
              <div style="text-align: center; padding: 24px; color: #555;">
                <p style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">Upgrade your shop with <strong>Munnar Lodge Floor</strong> to start hosting guests!</p>
                <p style="font-size: 13px;">Guest rooms provide substantial passive accommodation income at the end of each day.</p>
              </div>
            `;
            return;
          }

          content.innerHTML = `
            <div class="room-summary">
              <span>Rooms: ${occupiedRooms} / ${totalRooms} (${occPct}% Occupied)</span>
              <span>Daily Room Income: ₹${revenue}</span>
            </div>
            <div class="room-grid">
              ${hotel.rooms
                .map((r) => {
                  const cleanPct = Math.round(r.cleanliness01 * 100);
                  const isCleanLow = cleanPct < 40;
                  const guestInfo = r.currentGuest
                    ? `Guest: <strong>${escapeHtml(r.currentGuest.name)}</strong> (${escapeHtml(r.currentGuest.origin)})`
                    : `<em>Vacant</em>`;
                  const cleanBtn =
                    cleanPct < 90
                      ? `<button class="sm-btn btn-primary" data-clean-room="${r.roomNumber}">Clean Room</button>`
                      : `<span style="font-size: 11px; color: var(--success); font-weight: 700;">Clean ✓</span>`;

                  return `
                    <div class="room-card ${r.isOccupied ? 'occupied' : ''} ${cleanPct < 50 ? 'dirty' : ''}">
                      <div class="room-header">
                        <span class="room-num">Room ${r.roomNumber}</span>
                        <span class="room-tier-badge">${escapeHtml(ROOM_TIER_DEFS[r.tier]?.name ?? r.tier)}</span>
                      </div>
                      <div class="room-guest">${guestInfo}</div>
                      <div class="clean-bar-wrap">
                        <span>Clean: ${cleanPct}%</span>
                        <div class="clean-bar"><div class="clean-fill ${isCleanLow ? 'low' : ''}" style="width: ${cleanPct}%;"></div></div>
                        ${cleanBtn}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          content.querySelectorAll<HTMLButtonElement>('[data-clean-room]').forEach((btn) => {
            btn.onclick = () => {
              const num = Number(btn.dataset.cleanRoom);
              onCleanRoom(num);
              render();
            };
          });
        } else if (activeTab === 'staff') {
          // Staff tab with Level 1-10 & XP
          const payroll = staff.calculateDailyPayroll();
          const hiredCount = staff.hired.length;

          content.innerHTML = `
            <div class="staff-summary">
              <span>Hired Staff: ${hiredCount}</span>
              <span>Available Funds: ₹${money}</span>
              <span>Daily Payroll: ₹${payroll}</span>
            </div>
            <h3 style="font-size: 14px; margin: 10px 0 6px; color: var(--wood);">Active Staff (Physical In-Shop Helpers)</h3>
            <div class="staff-list">
              ${
                staff.hired.length === 0
                  ? '<div style="font-size: 13px; color: #777; padding: 8px;">No staff hired yet. Hire helpers below: Waiter delivers food, Cleaner wipes tables, Cook assists kitchen!</div>'
                  : staff.hired
                      .map((emp) => {
                        const lvl = emp.level ?? 1;
                        const xp = emp.experience ?? 0;
                        const reqXp = lvl * 100;
                        const xpPct = Math.min(100, Math.round((xp / reqXp) * 100));

                        return `
                          <div class="staff-card">
                            <div class="staff-info">
                              <div class="staff-avatar" style="background: ${emp.avatarColor};">${emp.name.charAt(0)}</div>
                              <div class="staff-meta" style="flex:1;">
                                <div style="display:flex; align-items:center;">
                                  <span class="staff-name">${escapeHtml(emp.name)} <span style="font-size: 11px; font-weight: 400; opacity: 0.8;">(${escapeHtml(emp.malayalam)})</span></span>
                                  <span class="staff-level-badge">⭐ Lvl ${lvl}</span>
                                </div>
                                <span class="staff-task">${escapeHtml(emp.role.toUpperCase())} • <strong>${escapeHtml(emp.currentTask)}</strong></span>
                                <div class="staff-xp-bar" title="XP: ${xp} / ${reqXp}">
                                  <div class="staff-xp-fill" style="width:${xpPct}%;"></div>
                                </div>
                                <span style="font-size:10px; color:#888;">XP: ${xp}/${reqXp} (Tasks: ${emp.totalTasksCompleted ?? 0})</span>
                              </div>
                            </div>
                            <div class="staff-controls">
                              <span class="wage-tag">₹${emp.dailyWage}/d</span>
                              <button class="sm-btn btn-ghost" data-wage-down="${emp.id}" title="Lower wage">-₹20</button>
                              <button class="sm-btn btn-ghost" data-wage-up="${emp.id}" title="Raise wage">+₹20</button>
                              <button class="sm-btn ${emp.isWorking ? 'btn-primary' : 'btn-ghost'}" data-toggle-duty="${emp.id}">${emp.isWorking ? 'On Duty' : 'On Break'}</button>
                              <button class="sm-btn btn-ghost" data-fire="${emp.id}" title="Fire employee" style="color: var(--terracotta);">✕</button>
                            </div>
                          </div>
                        `;
                      })
                      .join('')
              }
            </div>
            <h3 style="font-size: 14px; margin: 14px 0 6px; color: var(--wood);">Available Candidates for Hire</h3>
            <div class="staff-list">
              ${CANDIDATES.filter((c) => !staff.isHired(c.id))
                .map(
                  (c) => `
                  <div class="staff-card">
                    <div class="staff-info">
                      <div class="staff-avatar" style="background: ${c.avatarColor};">${c.name.charAt(0)}</div>
                      <div class="staff-meta">
                        <span class="staff-name">${escapeHtml(c.name)} (${escapeHtml(c.malayalam)}) <span class="staff-level-badge">Lvl ${c.level}</span></span>
                        <span class="staff-task">${escapeHtml(c.role.toUpperCase())} • ${escapeHtml(c.description)}</span>
                      </div>
                    </div>
                    <div class="staff-controls">
                      <span class="wage-tag">₹${c.dailyWage}/d</span>
                      <button class="sm-btn btn-primary" data-hire="${c.id}">Hire</button>
                    </div>
                  </div>
                `,
                )
                .join('')}
            </div>
          `;

          content.querySelectorAll<HTMLButtonElement>('[data-hire]').forEach((btn) => {
            btn.onclick = () => {
              onHire(btn.dataset.hire!);
              render();
            };
          });
          content.querySelectorAll<HTMLButtonElement>('[data-fire]').forEach((btn) => {
            btn.onclick = () => {
              onFire(btn.dataset.fire!);
              render();
            };
          });
          content.querySelectorAll<HTMLButtonElement>('[data-toggle-duty]').forEach((btn) => {
            btn.onclick = () => {
              onToggleDuty(btn.dataset.toggleDuty!);
              render();
            };
          });
          content.querySelectorAll<HTMLButtonElement>('[data-wage-up]').forEach((btn) => {
            btn.onclick = () => {
              onAdjustWage(btn.dataset.wageUp!, 20);
              render();
            };
          });
          content.querySelectorAll<HTMLButtonElement>('[data-wage-down]').forEach((btn) => {
            btn.onclick = () => {
              onAdjustWage(btn.dataset.wageDown!, -20);
              render();
            };
          });
        } else if (activeTab === 'families') {
          // Families tab
          const list = Array.from(familyRegistry.families.values());
          const discovered = list.filter((f) => f.visitCount > 0);
          const totalVisited = discovered.length;
          const vips = list.filter((f) => f.loyaltyTier === 'vip_patron').length;

          content.innerHTML = `
            <div class="staff-summary">
              <span>Known Families: ${totalVisited} / ${list.length}</span>
              <span>VIP Patron Groups: ${vips}</span>
            </div>
            <div class="family-list">
              ${list
                .map((f) => {
                  const stars = f.loyaltyTier === 'vip_patron' ? '⭐⭐⭐⭐⭐ VIP' : f.loyaltyTier === 'family_friend' ? '⭐⭐⭐⭐ Friend' : f.loyaltyTier === 'regular' ? '⭐⭐⭐ Regular' : f.visitCount > 0 ? '⭐⭐ Familiar' : '⭐ New';
                  const badgeColor = f.budgetTier === 'wealthy' ? 'gold' : f.budgetTier === 'budget' ? 'terracotta' : 'leaf';
                  const questHtml = f.quest
                    ? `<div class="family-quest-box ${f.quest.completed ? 'completed' : ''}">
                        <div style="font-weight: 700; font-size: 12px;">📜 ${escapeHtml(f.quest.title)}</div>
                        <div style="font-size: 11px; opacity: 0.85;">${escapeHtml(f.quest.description)}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                          <span style="font-weight: 800; font-size: 11px; color: var(--gold);">Reward: ₹${f.quest.rewardMoney} +${f.quest.rewardReputation}♥</span>
                          ${
                            f.quest.claimed
                              ? '<span style="font-size: 11px; color: var(--success); font-weight: 700;">Claimed ✓</span>'
                              : f.quest.completed
                              ? `<button class="sm-btn btn-primary" data-claim-fam-quest="${f.id}">Claim Reward</button>`
                              : '<span style="font-size: 11px; color: #888;">In progress</span>'
                          }
                        </div>
                      </div>`
                    : '';

                  return `
                    <div class="family-card ${f.visitCount > 0 ? 'visited' : ''}">
                      <div class="family-card-head">
                        <div>
                          <span class="family-name">${escapeHtml(f.name)}</span>
                          <span class="family-origin">📍 ${escapeHtml(f.origin)}</span>
                        </div>
                        <div style="text-align: right;">
                          <div class="loyalty-badge">${stars}</div>
                          <span class="budget-badge ${badgeColor}">${f.budgetTier.toUpperCase()}</span>
                        </div>
                      </div>
                      <div class="family-members-row">
                        👥 Members (${f.members.length}): ${f.members.map((m) => `${escapeHtml(m.name)} (${escapeHtml(m.relation)})`).join(', ')}
                      </div>
                      <div class="family-stats-row">
                        <span>Visits: <strong>${f.visitCount}</strong></span>
                        <span>Affinity: <strong>${f.relationshipScore}%</strong></span>
                        ${f.specialEvent !== 'none' ? `<span class="event-tag">✨ ${escapeHtml(f.specialEvent.replace('_', ' ').toUpperCase())}</span>` : ''}
                      </div>
                      <div class="clean-bar" style="margin-top: 4px;"><div class="clean-fill" style="width: ${f.relationshipScore}%;"></div></div>
                      ${questHtml}
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          content.querySelectorAll<HTMLButtonElement>('[data-claim-fam-quest]').forEach((btn) => {
            btn.onclick = () => {
              const famId = btn.dataset.claimFamQuest!;
              onClaimFamilyQuest?.(famId);
              render();
            };
          });
        }
      };

      const tabs = el('mgmtTabs');
      tabs.onclick = (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
        if (!btn) return;
        tabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab ?? 'furniture';
        render();
      };

      el('mgmtCloseBtn').onclick = () => {
        modal.hidden = true;
      };

      render();
    },

    hideManagement() {
      el('mgmtModal').hidden = true;
    },

    toggleManagement(
      hotel: HotelManager,
      staff: StaffManager,
      familyRegistry: FamilyRegistryManager,
      furniture: FurnitureManager,
      construction: ConstructionManager,
      progression: ProgressionManager,
      money: number,
      reputation: number,
      onCleanRoom: (num: number) => void,
      onHire: (id: string) => void,
      onFire: (id: string) => void,
      onToggleDuty: (id: string) => void,
      onAdjustWage: (id: string, delta: number) => void,
      onUpgradeFurniture?: (uid: string) => void,
      onCleanFurnitureTable?: (uid: string) => void,
      onToggleFurniturePlaced?: (uid: string) => void,
      onSignConstructionContract?: (contract: ConstructionContractDef) => void,
      onAdvanceProgressionStage?: () => void,
      onClaimFamilyQuest?: (famId: string) => void,
    ) {
      const modal = el('mgmtModal');
      if (modal.hidden) {
        hud.showManagement(
          hotel,
          staff,
          familyRegistry,
          furniture,
          construction,
          progression,
          money,
          reputation,
          onCleanRoom,
          onHire,
          onFire,
          onToggleDuty,
          onAdjustWage,
          onUpgradeFurniture,
          onCleanFurnitureTable,
          onToggleFurniturePlaced,
          onSignConstructionContract,
          onAdvanceProgressionStage,
          onClaimFamilyQuest,
        );
      } else {
        hud.hideManagement();
      }
    },
  };
  hud.setHeld(null);
  return hud;
}
