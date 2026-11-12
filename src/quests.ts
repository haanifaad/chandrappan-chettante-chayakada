import type { RecipeId } from './recipes';

export type QuestType = 'daily' | 'weekly' | 'special';

export interface QuestDef {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  target: number;
  rewardMoney: number;
  rewardReputation: number;
  condition: (event: QuestEvent) => number;
}

export interface QuestEvent {
  kind: 'serve_recipe' | 'serve_customer' | 'family_complete' | 'day_complete' | 'earn_money' | 'streak';
  recipe?: RecipeId;
  customerTypeId?: string;
  count?: number;
  money?: number;
  streak?: number;
}

export interface QuestState {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardMoney: number;
  rewardReputation: number;
}

export const QUEST_DEFINITIONS: QuestDef[] = [
  // Daily Quests
  {
    id: 'daily_chaya_master',
    type: 'daily',
    title: 'Chaya Master of Munnar',
    description: 'Brew and serve 6 glasses of traditional hot Chaya.',
    target: 6,
    rewardMoney: 60,
    rewardReputation: 1,
    condition: (e) => (e.kind === 'serve_recipe' && e.recipe === 'chaya' ? 1 : 0),
  },
  {
    id: 'daily_crisp_snacks',
    type: 'daily',
    title: 'Crispy Snack Rush',
    description: 'Fry and serve 4 hot Pazhamporis or Parippuvadas.',
    target: 4,
    rewardMoney: 50,
    rewardReputation: 1,
    condition: (e) => (e.kind === 'serve_recipe' && (e.recipe === 'pazhampori' || e.recipe === 'parippuvada') ? 1 : 0),
  },
  {
    id: 'daily_happy_elders',
    type: 'daily',
    title: 'Respect the Elders',
    description: 'Serve 3 Ammavans or Appoppans with prompt hospitality.',
    target: 3,
    rewardMoney: 55,
    rewardReputation: 1,
    condition: (e) => (e.kind === 'serve_customer' && (e.customerTypeId === 'ammavan' || e.customerTypeId === 'appoppan') ? 1 : 0),
  },
  {
    id: 'daily_family_treat',
    type: 'daily',
    title: 'Kudumbam Welcome',
    description: 'Completely fulfill a family multi-recipe order.',
    target: 1,
    rewardMoney: 75,
    rewardReputation: 1,
    condition: (e) => (e.kind === 'family_complete' ? 1 : 0),
  },

  // Weekly Quests
  {
    id: 'weekly_revenue_king',
    type: 'weekly',
    title: 'Munnar Hospitality Legend',
    description: 'Earn ₹600 from shop sales across your business run.',
    target: 600,
    rewardMoney: 200,
    rewardReputation: 2,
    condition: (e) => (e.kind === 'earn_money' ? e.money ?? 0 : 0),
  },
  {
    id: 'weekly_tourist_haven',
    type: 'weekly',
    title: 'Tourist Hotspot',
    description: 'Serve 8 visiting tourists or roadtrippers.',
    target: 8,
    rewardMoney: 150,
    rewardReputation: 2,
    condition: (e) => (e.kind === 'serve_customer' && (e.customerTypeId === 'tourist' || e.customerTypeId === 'techie') ? 1 : 0),
  },

  // Special Quests
  {
    id: 'special_streak_star',
    type: 'special',
    title: 'Flawless Kerala Service',
    description: 'Achieve a winning streak of 10 satisfied customers in a row.',
    target: 10,
    rewardMoney: 250,
    rewardReputation: 2,
    condition: (e) => (e.kind === 'streak' && (e.streak ?? 0) >= 10 ? 10 : 0),
  },
];

export class QuestManager {
  quests: QuestState[] = [];

  constructor(savedQuests?: QuestState[]) {
    if (savedQuests && savedQuests.length > 0) {
      this.quests = savedQuests;
    } else {
      this.initDefaultQuests();
    }
  }

  initDefaultQuests() {
    this.quests = QUEST_DEFINITIONS.map((def) => ({
      id: def.id,
      type: def.type,
      title: def.title,
      description: def.description,
      target: def.target,
      progress: 0,
      completed: false,
      claimed: false,
      rewardMoney: def.rewardMoney,
      rewardReputation: def.rewardReputation,
    }));
  }

  processEvent(event: QuestEvent): QuestState[] {
    const newlyCompleted: QuestState[] = [];
    for (const q of this.quests) {
      if (q.completed) continue;
      const def = QUEST_DEFINITIONS.find((d) => d.id === q.id);
      if (!def) continue;

      const delta = def.condition(event);
      if (delta > 0) {
        q.progress = Math.min(q.target, q.progress + delta);
        if (q.progress >= q.target) {
          q.completed = true;
          newlyCompleted.push(q);
        }
      }
    }
    return newlyCompleted;
  }

  claim(questId: string): { money: number; reputation: number } | null {
    const q = this.quests.find((x) => x.id === questId);
    if (!q || !q.completed || q.claimed) return null;
    q.claimed = true;
    return { money: q.rewardMoney, reputation: q.rewardReputation };
  }

  exportState(): QuestState[] {
    return this.quests.map((q) => ({ ...q }));
  }
}
