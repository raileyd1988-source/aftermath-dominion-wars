import { Commander } from '../shared/types';

export interface CommanderSkill {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'hp' | 'march' | 'march_defense' | 'gathering' | 'training' | 'special';
  value: number; // Percentage bonus
  tier: number; // Which level unlocks this skill
}

export interface CommanderAbility {
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  effect: string;
}

export interface CommanderProgression {
  level: number;
  experience: number;
  fragmentsOwned: number;
  fragmentsNeeded: number; // Fragments needed for next star level
  starLevel: number; // 1-5 or 1-6 stars
}

export class CommanderClass {
  id: string;
  name: string;
  title: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  faction: string; // e.g., "Survivor", "Military", "Scientist", "Infected"
  portrait: string;
  baseStats: {
    attack: number;
    defense: number;
    hp: number;
    march: number;
    gathering: number;
  };
  skills: CommanderSkill[];
  abilities: CommanderAbility[];
  craftingCost?: number; // NEXUS materials if craftable
  dropLocations?: string[]; // Boss drops, events, etc.
  releaseDate: Date;
  isSeasonalExclusive: boolean;
  seasonalEndDate?: Date;

  constructor(id: string, name: string, title: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') {
    this.id = id;
    this.name = name;
    this.title = title;
    this.rarity = rarity;
    this.description = '';
    this.faction = 'Survivor';
    this.portrait = '';
    this.baseStats = { attack: 100, defense: 100, hp: 100, march: 100, gathering: 100 };
    this.skills = [];
    this.abilities = [];
    this.releaseDate = new Date();
    this.isSeasonalExclusive = false;
  }

  /**
   * Add skill to commander
   */
  addSkill(skill: CommanderSkill): void {
    this.skills.push(skill);
    this.skills.sort((a, b) => a.tier - b.tier);
  }

  /**
   * Add ability to commander
   */
  addAbility(ability: CommanderAbility): void {
    this.abilities.push(ability);
  }

  /**
   * Get skills available at a specific level
   */
  getSkillsAtLevel(level: number): CommanderSkill[] {
    return this.skills.filter(s => s.tier <= level);
  }

  /**
   * Calculate stat at specific level
   */
  getStatAtLevel(statName: keyof typeof this.baseStats, level: number): number {
    const baseStat = this.baseStats[statName];
    const scalePerLevel = baseStat * 0.1; // 10% growth per level
    return baseStat + scalePerLevel * level;
  }
}

export class CommanderInstance {
  id: string;
  commander: CommanderClass;
  owner: string; // playerId
  progression: CommanderProgression;
  currentLevel: number;
  experience: number;
  starLevel: number;
  fragmentsOwned: number;
  equipment: Map<string, string>; // slot -> equipmentId
  isMarching: boolean;
  acquiredDate: Date;

  constructor(id: string, commander: CommanderClass, owner: string) {
    this.id = id;
    this.commander = commander;
    this.owner = owner;
    this.currentLevel = 1;
    this.experience = 0;
    this.starLevel = 1;
    this.fragmentsOwned = 0;
    this.equipment = new Map();
    this.isMarching = false;
    this.acquiredDate = new Date();

    this.progression = {
      level: 1,
      experience: 0,
      fragmentsOwned: 0,
      fragmentsNeeded: 10, // 10 fragments for 2-star
      starLevel: 1,
    };
  }

  /**
   * Add experience to commander
   */
  addExperience(amount: number): boolean {
    this.experience += amount;
    this.progression.experience += amount;

    // Calculate level ups (e.g., 1000 exp per level)
    const levelThreshold = 1000;
    const newLevel = Math.floor(this.experience / levelThreshold) + 1;

    if (newLevel > this.currentLevel) {
      this.currentLevel = newLevel;
      return true; // Level up occurred
    }

    return false;
  }

  /**
   * Add fragments to commander
   */
  addFragments(amount: number): boolean {
    this.fragmentsOwned += amount;
    this.progression.fragmentsOwned += amount;

    // Check if can promote to next star
    if (this.fragmentsOwned >= this.progression.fragmentsNeeded && this.starLevel < 5) {
      return this.promote();
    }

    return false;
  }

  /**
   * Promote commander to next star level
   */
  promote(): boolean {
    if (this.starLevel >= 5) return false;
    if (this.fragmentsOwned < this.progression.fragmentsNeeded) return false;

    this.fragmentsOwned -= this.progression.fragmentsNeeded;
    this.starLevel++;
    this.progression.starLevel = this.starLevel;
    this.progression.fragmentsOwned = this.fragmentsOwned;

    // Increase fragments needed for next star
    this.progression.fragmentsNeeded = 10 + this.starLevel * 5;

    return true;
  }

  /**
   * Equip item on commander
   */
  equipItem(slot: string, equipmentId: string): boolean {
    // Validate slot exists and equipment is valid
    this.equipment.set(slot, equipmentId);
    return true;
  }

  /**
   * Get commander's total attack bonus
   */
  getTotalAttackBonus(): number {
    const baseAttack = this.commander.getStatAtLevel('attack', this.currentLevel);
    const levelBonus = baseAttack * (this.starLevel - 1) * 0.2; // +20% per star
    return baseAttack + levelBonus;
  }

  /**
   * Get commander's total defense bonus
   */
  getTotalDefenseBonus(): number {
    const baseDefense = this.commander.getStatAtLevel('defense', this.currentLevel);
    const levelBonus = baseDefense * (this.starLevel - 1) * 0.2;
    return baseDefense + levelBonus;
  }

  /**
   * Get available skills at current level
   */
  getAvailableSkills(): CommanderSkill[] {
    return this.commander.getSkillsAtLevel(this.currentLevel);
  }
}

export class CommanderCollection {
  playerId: string;
  commanders: Map<string, CommanderInstance>;
  availableCommanders: Map<string, CommanderClass>; // All obtainable commanders

  constructor(playerId: string) {
    this.playerId = playerId;
    this.commanders = new Map();
    this.availableCommanders = new Map();
  }

  /**
   * Acquire a commander
   */
  addCommander(commander: CommanderClass): CommanderInstance {
    const instanceId = `cmdr-${this.playerId}-${this.commanders.size}`;
    const instance = new CommanderInstance(instanceId, commander, this.playerId);
    this.commanders.set(instanceId, instance);
    return instance;
  }

  /**
   * Get commander instance by ID
   */
  getCommander(commanderId: string): CommanderInstance | null {
    return this.commanders.get(commanderId) || null;
  }

  /**
   * Get all commanders
   */
  getAllCommanders(): CommanderInstance[] {
    return Array.from(this.commanders.values());
  }

  /**
   * Get commanders by rarity
   */
  getCommandersByRarity(rarity: string): CommanderInstance[] {
    return this.getAllCommanders().filter(c => c.commander.rarity === rarity);
  }

  /**
   * Get commanders sorted by level
   */
  getCommandersSortedByLevel(): CommanderInstance[] {
    return this.getAllCommanders().sort((a, b) => b.currentLevel - a.currentLevel);
  }

  /**
   * Calculate total commander power
   */
  getTotalCommanderPower(): number {
    return this.getAllCommanders().reduce((total, cmdr) => {
      const attack = cmdr.getTotalAttackBonus();
      const defense = cmdr.getTotalDefenseBonus();
      return total + attack + defense;
    }, 0);
  }
}
