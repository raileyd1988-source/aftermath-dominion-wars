import { TroopArmy, TroopCount } from '../shared/types';

export type TroopClass = 'vanguard' | 'rangers' | 'armor';
export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface TroopStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
  carryCost: number; // Resource cost to field
}

export interface TroopDefinition {
  name: string;
  class: TroopClass;
  tier: TroopTier;
  requiredCCLevel: number;
  stats: TroopStats;
  description: string;
  counterClass?: TroopClass; // What they counter
  weakAgainst?: TroopClass; // What counters them
}

/**
 * Troop definitions database
 */
export const TROOP_DATABASE: Map<string, TroopDefinition> = new Map([
  // VANGUARD - Heavy Infantry/Tanks
  [
    'vanguard_t1',
    {
      name: 'Militia',
      class: 'vanguard',
      tier: 1,
      requiredCCLevel: 1,
      stats: {
        health: 150,
        attack: 60,
        defense: 80,
        speed: 40,
        carryCost: 1,
      },
      description: 'Basic survivor infantry with makeshift armor',
      counterClass: 'rangers',
      weakAgainst: 'armor',
    },
  ],
  [
    'vanguard_t2',
    {
      name: 'Patrolmen',
      class: 'vanguard',
      tier: 2,
      requiredCCLevel: 4,
      stats: {
        health: 200,
        attack: 80,
        defense: 100,
        speed: 45,
        carryCost: 1.2,
      },
      description: 'Trained militia with better equipment',
      counterClass: 'rangers',
      weakAgainst: 'armor',
    },
  ],
  [
    'vanguard_t3',
    {
      name: 'Infantry',
      class: 'vanguard',
      tier: 3,
      requiredCCLevel: 7,
      stats: {
        health: 280,
        attack: 110,
        defense: 130,
        speed: 50,
        carryCost: 1.5,
      },
      description: 'Professional infantry soldiers',
      counterClass: 'rangers',
      weakAgainst: 'armor',
    },
  ],
  [
    'vanguard_t10',
    {
      name: 'NEXUS Wardens',
      class: 'vanguard',
      tier: 10,
      requiredCCLevel: 30,
      stats: {
        health: 2500,
        attack: 1200,
        defense: 1100,
        speed: 120,
        carryCost: 5,
      },
      description: 'Elite soldiers infused with NEXUS power',
      counterClass: 'rangers',
      weakAgainst: 'armor',
    },
  ],

  // RANGERS - Rifles/Snipers
  [
    'rangers_t1',
    {
      name: 'Scavenger Shooters',
      class: 'rangers',
      tier: 1,
      requiredCCLevel: 1,
      stats: {
        health: 100,
        attack: 120,
        defense: 40,
        speed: 60,
        carryCost: 1,
      },
      description: 'Survivors with salvaged firearms',
      counterClass: 'armor',
      weakAgainst: 'vanguard',
    },
  ],
  [
    'rangers_t2',
    {
      name: 'Riflemen',
      class: 'rangers',
      tier: 2,
      requiredCCLevel: 4,
      stats: {
        health: 130,
        attack: 160,
        defense: 50,
        speed: 65,
        carryCost: 1.2,
      },
      description: 'Trained marksmen with military rifles',
      counterClass: 'armor',
      weakAgainst: 'vanguard',
    },
  ],
  [
    'rangers_t10',
    {
      name: 'NEXUS Hunters',
      class: 'rangers',
      tier: 10,
      requiredCCLevel: 30,
      stats: {
        health: 1500,
        attack: 2200,
        defense: 600,
        speed: 180,
        carryCost: 5,
      },
      description: 'Apex marksmen with NEXUS-enhanced weaponry',
      counterClass: 'armor',
      weakAgainst: 'vanguard',
    },
  ],

  // ARMOR - Armored Vehicles
  [
    'armor_t1',
    {
      name: 'Scrap Runners',
      class: 'armor',
      tier: 1,
      requiredCCLevel: 1,
      stats: {
        health: 200,
        attack: 100,
        defense: 60,
        speed: 70,
        carryCost: 2,
      },
      description: 'Improvised armored vehicles from salvage',
      counterClass: 'vanguard',
      weakAgainst: 'rangers',
    },
  ],
  [
    'armor_t2',
    {
      name: 'Technicals',
      class: 'armor',
      tier: 2,
      requiredCCLevel: 4,
      stats: {
        health: 280,
        attack: 140,
        defense: 90,
        speed: 75,
        carryCost: 2.5,
      },
      description: 'Military-grade technical vehicles',
      counterClass: 'vanguard',
      weakAgainst: 'rangers',
    },
  ],
  [
    'armor_t10',
    {
      name: 'NEXUS Destroyers',
      class: 'armor',
      tier: 10,
      requiredCCLevel: 30,
      stats: {
        health: 2200,
        attack: 1800,
        defense: 1500,
        speed: 140,
        carryCost: 6,
      },
      description: 'Heavily armored tanks infused with NEXUS core',
      counterClass: 'vanguard',
      weakAgainst: 'rangers',
    },
  ],
]);

export class Troop {
  definition: TroopDefinition;
  count: number;
  experience: number;
  level: number;
  currentHealth: number;

  constructor(definition: TroopDefinition, count: number = 1) {
    this.definition = definition;
    this.count = count;
    this.experience = 0;
    this.level = 1;
    this.currentHealth = definition.stats.health * count;
  }

  /**
   * Get total stats for all troops in this group
   */
  getTotalStats(): TroopStats {
    return {
      health: this.definition.stats.health * this.count,
      attack: this.definition.stats.attack * this.count,
      defense: this.definition.stats.defense * this.count,
      speed: this.definition.stats.speed,
      carryCost: this.definition.stats.carryCost * this.count,
    };
  }

  /**
   * Take damage
   */
  takeDamage(damage: number): number {
    const actualDamage = Math.max(0, damage - this.definition.stats.defense * this.count * 0.1);
    this.currentHealth -= actualDamage;

    // Calculate casualties
    const perUnitHealth = this.definition.stats.health;
    const unitsKilled = Math.floor(Math.max(0, -this.currentHealth) / perUnitHealth);
    this.count = Math.max(0, this.count - unitsKilled);

    return actualDamage;
  }

  /**
   * Heal troops
   */
  heal(amount: number): number {
    const maxHealth = this.definition.stats.health * this.count;
    const healed = Math.min(maxHealth - this.currentHealth, amount);
    this.currentHealth += healed;
    return healed;
  }

  /**
   * Get survival rate (0-1)
   */
  getSurvivalRate(): number {
    const maxHealth = this.definition.stats.health * this.count;
    return Math.max(0, this.currentHealth / maxHealth);
  }
}

export class ArmyComposition {
  vanguard: Map<TroopTier, Troop>;
  rangers: Map<TroopTier, Troop>;
  armor: Map<TroopTier, Troop>;

  constructor() {
    this.vanguard = new Map();
    this.rangers = new Map();
    this.armor = new Map();
  }

  /**
   * Add troops to army
   */
  addTroops(troopClass: TroopClass, tier: TroopTier, count: number): boolean {
    const troopKey = `${troopClass}_t${tier}`;
    const definition = TROOP_DATABASE.get(troopKey);

    if (!definition) return false;

    const troop = new Troop(definition, count);
    const map = this.getTroopMap(troopClass);

    if (map.has(tier)) {
      const existing = map.get(tier)!;
      existing.count += count;
      existing.currentHealth += definition.stats.health * count;
    } else {
      map.set(tier, troop);
    }

    return true;
  }

  /**
   * Get troop map by class
   */
  private getTroopMap(troopClass: TroopClass): Map<TroopTier, Troop> {
    switch (troopClass) {
      case 'vanguard':
        return this.vanguard;
      case 'rangers':
        return this.rangers;
      case 'armor':
        return this.armor;
    }
  }

  /**
   * Get total troop count
   */
  getTotalCount(): number {
    let total = 0;
    for (const troop of this.vanguard.values()) {
      total += troop.count;
    }
    for (const troop of this.rangers.values()) {
      total += troop.count;
    }
    for (const troop of this.armor.values()) {
      total += troop.count;
    }
    return total;
  }

  /**
   * Get total power rating
   */
  getPowerRating(): number {
    let power = 0;

    for (const troop of this.vanguard.values()) {
      const stats = troop.getTotalStats();
      power += (stats.attack + stats.defense + stats.health) / 3;
    }
    for (const troop of this.rangers.values()) {
      const stats = troop.getTotalStats();
      power += (stats.attack + stats.defense + stats.health) / 3;
    }
    for (const troop of this.armor.values()) {
      const stats = troop.getTotalStats();
      power += (stats.attack + stats.defense + stats.health) / 3;
    }

    return Math.floor(power);
  }

  /**
   * Get all troops
   */
  getAllTroops(): Troop[] {
    const all: Troop[] = [];
    this.vanguard.forEach(t => all.push(t));
    this.rangers.forEach(t => all.push(t));
    this.armor.forEach(t => all.push(t));
    return all;
  }
}
