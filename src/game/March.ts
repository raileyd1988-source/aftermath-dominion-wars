import { Coordinate } from '../shared/types';
import { ArmyComposition } from './Troops';
import { CommanderInstance } from './Commander';

export type MarchType = 'assault' | 'hunter' | 'siege' | 'extermination' | 'guardian' | 'logistics' | 'rally' | 'invasion';
export type MarchStatus = 'preparing' | 'marching' | 'arrived' | 'returning' | 'completed' | 'recalled';

export interface MarchConfig {
  type: MarchType;
  speed: number; // tiles per minute
  carryCapacity: number; // Resource capacity
  maxDuration: number; // seconds before auto-return
}

export const MARCH_CONFIGS: Map<MarchType, MarchConfig> = new Map([
  [
    'assault',
    {
      type: 'assault',
      speed: 10,
      carryCapacity: 0,
      maxDuration: 7200, // 2 hours
    },
  ],
  [
    'hunter',
    {
      type: 'hunter',
      speed: 12,
      carryCapacity: 0,
      maxDuration: 3600, // 1 hour
    },
  ],
  [
    'siege',
    {
      type: 'siege',
      speed: 6,
      carryCapacity: 0,
      maxDuration: 14400, // 4 hours
    },
  ],
  [
    'logistics',
    {
      type: 'logistics',
      speed: 8,
      carryCapacity: 5000,
      maxDuration: 3600,
    },
  ],
  [
    'guardian',
    {
      type: 'guardian',
      speed: 10,
      carryCapacity: 0,
      maxDuration: 7200,
    },
  ],
]);

export interface MarchArrival {
  marchId: string;
  playerId: string;
  targetLocation: Coordinate;
  targetPlayerId?: string;
  arrivalTime: Date;
  army: ArmyComposition;
}

export class March {
  id: string;
  playerId: string;
  origin: Coordinate;
  destination: Coordinate;
  army: ArmyComposition;
  commander: CommanderInstance;
  type: MarchType;
  status: MarchStatus;
  createdAt: Date;
  departureTime?: Date;
  arrivalTime?: Date;
  returnTime?: Date;
  completionTime?: Date;
  distanceTiles: number;
  travelTime: number; // seconds
  casualties: number;
  loot?: { [key: string]: number };
  targetPlayerId?: string; // For PvP marches
  targetBossId?: string; // For PvE marches
  rally?: string; // Rally ID if part of rally

  constructor(
    id: string,
    playerId: string,
    origin: Coordinate,
    destination: Coordinate,
    army: ArmyComposition,
    commander: CommanderInstance,
    type: MarchType = 'assault'
  ) {
    this.id = id;
    this.playerId = playerId;
    this.origin = origin;
    this.destination = destination;
    this.army = army;
    this.commander = commander;
    this.type = type;
    this.status = 'preparing';
    this.createdAt = new Date();
    this.casualties = 0;

    // Calculate distance and travel time
    this.distanceTiles = this.calculateDistance(origin, destination);
    const config = MARCH_CONFIGS.get(type)!;
    this.travelTime = (this.distanceTiles / config.speed) * 60; // Convert to seconds
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(from: Coordinate, to: Coordinate): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Start the march
   */
  startMarch(): boolean {
    if (this.status !== 'preparing') return false;

    this.status = 'marching';
    this.departureTime = new Date();
    this.arrivalTime = new Date(this.departureTime.getTime() + this.travelTime * 1000);

    return true;
  }

  /**
   * Arrive at destination
   */
  arrive(): boolean {
    if (this.status !== 'marching') return false;

    this.status = 'arrived';
    this.arrivalTime = new Date();

    return true;
  }

  /**
   * Begin return march
   */
  returnHome(): boolean {
    if (this.status !== 'arrived') return false;

    this.status = 'returning';
    this.returnTime = new Date();
    const returnArrival = new Date(this.returnTime.getTime() + this.travelTime * 1000);
    this.completionTime = returnArrival;

    return true;
  }

  /**
   * Complete march and return home
   */
  complete(): boolean {
    if (this.status !== 'returning') return false;

    this.status = 'completed';
    this.completionTime = new Date();

    return true;
  }

  /**
   * Recall march before arrival
   */
  recall(): boolean {
    if (this.status !== 'marching') return false;

    this.status = 'recalled';
    const recallTime = new Date();
    const returnArrival = new Date(recallTime.getTime() + this.travelTime * 1000);
    this.completionTime = returnArrival;

    return true;
  }

  /**
   * Get march progress (0-1)
   */
  getProgress(): number {
    if (this.status !== 'marching' || !this.departureTime || !this.arrivalTime) return 0;

    const elapsed = new Date().getTime() - this.departureTime.getTime();
    const total = this.arrivalTime.getTime() - this.departureTime.getTime();

    return Math.min(elapsed / total, 1);
  }

  /**
   * Get march duration
   */
  getDuration(): number {
    if (!this.departureTime) return 0;
    const endTime = this.completionTime || this.arrivalTime || new Date();
    return (endTime.getTime() - this.departureTime.getTime()) / 1000; // seconds
  }

  /**
   * Check if march can carry resources
   */
  canCarryResources(): boolean {
    const config = MARCH_CONFIGS.get(this.type);
    return config ? config.carryCapacity > 0 : false;
  }

  /**
   * Get remaining carry capacity
   */
  getRemainingCapacity(): number {
    const config = MARCH_CONFIGS.get(this.type);
    if (!config || !this.loot) return config?.carryCapacity || 0;

    const usedCapacity = Object.values(this.loot).reduce((sum, val) => sum + val / 1000, 0); // Approximate
    return Math.max(0, (config.carryCapacity || 0) - usedCapacity);
  }
}

export class MarchManager {
  playerId: string;
  marches: Map<string, March>;
  maxConcurrentMarches: number;
  marchCounter: number;

  constructor(playerId: string, maxConcurrentMarches: number = 5) {
    this.playerId = playerId;
    this.marches = new Map();
    this.maxConcurrentMarches = maxConcurrentMarches;
    this.marchCounter = 0;
  }

  /**
   * Create a new march
   */
  createMarch(
    origin: Coordinate,
    destination: Coordinate,
    army: ArmyComposition,
    commander: CommanderInstance,
    type: MarchType = 'assault'
  ): March | null {
    const activeMarches = Array.from(this.marches.values()).filter(
      m => m.status === 'marching' || m.status === 'arrived'
    );

    if (activeMarches.length >= this.maxConcurrentMarches) {
      return null; // Max concurrent marches reached
    }

    const marchId = `march-${this.playerId}-${this.marchCounter++}`;
    const march = new March(marchId, this.playerId, origin, destination, army, commander, type);
    this.marches.set(marchId, march);

    return march;
  }

  /**
   * Get march by ID
   */
  getMarch(marchId: string): March | null {
    return this.marches.get(marchId) || null;
  }

  /**
   * Get all active marches
   */
  getActiveMarches(): March[] {
    return Array.from(this.marches.values()).filter(
      m => m.status === 'preparing' || m.status === 'marching' || m.status === 'arrived' || m.status === 'returning'
    );
  }

  /**
   * Get marches of specific type
   */
  getMarchesByType(type: MarchType): March[] {
    return Array.from(this.marches.values()).filter(m => m.type === type);
  }

  /**
   * Get incoming marches (from other players)
   */
  getIncomingMarches(): March[] {
    // This would be called from defense manager
    return [];
  }

  /**
   * Get march history
   */
  getMarchHistory(limit: number = 50): March[] {
    return Array.from(this.marches.values())
      .filter(m => m.status === 'completed' || m.status === 'recalled')
      .sort((a, b) => (b.completionTime?.getTime() || 0) - (a.completionTime?.getTime() || 0))
      .slice(0, limit);
  }
}
