import { Alliance, OfficerRole } from './Alliance';
import { Coordinate } from '../shared/types';

export interface RelocationRequest {
  playerId: string;
  fromLocation: Coordinate;
  toLocation: Coordinate;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  isEmergency: boolean;
}

export interface HiveZone {
  name: string;
  type: 'member' | 'combat' | 'leadership' | 'farm';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxMembers?: number;
}

export class AllianceHall {
  alliance: Alliance;
  relocationRequests: Map<string, RelocationRequest>;
  hiveZones: Map<string, HiveZone>;
  memberLocations: Map<string, Coordinate>;
  relocationCooldown: Map<string, Date>; // Track cooldown per player
  lastEmergencyRelocation: Map<string, Date>; // Track emergency relocations

  constructor(alliance: Alliance) {
    this.alliance = alliance;
    this.relocationRequests = new Map();
    this.hiveZones = new Map();
    this.memberLocations = new Map();
    this.relocationCooldown = new Map();
    this.lastEmergencyRelocation = new Map();
  }

  /**
   * Request relocation for a member (standard relocation)
   */
  requestRelocation(playerId: string, toLocation: Coordinate, requestedBy: string): boolean {
    const member = this.alliance.members.get(playerId);
    if (!member) return false;

    // Check if requestedBy has relocation permission
    const requester = this.alliance.members.get(requestedBy);
    if (!requester || requester.rank < 4) return false; // Only R4/R5

    // Check cooldown
    const cooldownEnd = this.relocationCooldown.get(playerId);
    if (cooldownEnd && cooldownEnd > new Date()) {
      return false; // Still in cooldown
    }

    const fromLocation = this.memberLocations.get(playerId) || { x: 0, y: 0 };

    const request: RelocationRequest = {
      playerId,
      fromLocation,
      toLocation,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending',
      isEmergency: false,
    };

    this.relocationRequests.set(playerId, request);
    return true;
  }

  /**
   * Emergency relocation (R5/Territory Officer only)
   */
  emergencyRelocate(playerId: string, toLocation: Coordinate, performedBy: string): boolean {
    const member = this.alliance.members.get(playerId);
    if (!member) return false;

    // Only leader can perform emergency relocations
    if (performedBy !== this.alliance.leader) return false;

    // Check emergency cooldown (e.g., 24 hours between emergency relocations)
    const lastEmergency = this.lastEmergencyRelocation.get(playerId);
    if (lastEmergency) {
      const timeSinceLastEmergency = new Date().getTime() - lastEmergency.getTime();
      if (timeSinceLastEmergency < 24 * 60 * 60 * 1000) {
        return false; // Too soon for another emergency relocation
      }
    }

    // Cannot relocate actively attacked players (would need real-time attack data)
    // Cannot relocate into hostile territory (would need territory data)

    const fromLocation = this.memberLocations.get(playerId) || { x: 0, y: 0 };

    const request: RelocationRequest = {
      playerId,
      fromLocation,
      toLocation,
      requestedBy: performedBy,
      requestedAt: new Date(),
      status: 'approved',
      isEmergency: true,
    };

    this.relocationRequests.set(playerId, request);
    this.completeRelocation(playerId, toLocation);
    this.lastEmergencyRelocation.set(playerId, new Date());

    return true;
  }

  /**
   * Complete a relocation
   */
  completeRelocation(playerId: string, newLocation: Coordinate): boolean {
    const request = this.relocationRequests.get(playerId);
    if (!request) return false;

    // Update member location
    this.memberLocations.set(playerId, newLocation);

    // Update request status
    request.status = 'completed';

    // Set cooldown (e.g., 7 days)
    const cooldownEnd = new Date();
    cooldownEnd.setDate(cooldownEnd.getDate() + 7);
    this.relocationCooldown.set(playerId, cooldownEnd);

    return true;
  }

  /**
   * Create a hive zone for organizing members
   */
  createHiveZone(name: string, type: HiveZone['type'], bounds: { minX: number; maxX: number; minY: number; maxY: number }, maxMembers?: number): boolean {
    if (this.hiveZones.has(name)) return false;

    const zone: HiveZone = {
      name,
      type,
      ...bounds,
      maxMembers,
    };

    this.hiveZones.set(name, zone);
    return true;
  }

  /**
   * Get hive zone organization summary
   */
  getHiveOrganization(): { zones: HiveZone[]; membersByZone: Map<string, string[]> } {
    const membersByZone = new Map<string, string[]>();

    // Initialize zones
    this.hiveZones.forEach(zone => {
      membersByZone.set(zone.name, []);
    });

    // Assign members to zones based on location
    this.memberLocations.forEach((location, playerId) => {
      for (const zone of this.hiveZones.values()) {
        if (location.x >= zone.minX && location.x <= zone.maxX && location.y >= zone.minY && location.y <= zone.maxY) {
          const members = membersByZone.get(zone.name) || [];
          members.push(playerId);
          membersByZone.set(zone.name, members);
          break; // Member is only in one zone
        }
      }
    });

    return {
      zones: Array.from(this.hiveZones.values()),
      membersByZone,
    };
  }

  /**
   * Get member location
   */
  getMemberLocation(playerId: string): Coordinate | null {
    return this.memberLocations.get(playerId) || null;
  }

  /**
   * Set member location
   */
  setMemberLocation(playerId: string, location: Coordinate): void {
    this.memberLocations.set(playerId, location);
  }

  /**
   * Get relocation requests
   */
  getRelocationRequests(status?: string): RelocationRequest[] {
    return Array.from(this.relocationRequests.values()).filter(r => !status || r.status === status);
  }

  /**
   * Get relocation activity log for leadership
   */
  getRelocationLog(): RelocationRequest[] {
    return Array.from(this.relocationRequests.values()).sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
}
