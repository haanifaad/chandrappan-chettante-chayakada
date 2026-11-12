import { LifestyleManager } from './lifestyle';
import { GameClock } from './time';

export type ShopBusinessPhase = 'open' | 'closing' | 'closed' | 'sleeping';

export interface DailyLedger {
  day: number;
  grossRevenue: number;
  itemSales: { [recipeId: string]: number };
  customersServed: number;
  customersLost: number;
  ingredientCost: number;
  employeeWages: number;
  utilityExpenses: number;
  cleanlinessBonus: number;
  netProfit: number;
  openingBalance: number;
  closingBalance: number;
  reputation: number;
}

export class BusinessCycleManager {
  phase: ShopBusinessPhase = 'open';
  cleanlinessScore = 80; // 0 to 100
  lightsOff = false;
  stoveOff = false;
  shopLocked = false;

  private daySales: { [recipeId: string]: number } = {};
  private dayRevenue = 0;
  private customersServed = 0;
  private customersLost = 0;
  private lastLedger: DailyLedger | null = null;

  recordSale(recipeId: string, price: number) {
    this.daySales[recipeId] = (this.daySales[recipeId] || 0) + 1;
    this.dayRevenue += price;
    this.customersServed++;
  }

  recordLostCustomer() {
    this.customersLost++;
  }

  recordCleaning() {
    this.cleanlinessScore = Math.min(100, this.cleanlinessScore + 25);
  }

  startClosing(): { success: boolean; message: string } {
    if (this.phase !== 'open') {
      return { success: false, message: 'Shop is not currently open.' };
    }
    this.phase = 'closing';
    return {
      success: true,
      message: 'Shop closing initiated. Finish pending orders, clean tables, and shut down equipment.',
    };
  }

  toggleLights(): boolean {
    this.lightsOff = !this.lightsOff;
    return this.lightsOff;
  }

  toggleStove(): boolean {
    this.stoveOff = !this.stoveOff;
    return this.stoveOff;
  }

  lockShop(): { success: boolean; message: string } {
    if (this.phase !== 'closing' && this.phase !== 'closed') {
      return { success: false, message: 'Close the shop before locking up.' };
    }
    this.shopLocked = true;
    this.phase = 'closed';
    return {
      success: true,
      message: 'Shop shutters closed and padlock locked. Head home to the hillside house to rest.',
    };
  }

  /**
   * Finalize the day's financials and advance to the next morning.
   */
  processSleepAndAdvanceDay(
    currentDay: number,
    currentMoney: number,
    currentReputation: number,
    clock: GameClock,
    lifestyle: LifestyleManager,
  ): DailyLedger {
    this.phase = 'sleeping';

    // Financial calculations
    const ingredientCost = Math.round(this.dayRevenue * 0.32);
    const employeeWages = this.customersServed > 0 ? 120 : 0;
    const utilityExpenses = 45; // firewood, kerosene, electricity
    const cleanlinessBonus = this.cleanlinessScore >= 90 ? 50 : 0;

    const netProfit = this.dayRevenue - ingredientCost - employeeWages - utilityExpenses + cleanlinessBonus;
    const closingBalance = Math.max(0, currentMoney + netProfit);

    const ledger: DailyLedger = {
      day: currentDay,
      grossRevenue: this.dayRevenue,
      itemSales: { ...this.daySales },
      customersServed: this.customersServed,
      customersLost: this.customersLost,
      ingredientCost,
      employeeWages,
      utilityExpenses,
      cleanlinessBonus,
      netProfit,
      openingBalance: currentMoney,
      closingBalance,
      reputation: currentReputation,
    };
    this.lastLedger = ledger;

    // Reset daily counters for next morning
    this.daySales = {};
    this.dayRevenue = 0;
    this.customersServed = 0;
    this.customersLost = 0;
    this.cleanlinessScore = Math.max(50, this.cleanlinessScore - 15); // natural dust
    this.lightsOff = false;
    this.stoveOff = false;
    this.shopLocked = false;
    this.phase = 'open';

    // Sleep restores condition
    lifestyle.sleepRest();

    // Advance simulation clock to 6:30 AM next morning
    clock.reset(currentDay + 1, 6 * 60 + 30);

    return ledger;
  }

  get ledger(): DailyLedger | null {
    return this.lastLedger;
  }
}
