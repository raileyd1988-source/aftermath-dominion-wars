import { March, MarchManager, MarchType } from './March';
import { Alliance } from './Alliance';
import { Coordinate } from '../shared/types';
import { ArmyComposition } from './Troops';
import { CommanderInstance } from './Commander';

export interface RallyMember {
  playerId: string;
  marchId: string;
  troops: number;
  joinedAt: Date;
  status: 'pending' | 'arrived' | 'engaged' | 'retreated';
}

export interface RallyConfig {
  leaderId: string;
  targetLocation: Coordinate;
  targetPlayerId?: string;
  targetBossId?: string;
  type: 'assault' | 'defense' | 'siege' | 'hunt';
  maxParticipants: number;
  duration: number; // seconds before auto-cancel
  minimumMembers: number;
}

export class Rally {
  id: string;
  alliance: Alliance;
  config: RallyConfig;
  members: Map<string, RallyMember>;
  marches: Map<string, March>;
  status: 'forming' | 'gathering' | 'marching' | 'engaged' | 'completed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  targetArrivalTime?: Date;
  casualties: Map<string, number>; // playerId -> casualties
  rewards?: { [key: string]: number };
  leaderBonus: number; // Leader coordination bonus

  constructor(id: string, alliance: Alliance, config: RallyConfig) {
    this.id = id;
    this.alliance = alliance;
    this.config = config;
    this.members = new Map();
    this.marches = new Map();
    this.status = 'forming';
    this.createdAt = new Date();
    this.casualties = new Map();
    this.leaderBonus = 0;
  }

  /**
   * Add player to rally
   */
  addMember(playerId: string, marchId: string, troops: number): boolean {
    if (this.members.size >= this.config.maxParticipants) return false;
    if (this.members.has(playerId)) return false;
    if (this.status !== 'forming') return false;

    this.members.set(playerId, {
      playerId,
      marchId,
      troops,
      joinedAt: new Date(),
      status: 'pending',
    });

    return true;
  }

  /**
   * Remove member from rally
   */
  removeMember(playerId: string): boolean {
    return this.members.delete(playerId);
  }

  /**
   * Check if minimum members to start
   */
  hasMinimumMembers(): boolean {
    return this.members.size >= this.config.minimumMembers;
  }

  /**
   * Start rally - all members begin marching
   */
  startRally(): boolean {
    if (this.status !== 'forming') return false;
    if (!this.hasMinimumMembers()) return false;

    this.status = 'marching';
    this.startedAt = new Date();

    // Calculate arrival time based on fastest march
    let fastestArrival = Number.MAX_VALUE;

    for (const member of this.members.values()) {
      const march = this.marches.get(member.marchId);
      if (march && march.arrivalTime) {
        fastestArrival = Math.min(fastestArrival, march.arrivalTime.getTime());
      }
    }

    if (fastestArrival !== Number.MAX_VALUE) {
      this.targetArrivalTime = new Date(fastestArrival);
    }

    return true;
  }

  /**
   * Rally arrives at target
   */
  arriveAtTarget(): boolean {
    if (this.status !== 'marching') return false;

    this.status = 'engaged';

    for (const member of this.members.values()) {
      member.status = 'arrived';
    }

    return true;
  }

  /**
   * Complete rally
   */
  completeRally(): boolean {
    if (this.status !== 'engaged') return false;

    this.status = 'completed';
    this.completedAt = new Date();

    return true;
  }

  /**
   * Cancel rally
   */
  cancelRally(): boolean {
    if (this.status !== 'forming') return false;

    this.status = 'cancelled';
    this.completedAt = new Date();

    return true;
  }

  /**
   * Record casualties for a member
   */
  recordCasualties(playerId: string, casualties: number): void {
    this.casualties.set(playerId, (this.casualties.get(playerId) || 0) + casualties);
  }

  /**
   * Get total rally troop count
   */
  getTotalTroops(): number {
    return Array.from(this.members.values()).reduce((sum, m) => sum + m.troops, 0);
  }

  /**
   * Get total casualties
   */
  getTotalCasualties(): number {
    return Array.from(this.casualties.values()).reduce((sum, c) => sum + c, 0);
  }

  /**
   * Get rally stats
   */
  getStats(): {
    participants: number;
    totalTroops: number;
    totalCasualties: number;
    survivalRate: number;
    duration: number;
  } {
    const totalTroops = this.getTotalTroops();
    const totalCasualties = this.getTotalCasualties();

    return {
      participants: this.members.size,
      totalTroops,
      totalCasualties,
      survivalRate: totalTroops > 0 ? (totalTroops - totalCasualties) / totalTroops : 1,
      duration: this.completedAt ? (this.completedAt.getTime() - this.createdAt.getTime()) / 1000 : 0,
    };
  }
}

export class RallyManager {
  alliance: Alliance;
  rallies: Map<string, Rally>;
  rallyCounter: number;

  constructor(alliance: Alliance) {
    this.alliance = alliance;
    this.rallies = new Map();
    this.rallyCounter = 0;
  }

  /**
   * Create a new rally
   */
  createRally(
    leaderId: string,
    targetLocation: Coordinate,
    type: 'assault' | 'defense' | 'siege' | 'hunt',
    targetPlayerId?: string,
    targetBossId?: string
  ): Rally | null {
    const leader = this.alliance.members.get(leaderId);
    if (!leader || leader.rank < 4) return null; // Only R4/R5 can start rallies

    const config: RallyConfig = {
      leaderId,
      targetLocation,
      targetPlayerId,
      targetBossId,
      type,
      maxParticipants: 20, // Default 20 participants per rally
      duration: 86400, // 24 hours
      minimumMembers: 2,
    };

    const rallyId = `rally-${this.alliance.id}-${this.rallyCounter++}`;
    const rally = new Rally(rallyId, this.alliance, config);

    this.rallies.set(rallyId, rally);
    return rally;
  }

  /**
   * Get rally by ID
   */
  getRally(rallyId: string): Rally | null {
    return this.rallies.get(rallyId) || null;
  }

  /**
   * Get active rallies
   */
  getActiveRallies(): Rally[] {
    return Array.from(this.rallies.values()).filter(
      r => r.status === 'forming' || r.status === 'marching' || r.status === 'engaged'
    );
  }

  /**
   * Get rallies by leader
   */
  getRalliesByLeader(leaderId: string): Rally[] {
    return Array.from(this.rallies.values()).filter(r => r.config.leaderId === leaderId);
  }

  /**
   * Get rallies player is in
   */
  getPlayerRallies(playerId: string): Rally[] {
    return Array.from(this.rallies.values()).filter(r => r.members.has(playerId));
  }

  /**
   * Get rally history
   */
  getRallyHistory(limit: number = 50): Rally[] {
    return Array.from(this.rallies.values())
      .filter(r => r.status === 'completed' || r.status === 'cancelled')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, limit);
  }
}
