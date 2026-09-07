import { GameServer } from './GameServer';

export type InvasionPhase = 'preparation' | 'invasion' | 'settlement' | 'retreat';
export type InvasionResult = 'attacker_victory' | 'defender_victory' | 'mutual_destruction' | 'withdrawal';

export interface InvasionCorridor {
  corridorId: string;
  attackerServerId: string;
  defenderServerId: string;
  entranceLocation: { x: number; y: number };
  maxPlayers: number; // Players who can invade through this corridor
  isOpen: boolean;
  duration: number; // seconds the corridor is open
}

export interface InvasionReward {
  playerId: string;
  allianceId: string;
  resourcesStolen?: { [key: string]: number };
  nexusMaterials?: number;
  seasonalCurrency?: number;
  legendaryEquipmentChance?: number;
  victoryBonus?: number; // If server wins invasion
}

export interface CrossServerBattle {
  battleId: string;
  invasionId: string;
  attackerServerId: string;
  defenderServerId: string;
  zone: string; // Invasion zone
  startTime: Date;
  endTime?: Date;
  attackerCasualties: number;
  defenderCasualties: number;
  result?: InvasionResult;
}

export class ServerUnity {
  serverId: string;
  unityLevel: number; // 1-5, affects bonuses
  unityPoints: number;
  memberAlliances: Map<string, number>; // allianceId -> contribution
  rivals: Map<string, number>; // rivalServerId -> rivalry score
  unityBonus: {
    gathering: number;
    construction: number;
    training: number;
    march: number; // Speed
    healing: number;
    research: number;
  };

  constructor(serverId: string) {
    this.serverId = serverId;
    this.unityLevel = 1;
    this.unityPoints = 0;
    this.memberAlliances = new Map();
    this.rivals = new Map();
    this.unityBonus = {
      gathering: 0,
      construction: 0,
      training: 0,
      march: 0,
      healing: 0,
      research: 0,
    };
  }

  /**
   * Add unity points from alliance activities
   */
  addUnityPoints(allianceId: string, amount: number): void {
    const current = this.memberAlliances.get(allianceId) || 0;
    this.memberAlliances.set(allianceId, current + amount);
    this.unityPoints += amount;

    // Level up unity every 10,000 points
    const newLevel = Math.floor(this.unityPoints / 10000) + 1;
    if (newLevel > this.unityLevel) {
      this.levelUp();
    }
  }

  /**
   * Level up unity
   */
  private levelUp(): void {
    if (this.unityLevel >= 5) return;

    this.unityLevel++;

    // Increase bonuses per level
    const bonusMultiplier = 0.05 * this.unityLevel; // 5% per level
    this.unityBonus.gathering = bonusMultiplier;
    this.unityBonus.construction = bonusMultiplier;
    this.unityBonus.training = bonusMultiplier;
    this.unityBonus.march = bonusMultiplier;
    this.unityBonus.healing = bonusMultiplier;
    this.unityBonus.research = bonusMultiplier;
  }

  /**
   * Mark alliance as rival
   */
  addRivalry(rivalServerId: string, score: number = 1): void {
    const current = this.rivals.get(rivalServerId) || 0;
    this.rivals.set(rivalServerId, current + score);
  }

  /**
   * Get rival servers ranked by rivalry
   */
  getRivalServers(): Array<{ serverId: string; rivalryScore: number }> {
    return Array.from(this.rivals.entries())
      .map(([serverId, score]) => ({ serverId, rivalryScore: score }))
      .sort((a, b) => b.rivalryScore - a.rivalryScore);
  }
}

export class Invasion {
  invasionId: string;
  attackerServer: GameServer;
  defenderServer: GameServer;
  phase: InvasionPhase;
  corridors: Map<string, InvasionCorridor>;
  battles: CrossServerBattle[];
  startTime: Date;
  endTime?: Date;
  result?: InvasionResult;
  attackerCasualties: number;
  defenderCasualties: number;
  attackerRewards: InvasionReward[];
  serverUnityBoost: Map<string, number>; // serverId -> unity points

  constructor(invasionId: string, attackerServer: GameServer, defenderServer: GameServer) {
    this.invasionId = invasionId;
    this.attackerServer = attackerServer;
    this.defenderServer = defenderServer;
    this.phase = 'preparation';
    this.corridors = new Map();
    this.battles = [];
    this.startTime = new Date();
    this.attackerCasualties = 0;
    this.defenderCasualties = 0;
    this.attackerRewards = [];
    this.serverUnityBoost = new Map();
  }

  /**
   * Create invasion corridor
   */
  createCorridor(
    corridorId: string,
    entranceLocation: { x: number; y: number },
    maxPlayers: number = 50,
    durationMinutes: number = 120
  ): InvasionCorridor {
    const corridor: InvasionCorridor = {
      corridorId,
      attackerServerId: this.attackerServer.serverId,
      defenderServerId: this.defenderServer.serverId,
      entranceLocation,
      maxPlayers,
      isOpen: true,
      duration: durationMinutes * 60,
    };

    this.corridors.set(corridorId, corridor);
    return corridor;
  }

  /**
   * Begin invasion phase
   */
  beginInvasion(): boolean {
    if (this.phase !== 'preparation') return false;
    if (this.corridors.size === 0) return false;

    this.phase = 'invasion';
    return true;
  }

  /**
   * Record battle during invasion
   */
  recordBattle(battle: CrossServerBattle): void {
    this.battles.push(battle);
    this.attackerCasualties += battle.attackerCasualties;
    this.defenderCasualties += battle.defenderCasualties;
  }

  /**
   * Conclude invasion
   */
  concludeInvasion(result: InvasionResult): boolean {
    if (this.phase !== 'invasion') return false;

    this.phase = 'settlement';
    this.result = result;
    this.endTime = new Date();

    // Determine unity boost based on result
    if (result === 'attacker_victory') {
      this.serverUnityBoost.set(this.attackerServer.serverId, 1000);
      this.serverUnityBoost.set(this.defenderServer.serverId, 500); // Defender unity for fighting back
    } else if (result === 'defender_victory') {
      this.serverUnityBoost.set(this.defenderServer.serverId, 1000);
      this.serverUnityBoost.set(this.attackerServer.serverId, 300); // Attacker gets small boost
    } else if (result === 'mutual_destruction') {
      this.serverUnityBoost.set(this.attackerServer.serverId, 750);
      this.serverUnityBoost.set(this.defenderServer.serverId, 750);
    }

    return true;
  }

  /**
   * Get invasion statistics
   */
  getStats(): {
    duration: number;
    totalBattles: number;
    totalCasualties: number;
    attackerCasualtyRate: number;
    defenderCasualtyRate: number;
  } {
    const duration = this.endTime ? (this.endTime.getTime() - this.startTime.getTime()) / 1000 : 0;
    const totalCasualties = this.attackerCasualties + this.defenderCasualties;

    return {
      duration,
      totalBattles: this.battles.length,
      totalCasualties,
      attackerCasualtyRate: this.attackerCasualties,
      defenderCasualtyRate: this.defenderCasualties,
    };
  }
}

export class CrossServerSystem {
  servers: Map<string, GameServer>;
  serverUnity: Map<string, ServerUnity>;
  invasions: Map<string, Invasion>;
  invasionCounter: number;
  seasonNumber: number;
  seasonStart: Date;
  seasonEnd: Date;

  constructor() {
    this.servers = new Map();
    this.serverUnity = new Map();
    this.invasions = new Map();
    this.invasionCounter = 0;
    this.seasonNumber = 1;

    // Current season: 90 days
    this.seasonStart = new Date();
    this.seasonEnd = new Date(this.seasonStart.getTime() + 90 * 24 * 60 * 60 * 1000);
  }

  /**
   * Register server in cross-server system
   */
  registerServer(server: GameServer): void {
    this.servers.set(server.serverId, server);
    this.serverUnity.set(server.serverId, new ServerUnity(server.serverId));
  }

  /**
   * Get server unity
   */
  getServerUnity(serverId: string): ServerUnity | null {
    return this.serverUnity.get(serverId) || null;
  }

  /**
   * Initiate invasion
   */
  initiateInvasion(attackerServerId: string, defenderServerId: string): Invasion | null {
    const attacker = this.servers.get(attackerServerId);
    const defender = this.servers.get(defenderServerId);

    if (!attacker || !defender) return null;

    const invasionId = `invasion-${this.invasionCounter++}-${Date.now()}`;
    const invasion = new Invasion(invasionId, attacker, defender);

    this.invasions.set(invasionId, invasion);
    return invasion;
  }

  /**
   * Get active invasions
   */
  getActiveInvasions(): Invasion[] {
    return Array.from(this.invasions.values()).filter(
      i => i.phase === 'preparation' || i.phase === 'invasion'
    );
  }

  /**
   * Get invasions by server
   */
  getInvasionsForServer(serverId: string): Invasion[] {
    return Array.from(this.invasions.values()).filter(
      i => i.attackerServer.serverId === serverId || i.defenderServer.serverId === serverId
    );
  }

  /**
   * Get global server rankings
   */
  getGlobalServerRankings(): Array<{ rank: number; server: GameServer; serverUnity: ServerUnity }> {
    const rankings = Array.from(this.servers.values())
      .map(server => ({
        server,
        serverUnity: this.serverUnity.get(server.serverId)!,
        totalPower: server.getServerRanking().totalPower,
      }))
      .sort((a, b) => b.totalPower - a.totalPower)
      .map((item, index) => ({
        rank: index + 1,
        server: item.server,
        serverUnity: item.serverUnity,
      }));

    return rankings;
  }

  /**
   * Advance season
   */
  advanceSeason(): void {
    this.seasonNumber++;
    this.seasonStart = new Date();
    this.seasonEnd = new Date(this.seasonStart.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Reset weekly SvS cycles for all servers
    for (const server of this.servers.values()) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      server.svsCycle.weekStart = weekStart;
      server.svsCycle.weekEnd = weekEnd;
    }
  }

  /**
   * Get season progress
   */
  getSeasonProgress(): { current: number; total: number; daysRemaining: number } {
    const now = new Date();
    const elapsed = now.getTime() - this.seasonStart.getTime();
    const total = this.seasonEnd.getTime() - this.seasonStart.getTime();
    const daysRemaining = Math.ceil((this.seasonEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      current: Math.floor((elapsed / total) * 100),
      total: 100,
      daysRemaining,
    };
  }
}
