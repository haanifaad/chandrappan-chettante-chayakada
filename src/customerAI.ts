import * as THREE from 'three';
import { BusinessManager } from './businesses';
import { CustomerType } from './customers';
import { RecipeId } from './recipes';

export interface CustomerChoiceContext {
  customerType: CustomerType;
  desiredRecipe: RecipeId;
  spawnPoint: THREE.Vector3;
  businessManager: BusinessManager;
  queueCounts: Map<number, number>;
  businessCenters: Map<number, THREE.Vector3>;
}

export class SharedCustomerAI {
  /**
   * Determine the most attractive business for a spawning customer based on:
   * distance, reputation, price, queue length, and customer archetype preferences.
   */
  static selectBestBusiness(ctx: CustomerChoiceContext): number {
    const openBusinesses = ctx.businessManager.getOpenBusinesses();
    if (openBusinesses.length === 0) return 0; // fallback to default shop
    if (openBusinesses.length === 1) return openBusinesses[0].id;

    let bestId = openBusinesses[0].id;
    let highestUtility = -Infinity;

    for (const b of openBusinesses) {
      const center = ctx.businessCenters.get(b.id) ?? new THREE.Vector3(0, 0, 0);
      const dist = ctx.spawnPoint.distanceTo(center);

      // Distance factor (closer is preferred)
      const distScore = 1.0 / (1.0 + dist * 0.04);

      // Reputation factor
      const repScore = (b.reputation / 5.0) * 1.5;

      // Price sensitivity varies by customer type:
      // Students and auto drivers are price-sensitive; tourists and office workers care more about rep/cleanliness
      const price = b.menuPricing[ctx.desiredRecipe] ?? 15;
      let priceSensitivity = 0.05;
      if (ctx.customerType.id === 'student' || ctx.customerType.id === 'auto') {
        priceSensitivity = 0.09;
      } else if (ctx.customerType.id === 'tourist') {
        priceSensitivity = 0.02;
      }
      const pricePenalty = price * priceSensitivity;

      // Waiting time / Queue penalty
      const queueCount = ctx.queueCounts.get(b.id) ?? 0;
      const queuePenalty = queueCount * 0.35;

      // Cleanliness bonus
      const cleanBonus = (b.cleanliness / 100) * 0.4;

      // Calculate final utility score
      const utility = distScore * 1.2 + repScore - pricePenalty - queuePenalty + cleanBonus;

      if (utility > highestUtility) {
        highestUtility = utility;
        bestId = b.id;
      }
    }

    return bestId;
  }
}
