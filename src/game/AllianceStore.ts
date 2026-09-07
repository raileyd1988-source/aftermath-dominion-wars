import { Alliance } from './Alliance';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number; // Alliance Credits cost
  category: 'shields' | 'teleports' | 'speedups' | 'resources' | 'stamina' | 'recovery' | 'commander_shards' | 'equipment' | 'vehicle_parts' | 'blueprints' | 'nexus_materials' | 'tokens';
  quantity?: number; // For consumables
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  purchaseLimit?: number; // Max purchases per player
  expiresAt?: Date;
}

export interface StorePurchase {
  playerId: string;
  itemId: string;
  quantity: number;
  totalCost: number;
  purchasedAt: Date;
}

export class AllianceStore {
  alliance: Alliance;
  items: Map<string, StoreItem>;
  purchases: Map<string, StorePurchase[]>; // playerId -> purchases
  level: number; // Store level increases rotation and item availability
  inventory: Map<string, number>; // itemId -> quantity

  constructor(alliance: Alliance) {
    this.alliance = alliance;
    this.items = new Map();
    this.purchases = new Map();
    this.level = 1;
    this.inventory = new Map();
    this.initializeDefaultItems();
  }

  private initializeDefaultItems(): void {
    // Peace Shields
    this.addItem({
      id: 'shield_2h',
      name: '2-Hour Peace Shield',
      description: 'Protect your dominion for 2 hours',
      cost: 100,
      category: 'shields',
    });

    this.addItem({
      id: 'shield_8h',
      name: '8-Hour Peace Shield',
      description: 'Protect your dominion for 8 hours',
      cost: 300,
      category: 'shields',
    });

    this.addItem({
      id: 'shield_24h',
      name: '24-Hour Peace Shield',
      description: 'Protect your dominion for 24 hours',
      cost: 750,
      category: 'shields',
    });

    // Teleports
    this.addItem({
      id: 'teleport_standard',
      name: 'Teleport',
      description: 'Relocate your dominion',
      cost: 200,
      category: 'teleports',
    });

    // Speedups
    this.addItem({
      id: 'speedup_1h',
      name: '1-Hour Speedup',
      description: 'Speed up construction or research by 1 hour',
      cost: 50,
      category: 'speedups',
    });

    // Resources
    this.addItem({
      id: 'resource_pack_food',
      name: 'Food Pack',
      description: 'Receive 10,000 Food',
      cost: 150,
      category: 'resources',
      quantity: 10000,
    });

    // Recovery Boosts
    this.addItem({
      id: 'recovery_boost',
      name: 'Recovery Boost',
      description: 'Increase troop recovery by 25% for 24 hours',
      cost: 200,
      category: 'recovery',
    });

    // Commander Shards
    this.addItem({
      id: 'commander_shard_universal',
      name: 'Universal Commander Shard',
      description: 'Use on any commander',
      cost: 250,
      category: 'commander_shards',
      rarity: 'rare',
    });

    // Dominion Tokens
    this.addItem({
      id: 'dominion_token_100',
      name: 'Dominion Token Bundle',
      description: 'Receive 100 Dominion Tokens',
      cost: 300,
      category: 'tokens',
      quantity: 100,
    });
  }

  /**
   * Add item to store
   */
  addItem(item: StoreItem): void {
    this.items.set(item.id, item);
    if (!this.inventory.has(item.id)) {
      this.inventory.set(item.id, item.quantity || 1);
    }
  }

  /**
   * Remove item from store
   */
  removeItem(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  /**
   * Purchase an item from the store
   */
  purchaseItem(playerId: string, itemId: string, quantity: number = 1): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    // Check if item is still available
    const availableQuantity = this.inventory.get(itemId) || 0;
    if (item.quantity && availableQuantity < quantity) return false;

    // Check purchase limit
    if (item.purchaseLimit) {
      const playerPurchases = this.purchases.get(playerId) || [];
      const itemPurchases = playerPurchases.filter(p => p.itemId === itemId);
      if (itemPurchases.length >= item.purchaseLimit) return false;
    }

    // Check alliance credits
    const totalCost = item.cost * quantity;
    if (this.alliance.credits < totalCost) return false;

    // Process purchase
    this.alliance.spendCredits(totalCost);

    const purchase: StorePurchase = {
      playerId,
      itemId,
      quantity,
      totalCost,
      purchasedAt: new Date(),
    };

    const playerPurchases = this.purchases.get(playerId) || [];
    playerPurchases.push(purchase);
    this.purchases.set(playerId, playerPurchases);

    // Update inventory
    if (item.quantity) {
      this.inventory.set(itemId, availableQuantity - quantity);
    }

    return true;
  }

  /**
   * Level up the store
   */
  levelUp(): boolean {
    this.level++;
    // Trigger refresh of available items
    this.refreshItems();
    return true;
  }

  /**
   * Refresh store items based on level
   */
  private refreshItems(): void {
    // Higher level stores have access to more items and better stock
    // This would be connected to the progression system
  }

  /**
   * Get all available items
   */
  getAvailableItems(): StoreItem[] {
    return Array.from(this.items.values()).filter(item => {
      if (item.expiresAt && item.expiresAt < new Date()) return false;
      return true;
    });
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category: StoreItem['category']): StoreItem[] {
    return this.getAvailableItems().filter(item => item.category === category);
  }

  /**
   * Get player purchase history
   */
  getPlayerPurchaseHistory(playerId: string): StorePurchase[] {
    return this.purchases.get(playerId) || [];
  }

  /**
   * Rotate store items (called periodically)
   */
  rotateItems(): void {
    // Remove expired items
    const now = new Date();
    for (const [itemId, item] of this.items.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.items.delete(itemId);
      }
    }
  }
}

/**
 * NEXUS Vault - Premium tier of store for endgame items
 */
export class DominionVault {
  store: AllianceStore;
  premiumItems: Map<string, StoreItem>;
  legacyItems: Map<string, StoreItem>; // Seasonal equipment from past seasons
  vaultLevel: number;

  constructor(store: AllianceStore) {
    this.store = store;
    this.premiumItems = new Map();
    this.legacyItems = new Map();
    this.vaultLevel = 1;
    this.initializePremiumItems();
  }

  private initializePremiumItems(): void {
    // Premium progression materials
    this.premiumItems.set('legendary_gear_choice', {
      id: 'legendary_gear_choice',
      name: 'Legendary Gear Choice Chest',
      description: 'Choose one legendary gear piece',
      cost: 5000,
      category: 'equipment',
      rarity: 'legendary',
    });

    this.premiumItems.set('nexus_material_bundle', {
      id: 'nexus_material_bundle',
      name: 'NEXUS Material Bundle',
      description: 'Receive 1,000 NEXUS Materials',
      cost: 3000,
      category: 'nexus_materials',
      quantity: 1000,
    });
  }

  /**
   * Get premium vault items
   */
  getPremiumItems(): StoreItem[] {
    return Array.from(this.premiumItems.values());
  }

  /**
   * Get legacy seasonal items
   */
  getLegacyItems(): StoreItem[] {
    return Array.from(this.legacyItems.values());
  }

  /**
   * Add a legacy item to the vault when a new season begins
   */
  archiveSeasonalItem(item: StoreItem): void {
    this.legacyItems.set(item.id, item);
  }
}
