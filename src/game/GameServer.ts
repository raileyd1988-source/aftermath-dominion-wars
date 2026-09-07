import { Alliance } from './Alliance';
import { Dominion } from './Dominion';

export type SvSPhase = 'preparation' | 'monday_friday' | 'saturday_war' | 'cooldown';
export type SvSResult = 'victory' | 'defeat' | 'draw';

export interface ServerPlayer {
  playerId: string;
  allianceId: string;
  dominion: Dominion;
  power: number;
  commanderCount: number;
  contribution: number; // Points earned
}

export interface DominionPoints {
  playerId: string;
  allianceId: string;
  points: number;
  source: 'pvp' | 'boss' | 'tower' | 'rally' | 'personal_best' | 'alliance_milestone';
  timestamp: Date;
}

export interface ServerRanking {
  rank: number;
  serverId: string;
  playerCount: number;
  totalPower: number;
  totalAlliances: number;
  totalPoints: number;
  weeklyVictories: number;
  monthlyVictories: number;
  dominationPercentage: number; // % of map controlled
}

export interface SvSReward {
  playerId: string;
  allianceId: string;
  rank: number; // Top 10, Top 50, etc.
  resources?: { [key: string]: number };
  nexusMaterials?: number;
  tokens?: number;
  seasonalCurrency?: number;
  legendaryChance?: number; // Probability of legendary drop
}

export class GameServer {
  serverId: string;
  name: string;
  region: string;
  players: Map<string, ServerPlayer>;
  alliances: Map<string, Alliance>;
  svsCycle: {
    phase: SvSPhase;
    weekStart: Date;
    weekEnd: Date;
    saturdayWarStart: Date;
    saturdayWarEnd: Date;
  };
  pointsLog: DominionPoints[];
  casualties: Map<string, number>; // playerId -> total casualties
  serverStats: {
    totalAttacks: number;
    totalRallies: number;
    totalBossesFought: number;
    averagePower: number;
    peakPlayers: number;
  };

  constructor(serverId: string, name: string, region: string = 'US') {
    this.serverId = serverId;
    this.name = name;
    this.region = region;
    this.players = new Map();
    this.alliances = new Map();
    this.pointsLog = [];
    this.casualties = new Map();

    // Initialize SvS cycle (Monday start)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const saturdayWarStart = new Date(weekStart);
    saturdayWarStart.setDate(saturdayWarStart.getDate() + 5); // Saturday
    saturdayWarStart.setHours(20, 0, 0, 0);

    const saturdayWarEnd = new Date(saturdayWarStart);
    saturdayWarEnd.setHours(23, 59, 59, 999);

    this.svsCycle = {
      phase: 'monday_friday',
      weekStart,
      weekEnd,
      saturdayWarStart,
      saturdayWarEnd,
    };

    this.serverStats = {
      totalAttacks: 0,
      totalRallies: 0,
      totalBossesFought: 0,
      averagePower: 0,
      peakPlayers: 0,
    };
  }

  /**
   * Register player on server
   */
  registerPlayer(playerId: string, allianceId: string, dominion: Dominion): boolean {
    if (this.players.has(playerId)) return false;

    this.players.set(playerId, {
      playerId,
      allianceId,
      dominion,
      power: dominion.getCommandCenterLevel() * 100,
      commanderCount: 0,
      contribution: 0,
    });

    return true;
  }

  /**
   * Register alliance on server
   */
  registerAlliance(alliance: Alliance): boolean {
    if (this.alliances.has(alliance.id)) return false;
    this.alliances.set(alliance.id, alliance);
    return true;
  }

  /**
   * Award Dominion Points to player
   */
  awardDominionPoints(
    playerId: string,
    points: number,
    source: 'pvp' | 'boss' | 'tower' | 'rally' | 'personal_best' | 'alliance_milestone'
  ): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.contribution += points;

    this.pointsLog.push({
      playerId,
      allianceId: player.allianceId,
      points,
      source,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get current SvS phase
   */
  getCurrentPhase(): SvSPhase {
    const now = new Date();

    if (now >= this.svsCycle.saturdayWarStart && now <= this.svsCycle.saturdayWarEnd) {
      return 'saturday_war';
    }

    if (now >= this.svsCycle.weekStart && now < this.svsCycle.saturdayWarStart) {
      return 'monday_friday';
    }

    return 'cooldown';
  }

  /**
   * Get alliance points total
   */
  getAlliancePoints(allianceId: string): number {
    return this.pointsLog
      .filter(p => p.allianceId === allianceId && this.isCurrentWeek(p.timestamp))
      .reduce((sum, p) => sum + p.points, 0);
  }

  /**
   * Check if timestamp is current SvS week
   */
  private isCurrentWeek(date: Date): boolean {
    return date >= this.svsCycle.weekStart && date <= this.svsCycle.weekEnd;
  }

  /**
   * Get alliance ranking
   */
  getAllianceRanking(allianceId: string): number {
    const alliance = this.alliances.get(allianceId);
    if (!alliance) return -1;

    const allAlliances = Array.from(this.alliances.values()).sort((a, b) => {
      const pointsA = this.getAlliancePoints(a.id);
      const pointsB = this.getAlliancePoints(b.id);
      return pointsB - pointsA;
    });

    return allAlliances.findIndex(a => a.id === allianceId) + 1;
  }

  /**
   * Get top alliances
   */
  getTopAlliances(limit: number = 10): Array<{ alliance: Alliance; points: number; rank: number }> {
    const allAlliances = Array.from(this.alliances.values())
      .map(a => ({
        alliance: a,
        points: this.getAlliancePoints(a.id),
        rank: 0,
      }))
      .sort((a, b) => b.points - a.points);

    allAlliances.forEach((a, i) => (a.rank = i + 1));
    return allAlliances.slice(0, limit);
  }

  /**
   * Get player ranking on server
   */
  getPlayerRanking(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player) return -1;

    const allPlayers = Array.from(this.players.values()).sort((a, b) => b.contribution - a.contribution);
    return allPlayers.findIndex(p => p.playerId === playerId) + 1;
  }

  /**
   * Calculate server ranking (for cross-server comparison)
   */
  getServerRanking(): ServerRanking {
    const totalPower = Array.from(this.players.values()).reduce((sum, p) => sum + p.power, 0);
    const totalPoints = this.pointsLog
      .filter(p => this.isCurrentWeek(p.timestamp))
      .reduce((sum, p) => sum + p.points, 0);

    return {
      rank: 0, // Would be set by cross-server system
      serverId: this.serverId,
      playerCount: this.players.size,
      totalPower,
      totalAlliances: this.alliances.size,
      totalPoints,
      weeklyVictories: 0,
      monthlyVictories: 0,
      dominationPercentage: 0,
    };
  }

  /**
   * Record casualty
   */
  recordCasualty(playerId: string, count: number): void {
    this.casualties.set(playerId, (this.casualties.get(playerId) || 0) + count);
  }

  /**
   * Get player casualties
   */
  getPlayerCasualties(playerId: string): number {
    return this.casualties.get(playerId) || 0;
  }

  /**
   * Update player power
   */
  updatePlayerPower(playerId: string, newPower: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.power = newPower;
    }
  }

  /**
   * Get server statistics
   */
  getServerStats(): typeof this.serverStats {
    return this.serverStats;
  }
}
