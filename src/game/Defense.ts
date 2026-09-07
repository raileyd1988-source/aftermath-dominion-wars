import { Coordinate } from '../shared/types';
import { ArmyComposition } from './Troops';
import { March } from './March';

export interface DefenseArmy {
  location: Coordinate;
  army: ArmyComposition;
  isStationed: boolean;
  level: number; // Defense structure level
}

export interface IncomingAttack {
  marchId: string;
  attackerId: string;
  arrivalTime: Date;
  troopCount: number;
  marchType: string;
  isShielded?: boolean;
}

export class DefenseManager {
  playerId: string;
  location: Coordinate;
  defenseArmy: ArmyComposition;
  garrisonArmy: ArmyComposition; // Stationed troops
  incomingAttacks: Map<string, IncomingAttack>;
  shieldActive: boolean;
  shieldEndTime?: Date;
  defenseBonus: number; // From defense buildings
  lastAttackedAt?: Date;

  constructor(playerId: string, location: Coordinate, defenseBonus: number = 0) {
    this.playerId = playerId;
    this.location = location;
    this.defenseArmy = new ArmyComposition();
    this.garrisonArmy = new ArmyComposition();
    this.incomingAttacks = new Map();
    this.shieldActive = false;
    this.defenseBonus = defenseBonus;
  }

  /**
   * Add troops to defense army
   */
  addDefenseTroops(troopClass: string, tier: number, count: number): boolean {
    return this.defenseArmy.addTroops(troopClass as any, tier as any, count);
  }

  /**
   * Station garrison troops
   */
  stationGarrisonTroops(troopClass: string, tier: number, count: number): boolean {
    return this.garrisonArmy.addTroops(troopClass as any, tier as any, count);
  }

  /**
   * Activate peace shield
   */
  activateShield(durationMinutes: number): boolean {
    if (this.shieldActive) return false;

    this.shieldActive = true;
    this.shieldEndTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    return true;
  }

  /**
   * Deactivate shield
   */
  deactivateShield(): void {
    this.shieldActive = false;
    this.shieldEndTime = undefined;
  }

  /**
   * Check if shield is active
   */
  isShieldActive(): boolean {
    if (!this.shieldActive) return false;
    if (this.shieldEndTime && this.shieldEndTime < new Date()) {
      this.shieldActive = false;
      return false;
    }
    return true;
  }

  /**
   * Register incoming attack
   */
  registerIncomingAttack(attack: IncomingAttack): void {
    attack.isShielded = this.isShieldActive();
    this.incomingAttacks.set(attack.marchId, attack);
  }

  /**
   * Get incoming attacks
   */
  getIncomingAttacks(): IncomingAttack[] {
    return Array.from(this.incomingAttacks.values()).sort(
      (a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime()
    );
  }

  /**
   * Get attacks arriving soon (within 5 minutes)
   */
  getUrgentAttacks(): IncomingAttack[] {
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    return this.getIncomingAttacks().filter(
      a => a.arrivalTime.getTime() - now.getTime() < fiveMinutes && a.arrivalTime.getTime() > now.getTime()
    );
  }

  /**
   * Remove incoming attack after processed
   */
  removeIncomingAttack(marchId: string): void {
    this.incomingAttacks.delete(marchId);
  }

  /**
   * Get total defense power (home army + garrison)
   */
  getTotalDefensePower(): number {
    const homePower = this.defenseArmy.getPowerRating();
    const garrisonPower = this.garrisonArmy.getPowerRating();
    return homePower + garrisonPower;
  }

  /**
   * Get available defenders
   */
  getAvailableDefenders(): ArmyComposition {
    const available = new ArmyComposition();
    // Combine home and garrison armies for defense
    for (const troop of this.defenseArmy.getAllTroops()) {
      available.addTroops(troop.definition.class, troop.definition.tier, troop.count);
    }
    for (const troop of this.garrisonArmy.getAllTroops()) {
      available.addTroops(troop.definition.class, troop.definition.tier, troop.count);
    }
    return available;
  }

  /**
   * Record attack aftermath
   */
  recordAttack(marchId: string): void {
    this.lastAttackedAt = new Date();
    this.removeIncomingAttack(marchId);
  }
}

export class ServerDefense {
  serverId: string;
  defenses: Map<string, DefenseManager>; // playerId -> DefenseManager
  attackLog: Array<{
    attackerId: string;
    defenderId: string;
    timestamp: Date;
    outcome: 'victory' | 'defeat' | 'draw';
    attackerCasualties: number;
    defenderCasualties: number;
  }>;

  constructor(serverId: string) {
    this.serverId = serverId;
    this.defenses = new Map();
    this.attackLog = [];
  }

  /**
   * Get or create defense manager for player
   */
  getDefenseManager(playerId: string, location: Coordinate, defenseBonus?: number): DefenseManager {
    if (!this.defenses.has(playerId)) {
      this.defenses.set(playerId, new DefenseManager(playerId, location, defenseBonus));
    }
    return this.defenses.get(playerId)!;
  }

  /**
   * Log attack outcome
   */
  logAttack(attackerId: string, defenderId: string, outcome: 'victory' | 'defeat' | 'draw', attackerCas: number, defenderCas: number): void {
    this.attackLog.push({
      attackerId,
      defenderId,
      timestamp: new Date(),
      outcome,
      attackerCasualties: attackerCas,
      defenderCasualties: defenderCas,
    });
  }

  /**
   * Get server attack statistics
   */
  getAttackStats(): {
    totalAttacks: number;
    attacks24h: number;
    successRate: number;
    averageCasualties: number;
  } {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const attacks24h = this.attackLog.filter(a => a.timestamp > oneDayAgo);
    const victories = this.attackLog.filter(a => a.outcome === 'victory');
    const totalCasualties = this.attackLog.reduce((sum, a) => sum + a.attackerCasualties + a.defenderCasualties, 0);

    return {
      totalAttacks: this.attackLog.length,
      attacks24h: attacks24h.length,
      successRate: this.attackLog.length > 0 ? victories.length / this.attackLog.length : 0,
      averageCasualties: this.attackLog.length > 0 ? totalCasualties / this.attackLog.length : 0,
    };
  }
}
