import { Alliance } from './Alliance';
import { Coordinate } from '../shared/types';

export interface SquadMember {
  playerId: string;
  commander: string;
  troops: number;
  status: 'ready' | 'marching' | 'engaged' | 'retreating';
  joinedAt: Date;
}

export interface SquadOrder {
  type: 'attack' | 'move' | 'hold' | 'surround' | 'retreat' | 'defend';
  targetLocation?: Coordinate;
  targetPlayerId?: string;
  timestamp: Date;
  executedAt?: Date;
}

export interface SquadCombatLog {
  squadId: string;
  turn: number;
  leader: string;
  members: SquadMember[];
  enemy: any; // Enemy commander or boss
  events: CombatEvent[];
  duration: number; // seconds
  result: 'victory' | 'defeat' | 'retreat' | 'ongoing';
}

export interface CombatEvent {
  timestamp: Date;
  type: 'attack' | 'ability' | 'heal' | 'buff' | 'debuff' | 'death' | 'retreat';
  actor: string; // playerId or enemy name
  target: string;
  damage?: number;
  effect?: string;
}

export class HuntSquad {
  id: string;
  alliance: Alliance;
  leaderId: string;
  members: Map<string, SquadMember>;
  target: string | Coordinate; // Enemy commander or PvE target
  targetType: 'player' | 'boss' | 'infection';
  status: 'forming' | 'marching' | 'engaged' | 'completed' | 'disbanded';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  orderHistory: SquadOrder[];
  combatLog?: SquadCombatLog;
  formation: FormationType;
  morale: number; // 0-100
  coordinationBonus: number; // Increases with successful coordinated actions

  constructor(id: string, alliance: Alliance, leaderId: string, target: string | Coordinate, targetType: 'player' | 'boss' | 'infection') {
    this.id = id;
    this.alliance = alliance;
    this.leaderId = leaderId;
    this.members = new Map();
    this.target = target;
    this.targetType = targetType;
    this.status = 'forming';
    this.createdAt = new Date();
    this.orderHistory = [];
    this.formation = 'standard';
    this.morale = 100;
    this.coordinationBonus = 0;
  }

  /**
   * Add member to hunt squad (max 6 members including leader)
   */
  addMember(playerId: string, commander: string, troops: number): boolean {
    if (this.members.size >= 5) return false; // Leader + 5 hunters
    if (this.members.has(playerId)) return false;
    if (this.status !== 'forming') return false;

    this.members.set(playerId, {
      playerId,
      commander,
      troops,
      status: 'ready',
      joinedAt: new Date(),
    });

    return true;
  }

  /**
   * Remove member from squad
   */
  removeMember(playerId: string): boolean {
    if (playerId === this.leaderId && this.status === 'forming') {
      // Disband squad if leader leaves while forming
      this.status = 'disbanded';
      this.members.clear();
      return true;
    }

    return this.members.delete(playerId);
  }

  /**
   * Check if squad has minimum members
   */
  hasMinimumMembers(): boolean {
    return this.members.size >= 2; // Leader + at least 1 hunter
  }

  /**
   * Start march to target
   */
  startMarch(destination: Coordinate): boolean {
    if (this.status !== 'forming') return false;
    if (!this.hasMinimumMembers()) return false;

    this.status = 'marching';
    this.startedAt = new Date();

    // Update all member status
    for (const member of this.members.values()) {
      member.status = 'marching';
    }

    // Record order
    this.orderHistory.push({
      type: 'move',
      targetLocation: destination,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Arrive at destination and engage
   */
  arriveAtTarget(): boolean {
    if (this.status !== 'marching') return false;

    this.status = 'engaged';

    for (const member of this.members.values()) {
      member.status = 'engaged';
    }

    // Initialize combat log
    this.combatLog = {
      squadId: this.id,
      turn: 0,
      leader: this.leaderId,
      members: Array.from(this.members.values()),
      enemy: this.target,
      events: [],
      duration: 0,
      result: 'ongoing',
    };

    return true;
  }

  /**
   * Issue squad order from leader
   */
  issueOrder(orderType: SquadOrder['type'], targetLocation?: Coordinate, targetPlayerId?: string): boolean {
    if (this.leaderId !== this.leaderId) return false; // Only leader can issue orders
    if (this.status !== 'engaged' && this.status !== 'marching') return false;

    const order: SquadOrder = {
      type: orderType,
      targetLocation,
      targetPlayerId,
      timestamp: new Date(),
    };

    this.orderHistory.push(order);

    // Update member status based on order
    switch (orderType) {
      case 'hold':
        for (const member of this.members.values()) {
          member.status = 'ready';
        }
        break;
      case 'attack':
        for (const member of this.members.values()) {
          member.status = 'engaged';
        }
        break;
      case 'surround':
        // Surround formation - increased coordination bonus
        this.coordinationBonus = Math.min(this.coordinationBonus + 10, 50);
        break;
      case 'retreat':
        this.retreat();
        break;
    }

    return true;
  }

  /**
   * Retreat from combat
   */
  retreat(): boolean {
    if (this.status === 'completed') return false;

    this.status = 'completed';
    this.completedAt = new Date();

    for (const member of this.members.values()) {
      member.status = 'retreating';
    }

    if (this.combatLog) {
      this.combatLog.result = 'retreat';
      const duration = (this.completedAt.getTime() - (this.startedAt?.getTime() || 0)) / 1000;
      this.combatLog.duration = duration;
    }

    return true;
  }

  /**
   * Complete combat after victory or defeat
   */
  completeCombat(result: 'victory' | 'defeat'): boolean {
    if (this.status !== 'engaged') return false;

    this.status = 'completed';
    this.completedAt = new Date();

    if (this.combatLog) {
      this.combatLog.result = result;
      const duration = (this.completedAt.getTime() - (this.startedAt?.getTime() || 0)) / 1000;
      this.combatLog.duration = duration;
    }

    return true;
  }

  /**
   * Log combat event
   */
  logCombatEvent(event: CombatEvent): void {
    if (!this.combatLog) return;

    this.combatLog.events.push(event);
    this.combatLog.turn++;

    // Adjust morale based on events
    if (event.type === 'death') {
      this.morale = Math.max(0, this.morale - 10);
    } else if (event.type === 'buff') {
      this.morale = Math.min(100, this.morale + 5);
    }
  }

  /**
   * Set squad formation
   */
  setFormation(formationType: FormationType): boolean {
    if (this.status === 'engaged') return false; // Can't change formation mid-combat

    this.formation = formationType;
    return true;
  }

  /**
   * Get squad statistics
   */
  getSquadStats(): {
    totalMembers: number;
    totalTroops: number;
    averageCommander: string;
    averageMorale: number;
    coordinationBonus: number;
    formationBonus: number;
  } {
    let totalTroops = 0;
    let commanderCount = 0;

    for (const member of this.members.values()) {
      totalTroops += member.troops;
      commanderCount++;
    }

    const formationBonuses: { [key in FormationType]: number } = {
      standard: 0,
      phalanx: 15, // +15% defense
      wedge: 15, // +15% attack
      envelopment: 10, // +10% flanking damage
      testudo: 20, // +20% defense (roman shield formation)
      diamond: 12, // +12% balanced
    };

    return {
      totalMembers: this.members.size,
      totalTroops,
      averageCommander: this.leaderId,
      averageMorale: this.morale,
      coordinationBonus: this.coordinationBonus,
      formationBonus: formationBonuses[this.formation],
    };
  }

  /**
   * Get squad combat rating
   */
  getCombatRating(): number {
    const stats = this.getSquadStats();
    const baseRating = stats.totalTroops * 1.5;
    const moraleModifier = stats.averageMorale / 100;
    const coordinationModifier = 1 + stats.coordinationBonus / 100;
    const formationModifier = 1 + stats.formationBonus / 100;

    return baseRating * moraleModifier * coordinationModifier * formationModifier;
  }
}

export type FormationType = 'standard' | 'phalanx' | 'wedge' | 'envelopment' | 'testudo' | 'diamond';

export class HuntSquadManager {
  alliance: Alliance;
  squads: Map<string, HuntSquad>;
  squadCounter: number;

  constructor(alliance: Alliance) {
    this.alliance = alliance;
    this.squads = new Map();
    this.squadCounter = 0;
  }

  /**
   * Create a new hunt squad
   */
  createSquad(leaderId: string, target: string | Coordinate, targetType: 'player' | 'boss' | 'infection'): HuntSquad | null {
    const leader = this.alliance.members.get(leaderId);
    if (!leader) return null;

    const squadId = `squad-${this.alliance.id}-${this.squadCounter++}`;
    const squad = new HuntSquad(squadId, this.alliance, leaderId, target, targetType);

    // Auto-add leader as first member
    squad.addMember(leaderId, 'leaderCommander', 1000); // Placeholder values

    this.squads.set(squadId, squad);
    return squad;
  }

  /**
   * Get squad by ID
   */
  getSquad(squadId: string): HuntSquad | null {
    return this.squads.get(squadId) || null;
  }

  /**
   * Get all active squads
   */
  getActiveSquads(): HuntSquad[] {
    return Array.from(this.squads.values()).filter(s => s.status !== 'completed' && s.status !== 'disbanded');
  }

  /**
   * Get squads by leader
   */
  getSquadsByLeader(leaderId: string): HuntSquad[] {
    return Array.from(this.squads.values()).filter(s => s.leaderId === leaderId);
  }

  /**
   * Get squads by member
   */
  getSquadsByMember(playerId: string): HuntSquad[] {
    return Array.from(this.squads.values()).filter(s => s.members.has(playerId));
  }

  /**
   * Disband squad
   */
  disbandSquad(squadId: string, performedBy: string): boolean {
    const squad = this.squads.get(squadId);
    if (!squad) return false;
    if (performedBy !== squad.leaderId && performedBy !== this.alliance.leader) return false;
    if (squad.status !== 'forming') return false;

    squad.status = 'disbanded';
    return true;
  }

  /**
   * Get all squad combat reports
   */
  getCombatReports(limit: number = 50): SquadCombatLog[] {
    return Array.from(this.squads.values())
      .filter(s => s.combatLog && s.status === 'completed')
      .map(s => s.combatLog!)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get squad member count
   */
  getActiveMembersCount(): number {
    let count = 0;
    for (const squad of this.getActiveSquads()) {
      count += squad.members.size;
    }
    return count;
  }
}
