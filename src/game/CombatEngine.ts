import { Troop, TroopClass, ArmyComposition, TROOP_DATABASE } from './Troops';
import { CommanderInstance } from './Commander';

export interface CombatParticipant {
  id: string; // playerId or enemy ID
  army: ArmyComposition;
  commander: CommanderInstance | null;
  formation: string;
  morale: number;
  coordinationBonus: number;
}

export interface CombatRound {
  roundNumber: number;
  actions: CombatAction[];
  damageLog: DamageRecord[];
  timestamp: Date;
}

export interface CombatAction {
  actor: string; // playerId
  type: 'attack' | 'defend' | 'ability' | 'retreat' | 'rally';
  target: string; // playerId
  description: string;
  damage?: number;
  effect?: string;
}

export interface DamageRecord {
  attacker: string;
  defender: string;
  attackerClass: TroopClass;
  defenderClass: TroopClass;
  damageDealt: number;
  damageType: 'normal' | 'counter' | 'critical' | 'blocked';
}

export interface CombatResult {
  victor: string;
  defeated: string;
  duration: number; // seconds
  totalRounds: number;
  victorLosses: number; // % of troops lost
  defeatedLosses: number;
  loot?: {
    resources?: { [key: string]: number };
    experience?: number;
  };
  timestamp: Date;
}

export class CombatEngine {
  attacker: CombatParticipant;
  defender: CombatParticipant;
  rounds: CombatRound[];
  isActive: boolean;
  maxRounds: number;
  startTime: Date;

  constructor(attacker: CombatParticipant, defender: CombatParticipant, maxRounds: number = 50) {
    this.attacker = attacker;
    this.defender = defender;
    this.rounds = [];
    this.isActive = true;
    this.maxRounds = maxRounds;
    this.startTime = new Date();
  }

  /**
   * Execute one combat round
   */
  executeRound(): CombatRound {
    const roundNumber = this.rounds.length + 1;
    const actions: CombatAction[] = [];
    const damageLog: DamageRecord[] = [];

    // Attacker attacks defender
    const attackerDamage = this.calculateAttack(this.attacker, this.defender, 'attacker');
    actions.push({
      actor: this.attacker.id,
      type: 'attack',
      target: this.defender.id,
      description: `${this.attacker.id} attacks ${this.defender.id}`,
      damage: attackerDamage.total,
    });
    damageLog.push(...attackerDamage.log);

    // Apply damage to defender
    this.applyDamage(this.defender, attackerDamage.total);

    // Defender counterattacks if still alive
    if (this.defender.army.getTotalCount() > 0) {
      const defenderDamage = this.calculateAttack(this.defender, this.attacker, 'defender');
      actions.push({
        actor: this.defender.id,
        type: 'attack',
        target: this.attacker.id,
        description: `${this.defender.id} counterattacks ${this.attacker.id}`,
        damage: defenderDamage.total,
      });
      damageLog.push(...defenderDamage.log);

      // Apply damage to attacker
      this.applyDamage(this.attacker, defenderDamage.total);
    }

    const round: CombatRound = {
      roundNumber,
      actions,
      damageLog,
      timestamp: new Date(),
    };

    this.rounds.push(round);

    // Check if combat should end
    if (this.shouldCombatEnd()) {
      this.isActive = false;
    }

    return round;
  }

  /**
   * Calculate damage from attacker to defender
   */
  private calculateAttack(
    attacker: CombatParticipant,
    defender: CombatParticipant,
    side: 'attacker' | 'defender'
  ): { total: number; log: DamageRecord[] } {
    let totalDamage = 0;
    const damageLog: DamageRecord[] = [];

    const attackerTroops = attacker.army.getAllTroops();
    const defenderTroops = defender.army.getAllTroops();

    for (const attackTroop of attackerTroops) {
      // Find matching defender unit to engage with
      let targetTroop = this.findOptimalTarget(attackTroop, defenderTroops);

      if (!targetTroop) {
        targetTroop = defenderTroops[0]; // Fallback to first unit
      }

      if (!targetTroop) continue; // No valid target

      // Base damage
      let baseDamage = attackTroop.definition.stats.attack * attackTroop.count;

      // Apply counter bonus if applicable
      let damageType: 'normal' | 'counter' | 'critical' | 'blocked' = 'normal';
      if (attackTroop.definition.counterClass === targetTroop.definition.class) {
        baseDamage *= 1.25; // 25% counter advantage
        damageType = 'counter';
      }

      // Apply defense reduction
      const defenseReduction = targetTroop.definition.stats.defense * targetTroop.count * 0.15; // 15% defense mitigation
      let actualDamage = Math.max(0, baseDamage - defenseReduction);

      // Apply commander bonuses
      if (attacker.commander) {
        const commanderBonus = attacker.commander.getTotalAttackBonus() / 100;
        actualDamage *= 1 + commanderBonus;
      }

      // Apply formation bonus
      if (side === 'attacker' && attacker.coordinationBonus > 0) {
        actualDamage *= 1 + attacker.coordinationBonus / 100;
      }

      // Critical hit chance (15%)
      if (Math.random() < 0.15) {
        actualDamage *= 1.5;
        damageType = 'critical';
      }

      totalDamage += actualDamage;
      damageLog.push({
        attacker: attacker.id,
        defender: defender.id,
        attackerClass: attackTroop.definition.class,
        defenderClass: targetTroop.definition.class,
        damageDealt: Math.floor(actualDamage),
        damageType,
      });
    }

    return { total: Math.floor(totalDamage), log: damageLog };
  }

  /**
   * Find optimal target based on counter advantage
   */
  private findOptimalTarget(attackTroop: Troop, defenderTroops: Troop[]): Troop | null {
    // Prefer target that this troop counters
    for (const defTroop of defenderTroops) {
      if (attackTroop.definition.counterClass === defTroop.definition.class && defTroop.count > 0) {
        return defTroop;
      }
    }

    // Otherwise pick highest health target
    let bestTarget: Troop | null = null;
    let maxHealth = 0;

    for (const defTroop of defenderTroops) {
      if (defTroop.count > 0 && defTroop.currentHealth > maxHealth) {
        bestTarget = defTroop;
        maxHealth = defTroop.currentHealth;
      }
    }

    return bestTarget;
  }

  /**
   * Apply damage to defender army
   */
  private applyDamage(participant: CombatParticipant, totalDamage: number): void {
    let remainingDamage = totalDamage;
    const troops = participant.army.getAllTroops();

    for (const troop of troops) {
      if (remainingDamage <= 0) break;
      const actualDamage = troop.takeDamage(remainingDamage);
      remainingDamage -= actualDamage;
    }
  }

  /**
   * Check if combat should end
   */
  private shouldCombatEnd(): boolean {
    const attackerAlive = this.attacker.army.getTotalCount() > 0;
    const defenderAlive = this.defender.army.getTotalCount() > 0;

    // One side completely eliminated
    if (!attackerAlive || !defenderAlive) return true;

    // Max rounds reached
    if (this.rounds.length >= this.maxRounds) return true;

    return false;
  }

  /**
   * Get combat result
   */
  getCombatResult(): CombatResult {
    const attackerCount = this.attacker.army.getTotalCount();
    const defenderCount = this.defender.army.getTotalCount();
    const duration = (new Date().getTime() - this.startTime.getTime()) / 1000;

    let victor: string;
    let defeated: string;

    if (attackerCount > 0 && defenderCount === 0) {
      victor = this.attacker.id;
      defeated = this.defender.id;
    } else if (defenderCount > 0 && attackerCount === 0) {
      victor = this.defender.id;
      defeated = this.attacker.id;
    } else if (defenderCount > attackerCount) {
      victor = this.defender.id;
      defeated = this.attacker.id;
    } else {
      victor = this.attacker.id;
      defeated = this.defender.id;
    }

    // Calculate casualties
    const attackerInitial = this.calculateInitialCount(this.attacker.army);
    const defenderInitial = this.calculateInitialCount(this.defender.army);

    const victorLosses = ((attackerInitial - attackerCount) / attackerInitial) * 100;
    const defeatedLosses = ((defenderInitial - defenderCount) / defenderInitial) * 100;

    return {
      victor,
      defeated,
      duration,
      totalRounds: this.rounds.length,
      victorLosses: Math.floor(victorLosses),
      defeatedLosses: Math.floor(defeatedLosses),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate initial troop count (approximation based on power rating)
   */
  private calculateInitialCount(army: ArmyComposition): number {
    return Math.max(1, Math.floor(army.getPowerRating() / 50));
  }

  /**
   * Run full combat to completion
   */
  runFullCombat(): CombatResult {
    while (this.isActive) {
      this.executeRound();
    }
    return this.getCombatResult();
  }

  /**
   * Get combat log
   */
  getCombatLog(): CombatRound[] {
    return this.rounds;
  }
}
