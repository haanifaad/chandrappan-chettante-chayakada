import { RecipeId } from './recipes';

export interface BusinessData {
  id: number;
  ownerId: string | null;
  ownerName: string;
  name: string;
  locationName: string;
  money: number;
  reputation: number;
  cleanliness: number;
  isOpen: boolean;
  menuPricing: { [r in RecipeId]?: number };
  inventory: { [ingredient: string]: number };
  upgrades: string[];
  hasLodge: boolean;
  lodgeOccupancy: number;
  employees: { name: string; role: 'cook' | 'cleaner' | 'waiter'; wage: number }[];
}

export const DEFAULT_BUSINESS_NAMES = [
  'Chandrappan Chettante Chayakkada',
  'Valley View Chayakkada',
  'Hilltop Tea Stall',
  'Highland Lodge & Chayakkada',
];

export const DEFAULT_RECIPE_PRICES: { [r in RecipeId]?: number } = {
  chaya: 12,
  kattan: 8,
  coffee: 15,
  pazhampori: 15,
  parippuvada: 12,
  dosa: 25,
  puttu: 30,
};

export class BusinessManager {
  businesses = new Map<number, BusinessData>();

  constructor() {
    this.initDefaultBusinesses();
  }

  private initDefaultBusinesses() {
    // Business 0: Main shop
    this.businesses.set(0, {
      id: 0,
      ownerId: 'local',
      ownerName: 'Chandrappan',
      name: DEFAULT_BUSINESS_NAMES[0],
      locationName: 'Roadside Junction',
      money: 100,
      reputation: 5.0,
      cleanliness: 85,
      isOpen: true,
      menuPricing: { ...DEFAULT_RECIPE_PRICES },
      inventory: { tea: 40, milk: 30, sugar: 30, flour: 25, banana: 20 },
      upgrades: [],
      hasLodge: false,
      lodgeOccupancy: 0,
      employees: [{ name: 'Velappan', role: 'cleaner', wage: 120 }],
    });

    // Business 1: Valley View
    this.businesses.set(1, {
      id: 1,
      ownerId: null,
      ownerName: 'Available for Lease',
      name: DEFAULT_BUSINESS_NAMES[1],
      locationName: 'Tea Valley Viewpoint',
      money: 80,
      reputation: 4.2,
      cleanliness: 75,
      isOpen: false,
      menuPricing: { ...DEFAULT_RECIPE_PRICES, chaya: 15, pazhampori: 18 },
      inventory: { tea: 25, milk: 20, sugar: 20, flour: 15, banana: 15 },
      upgrades: [],
      hasLodge: false,
      lodgeOccupancy: 0,
      employees: [],
    });

    // Business 2: Hilltop Stall
    this.businesses.set(2, {
      id: 2,
      ownerId: null,
      ownerName: 'Available for Lease',
      name: DEFAULT_BUSINESS_NAMES[2],
      locationName: 'Hilltop Pine Ridge',
      money: 60,
      reputation: 4.0,
      cleanliness: 70,
      isOpen: false,
      menuPricing: { ...DEFAULT_RECIPE_PRICES, kattan: 10, parippuvada: 14 },
      inventory: { tea: 20, milk: 15, sugar: 15, flour: 10, banana: 10 },
      upgrades: [],
      hasLodge: false,
      lodgeOccupancy: 0,
      employees: [],
    });

    // Business 3: Highland Lodge & Chayakkada
    this.businesses.set(3, {
      id: 3,
      ownerId: null,
      ownerName: 'Available for Lease',
      name: DEFAULT_BUSINESS_NAMES[3],
      locationName: 'Highland Tourist Lodge',
      money: 250,
      reputation: 4.8,
      cleanliness: 90,
      isOpen: false,
      menuPricing: { ...DEFAULT_RECIPE_PRICES, dosa: 30 },
      inventory: { tea: 50, milk: 40, sugar: 40, flour: 35, banana: 30 },
      upgrades: ['lodge_license'],
      hasLodge: true,
      lodgeOccupancy: 4,
      employees: [{ name: 'Suku', role: 'waiter', wage: 150 }],
    });
  }

  get(id: number): BusinessData | undefined {
    return this.businesses.get(id);
  }

  getAll(): BusinessData[] {
    return [...this.businesses.values()];
  }

  getOpenBusinesses(): BusinessData[] {
    return [...this.businesses.values()].filter((b) => b.isOpen);
  }

  claimBusiness(businessId: number, playerId: string, playerName: string): boolean {
    const b = this.businesses.get(businessId);
    if (!b) return false;
    b.ownerId = playerId;
    b.ownerName = playerName;
    b.isOpen = true;
    return true;
  }

  setOpen(businessId: number, isOpen: boolean) {
    const b = this.businesses.get(businessId);
    if (b) b.isOpen = isOpen;
  }

  setPrice(businessId: number, recipe: RecipeId, price: number) {
    const b = this.businesses.get(businessId);
    if (b) b.menuPricing[recipe] = Math.max(1, Math.min(100, price));
  }

  tradeGoods(fromId: number, toId: number, item: string, qty: number, totalCost: number): boolean {
    const bFrom = this.businesses.get(fromId);
    const bTo = this.businesses.get(toId);
    if (!bFrom || !bTo) return false;

    if ((bFrom.inventory[item] || 0) < qty) return false;
    if (bTo.money < totalCost) return false;

    bFrom.inventory[item] -= qty;
    bTo.inventory[item] = (bTo.inventory[item] || 0) + qty;
    bTo.money -= totalCost;
    bFrom.money += totalCost;
    return true;
  }

  serialize(): BusinessData[] {
    return this.getAll();
  }

  applySnapshot(list: BusinessData[]) {
    for (const b of list) {
      this.businesses.set(b.id, { ...b });
    }
  }
}
