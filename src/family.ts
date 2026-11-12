import * as THREE from 'three';
import { Customer, CUSTOMER_TYPES } from './customers';
import { RECIPES, RecipeId } from './recipes';
import type { FamilyProfile, FamilyMemberDef } from './familyRegistry';

export interface OrderItemState {
  recipe: RecipeId;
  quantity: number;
  delivered: number;
}

export interface MultiOrder {
  items: OrderItemState[];
  totalPrice: number;
  fullyDelivered: boolean;
}

export interface ActiveFamilyGroup {
  id: string;
  profileId: string;
  name: string;
  origin: string;
  leader: Customer;
  members: Customer[];
  slot: number;
  order: MultiOrder;
  arrivalGreeting: string;
  happyGreeting: string;
  angryGreeting: string;
  chatCooldown: number;
  tipMultiplier: number;
  isSpecialEvent: boolean;
  eventTitle?: string;
}

let familySeq = 1;

/**
 * Aggregates all family member food choices into an itemized multi-order.
 * Even for 6-8 person groups, full family quantities are generated.
 */
export function generateFamilyOrder(members: FamilyMemberDef[], specialEvent?: string): MultiOrder {
  const counts: Partial<Record<RecipeId, number>> = {};

  for (const m of members) {
    // 1 beverage per member (tea, coffee, or kattan)
    const beverage = m.favouriteDishes.find((f) => f === 'chaya' || f === 'kattan' || f === 'coffee') ?? 'chaya';
    counts[beverage] = (counts[beverage] ?? 0) + 1;

    // 70% chance of a hot snack per member
    if (Math.random() < 0.7) {
      const snack = m.favouriteDishes.find((f) => f === 'pazhampori' || f === 'parippuvada' || f === 'puttu' || f === 'dosa') ?? 'pazhampori';
      counts[snack] = (counts[snack] ?? 0) + (snack === 'pazhampori' || snack === 'parippuvada' ? 2 : 1);
    }
  }

  // If special birthday event, add extra festive treats!
  if (specialEvent === 'birthday') {
    counts['pazhampori'] = (counts['pazhampori'] ?? 0) + 2;
  }

  const items: OrderItemState[] = Object.entries(counts).map(([r, q]) => ({
    recipe: r as RecipeId,
    quantity: q ?? 1,
    delivered: 0,
  }));

  const totalPrice = items.reduce((sum, item) => sum + RECIPES[item.recipe].price * item.quantity, 0);

  return {
    items,
    totalPrice,
    fullyDelivered: false,
  };
}

export function formatMultiOrder(order: MultiOrder): string {
  return order.items
    .map((item) => `${item.quantity} ${RECIPES[item.recipe].name}${item.delivered > 0 ? ` (${item.delivered}/${item.quantity}✓)` : ''}`)
    .join(', ');
}

// In-family conversational dialogue lines
const FAMILY_CHATTERS = [
  'Mone, pappa-kku choodu chaya venam ketto.',
  'Pazhampori choodode varunnundu, kaathirikkaam!',
  'Munnar-il vannittu ithu pole oru chayakkada kandoottilla!',
  'Chettan nalla speed-il undakkunnundu!',
  'Maduraram kurachu paranjathalle pappa?',
  'Super scenic mist outside! Take a photo!',
  'Best chaya in Kerala hills, 100% worth the roadtrip.',
];

/**
 * Creates an active world family group.
 * PERFORMANCE-AWARE: To ensure smooth 60 FPS gameplay, active 3D character avatars are capped at
 * 3-4 physical models representing the cohort, while order quantities reflect the full family!
 */
export function createActiveFamily(
  profile: FamilyProfile,
  slot: number,
  leaderPos: THREE.Vector3,
  patienceMul: number,
  fromSide: number,
  start?: THREE.Vector3,
): ActiveFamilyGroup {
  const famId = `fam_${familySeq++}_${profile.id}`;
  const members: Customer[] = [];
  const multiOrder = generateFamilyOrder(profile.members, profile.specialEvent);

  // Performance cap: limit physical 3D scene avatars to max 4 members per family
  const visualMembers = profile.members.slice(0, 4);

  // Offsets for natural group clustering around the counter and benches
  const offsets = [
    new THREE.Vector3(0, 0, 0),                 // Leader at counter slot
    new THREE.Vector3(0.55, 0, 0.28),           // Companion 1 right flank
    new THREE.Vector3(-0.52, 0, 0.36),          // Companion 2 left flank
    new THREE.Vector3(0.05, 0, 0.7),            // Companion 3 behind
  ];

  visualMembers.forEach((memberDef, index) => {
    const type = CUSTOMER_TYPES.find((t) => t.id === memberDef.typeId) ?? CUSTOMER_TYPES[0];
    const itemOrder = multiOrder.items[index % multiOrder.items.length].recipe;
    const offset = offsets[index] ?? new THREE.Vector3(0, 0, 0);

    const targetPos = leaderPos.clone().add(offset);
    const memberStart = start ? start.clone().add(offset) : undefined;

    // Families chat and have higher collective patience
    const c = new Customer(
      type,
      itemOrder,
      slot,
      targetPos,
      patienceMul * 1.45,
      fromSide,
      memberStart,
      0,
      memberDef.customLook,
    );

    c.famId = famId;
    c.famLead = index === 0;
    c.familyName = profile.name;
    c.roleInFamily = memberDef.relation;
    c.multiOrder = multiOrder.items;

    members.push(c);
  });

  const leader = members[0];
  const orderSummary = formatMultiOrder(multiOrder);
  leader.line = `${profile.name}: ${orderSummary}`;

  // Tip scaling: wealthy families tip +40%, budget families +10%, moderate +25%
  const tipMultiplier = profile.budgetTier === 'wealthy' ? 1.4 : profile.budgetTier === 'budget' ? 1.1 : 1.25;

  return {
    id: famId,
    profileId: profile.id,
    name: profile.name,
    origin: profile.origin,
    leader,
    members,
    slot,
    order: multiOrder,
    arrivalGreeting: profile.arrivalGreeting,
    happyGreeting: profile.happyGreeting,
    angryGreeting: profile.angryGreeting,
    chatCooldown: 8 + Math.random() * 6,
    tipMultiplier,
    isSpecialEvent: profile.specialEvent !== 'none',
    eventTitle: profile.specialEvent === 'birthday' ? '🎂 Birthday Celebration' : undefined,
  };
}

/** Ticks periodic family member chatter */
export function tickFamilyChatter(group: ActiveFamilyGroup, dt: number) {
  group.chatCooldown -= dt;
  if (group.chatCooldown <= 0) {
    group.chatCooldown = 12 + Math.random() * 10;
    // Pick a non-leader companion to say something
    const speaker = group.members[Math.floor(Math.random() * group.members.length)];
    if (speaker && speaker.waiting && !speaker.resolved) {
      const line = FAMILY_CHATTERS[Math.floor(Math.random() * FAMILY_CHATTERS.length)];
      speaker.say(line, 3.5);
    }
  }
}
