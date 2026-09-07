import { AllianceMember, AllianceTech, TechBranch, Coordinate } from '../shared/types';
import { ALLIANCE_RANKS, GAME_CONFIG } from '../shared/constants';

export interface AlliancePermission {
  invite: boolean;
  remove: boolean;
  promote: boolean;
  startRally: boolean;
  placeMarker: boolean;
  sendAnnouncement: boolean;
  manageTerritory: boolean;
  acceptApplications: boolean;
  diplomacy: boolean;
  spendAllianceResources: boolean;
  manageAllianceResearch: boolean;
  relocateMembers: boolean;
}

export type OfficerRole = 'warCommander' | 'communicationsOfficer' | 'territoryOfficer' | 'eventCommander' | 'diplomacyOfficer' | 'recruitmentOfficer';

export interface OfficerPosition {
  role: OfficerRole;
  playerId: string | null;
  permissions: Partial<AlliancePermission>;
  isActive: boolean;
}

export interface MemberActivity {
  playerId: string;
  power: number;
  powerGrowth24h: number;
  powerGrowth7d: number;
  powerGrowth30d: number;
  commandCenterLevel: number;
  troopTier: number;
  commanderProgress: number;
  vehicleProgress: number;
  researchProgress: number;
  eventParticipation: number;
  svSPoints: number;
  bossDamage: number;
  ralliesLed: number;
  huntSquadsJoined: number;
  allianceHelp: number;
  donations: number;
  miniGamesPlayed: number;
  seasonMilestones: number;
  lastActiveAt: Date;
  activityStatus: 'highly_active' | 'active' | 'needs_improvement' | 'low_participation' | 'inactive';
  awayStatus?: 'vacation' | 'work' | 'family' | 'other' | null;
}

export interface Recognition {
  playerId: string;
  type: 'most_improved' | 'top_warrior' | 'best_teammate' | 'top_contributor' | 'hunt_master' | 'boss_slayer';
  awardedAt: Date;
}

export class Alliance {
  id: string;
  name: string;
  description: string;
  leader: string;
  members: Map<string, AllianceMember>;
  memberActivity: Map<string, MemberActivity>;
  officerPositions: Map<OfficerRole, OfficerPosition>;
  tech: AllianceTech;
  territory: Map<string, any>; // Territory management
  createdAt: Date;
  level: number;
  credits: number;
  banner: string; // Visual banner/crest
  relations: Map<string, 'alliance' | 'nap' | 'neutral' | 'hostile'>; // Diplomatic relations
  recognitions: Recognition[];
  violations: Map<string, number>; // Track treaty violations
  betrayalStatus: 'clean' | 'warned' | 'restricted' | 'rogue' | 'outlaw';

  constructor(allianceId: string, name: string, leader: string) {
    this.id = allianceId;
    this.name = name;
    this.description = '';
    this.leader = leader;
    this.members = new Map();
    this.memberActivity = new Map();
    this.officerPositions = this.initializeOfficerPositions();
    this.tech = this.initializeTech();
    this.territory = new Map();
    this.createdAt = new Date();
    this.level = 1;
    this.credits = 0;
    this.banner = 'default';
    this.relations = new Map();
    this.recognitions = [];
    this.violations = new Map();
    this.betrayalStatus = 'clean';
  }

  private initializeOfficerPositions(): Map<OfficerRole, OfficerPosition> {
    const positions = new Map<OfficerRole, OfficerPosition>();
    const roles: OfficerRole[] = ['warCommander', 'communicationsOfficer', 'territoryOfficer', 'eventCommander', 'diplomacyOfficer', 'recruitmentOfficer'];

    roles.forEach(role => {
      positions.set(role, {
        role,
        playerId: null,
        permissions: {},
        isActive: false,
      });
    });

    return positions;
  }

  private initializeTech(): AllianceTech {
    const emptyBranch: TechBranch = { level: 0, researching: false };
    return {
      development: { ...emptyBranch },
      warfare: { ...emptyBranch },
      defense: { ...emptyBranch },
      alliance: { ...emptyBranch },
      dominion: { ...emptyBranch },
    };
  }

  /**
   * Add a member to the alliance
   */
  addMember(playerId: string, rank: number = ALLIANCE_RANKS.R1): boolean {
    if (this.members.size >= GAME_CONFIG.MAX_ALLIANCE_SIZE) {
      return false;
    }

    if (this.members.has(playerId)) {
      return false;
    }

    this.members.set(playerId, {
      playerId,
      rank,
      joinedAt: new Date(),
      contribution: 0,
      roles: [],
    });

    this.memberActivity.set(playerId, {
      playerId,
      power: 0,
      powerGrowth24h: 0,
      powerGrowth7d: 0,
      powerGrowth30d: 0,
      commandCenterLevel: 1,
      troopTier: 1,
      commanderProgress: 0,
      vehicleProgress: 0,
      researchProgress: 0,
      eventParticipation: 0,
      svSPoints: 0,
      bossDamage: 0,
      ralliesLed: 0,
      huntSquadsJoined: 0,
      allianceHelp: 0,
      donations: 0,
      miniGamesPlayed: 0,
      seasonMilestones: 0,
      lastActiveAt: new Date(),
      activityStatus: 'active',
    });

    return true;
  }

  /**
   * Remove a member from the alliance
   */
  removeMember(playerId: string, performedBy: string): boolean {
    const member = this.members.get(playerId);
    if (!member) return false;

    // Only leader and officers with remove permission can remove
    if (performedBy !== this.leader) {
      const officerPositions = Array.from(this.officerPositions.values());
      const hasRemovePermission = officerPositions.some(
        pos => pos.playerId === performedBy && pos.permissions.remove === true
      );
      if (!hasPermission) return false;
    }

    this.members.delete(playerId);
    this.memberActivity.delete(playerId);
    return true;
  }

  /**
   * Promote a member to a higher rank
   */
  promoteMember(playerId: string, newRank: number, performedBy: string): boolean {
    const member = this.members.get(playerId);
    if (!member) return false;
    if (newRank < ALLIANCE_RANKS.R1 || newRank > ALLIANCE_RANKS.R5) return false;
    if (newRank >= ALLIANCE_RANKS.R5 && performedBy !== this.leader) return false;

    const performer = this.members.get(performedBy);
    if (!performer || performer.rank < newRank) return false;

    member.rank = newRank;
    return true;
  }

  /**
   * Assign an officer role to a member
   */
  assignOfficerRole(playerId: string, role: OfficerRole, performedBy: string): boolean {
    if (performedBy !== this.leader) return false;

    const member = this.members.get(playerId);
    if (!member || member.rank !== ALLIANCE_RANKS.R4) return false;

    const position = this.officerPositions.get(role);
    if (!position) return false;

    // Remove from previous position if assigned
    if (position.playerId) {
      const prevMember = this.members.get(position.playerId);
      if (prevMember && prevMember.roles) {
        prevMember.roles = prevMember.roles.filter(r => r !== role);
      }
    }

    position.playerId = playerId;
    position.isActive = true;

    if (!member.roles) member.roles = [];
    if (!member.roles.includes(role)) {
      member.roles.push(role);
    }

    return true;
  }

  /**
   * Unassign an officer role
   */
  unassignOfficerRole(role: OfficerRole, performedBy: string): boolean {
    if (performedBy !== this.leader) return false;

    const position = this.officerPositions.get(role);
    if (!position || !position.playerId) return false;

    const member = this.members.get(position.playerId);
    if (member && member.roles) {
      member.roles = member.roles.filter(r => r !== role);
    }

    position.playerId = null;
    position.isActive = false;

    return true;
  }

  /**
   * Check if all officer positions are filled with active officers
   */
  areAllOfficerPositionsFilled(): boolean {
    for (const position of this.officerPositions.values()) {
      if (!position.playerId || !position.isActive) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get rank bonuses based on rank
   */
  getRankBonuses(rank: number): { gathering: number; construction: number; training: number; march: number; healing: number; research: number } {
    const bonuses = {
      gathering: 0,
      construction: 0,
      training: 0,
      march: 0,
      healing: 0,
      research: 0,
    };

    switch (rank) {
      case ALLIANCE_RANKS.R1:
        bonuses.gathering = 0.01;
        bonuses.construction = 0.01;
        break;
      case ALLIANCE_RANKS.R2:
        bonuses.gathering = 0.02;
        bonuses.training = 0.02;
        break;
      case ALLIANCE_RANKS.R3:
        bonuses.march = 0.02;
        bonuses.research = 0.02;
        break;
      case ALLIANCE_RANKS.R4:
        bonuses.march = 0.03;
        bonuses.healing = 0.03;
        break;
      case ALLIANCE_RANKS.R5:
        bonuses.march = 0.05;
        bonuses.construction = 0.05;
        bonuses.research = 0.05;
        break;
    }

    return bonuses;
  }

  /**
   * Get united command bonus if all officer positions are filled
   */
  getUnitedCommandBonus(): { gathering: number; construction: number; research: number; training: number } {
    if (this.areAllOfficerPositionsFilled()) {
      return {
        gathering: 0.02,
        construction: 0.02,
        research: 0.02,
        training: 0.02,
      };
    }

    return {
      gathering: 0,
      construction: 0,
      research: 0,
      training: 0,
    };
  }

  /**
   * Update member activity tracking
   */
  updateMemberActivity(playerId: string, activity: Partial<MemberActivity>): boolean {
    if (!this.memberActivity.has(playerId)) return false;

    const currentActivity = this.memberActivity.get(playerId)!;
    const updated = { ...currentActivity, ...activity, playerId };
    this.memberActivity.set(playerId, updated);
    return true;
  }

  /**
   * Get member activity status
   */
  getMemberActivityStatus(playerId: string): MemberActivity | null {
    return this.memberActivity.get(playerId) || null;
  }

  /**
   * Set member vacation/away status
   */
  setMemberAwayStatus(playerId: string, status: 'vacation' | 'work' | 'family' | 'other' | null): boolean {
    const activity = this.memberActivity.get(playerId);
    if (!activity) return false;

    activity.awayStatus = status;
    return true;
  }

  /**
   * Award recognition to a member
   */
  awardRecognition(playerId: string, type: Recognition['type'], performedBy: string): boolean {
    if (performedBy !== this.leader && performedBy !== playerId) {
      const officer = this.members.get(performedBy);
      if (!officer || officer.rank < ALLIANCE_RANKS.R4) return false;
    }

    this.recognitions.push({
      playerId,
      type,
      awardedAt: new Date(),
    });

    return true;
  }

  /**
   * Add alliance credits
   */
  addCredits(amount: number): void {
    this.credits += amount;
  }

  /**
   * Spend alliance credits
   */
  spendCredits(amount: number): boolean {
    if (this.credits < amount) return false;
    this.credits -= amount;
    return true;
  }

  /**
   * Set diplomatic relation with another alliance
   */
  setRelation(otherAllianceId: string, relation: 'alliance' | 'nap' | 'neutral' | 'hostile'): void {
    this.relations.set(otherAllianceId, relation);
  }

  /**
   * Get diplomatic relation with another alliance
   */
  getRelation(otherAllianceId: string): 'alliance' | 'nap' | 'neutral' | 'hostile' {
    return this.relations.get(otherAllianceId) || 'neutral';
  }

  /**
   * Record a treaty violation
   */
  recordViolation(violatorId: string, type: string): void {
    const count = this.violations.get(violatorId) || 0;
    this.violations.set(violatorId, count + 1);

    // Update betrayal status based on violation count
    if (count >= 5) {
      this.betrayalStatus = 'outlaw';
    } else if (count >= 3) {
      this.betrayalStatus = 'rogue';
    } else if (count >= 1) {
      this.betrayalStatus = 'restricted';
    }
  }

  /**
   * Get member count
   */
  getMemberCount(): number {
    return this.members.size;
  }

  /**
   * Get all members
   */
  getAllMembers(): AllianceMember[] {
    return Array.from(this.members.values());
  }

  /**
   * Get members by rank
   */
  getMembersByRank(rank: number): AllianceMember[] {
    return Array.from(this.members.values()).filter(m => m.rank === rank);
  }
}
