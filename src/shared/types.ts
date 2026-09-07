// TypeScript Type Definitions

export interface Player {
  id: string;
  username: string;
  serverId: string;
  commandCenterLevel: number;
  power: number;
  vipLevel: number;
  resources: Resources;
  troops: TroopArmy;
  commanders: Commander[];
  commandVehicle: CommandVehicle;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Resources {
  food: number;
  fuel: number;
  steel: number;
  components: number;
  nexusMaterials: number;
}

export interface TroopArmy {
  vanguard: TroopCount;
  rangers: TroopCount;
  armor: TroopCount;
}

export interface TroopCount {
  t1: number;
  t2: number;
  t3: number;
  t4: number;
  t5: number;
  t6: number;
  t7: number;
  t8: number;
  t9: number;
  t10: number;
}

export interface Commander {
  id: string;
  name: string;
  tier: number;
  level: number;
  skills: Skill[];
  fragmentsOwned: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  bonus: number;
  type: 'attack' | 'defense' | 'hp' | 'march' | 'march_defense' | 'gathering' | 'training';
}

export interface CommandVehicle {
  level: number;
  modules: VehicleModule[];
  skin: string;
}

export interface VehicleModule {
  type: 'engine' | 'armor' | 'command' | 'weapons' | 'cargo' | 'nexus_core';
  level: number;
}

export interface Alliance {
  id: string;
  name: string;
  leader: string;
  members: AllianceMember[];
  tech: AllianceTech;
  territory: Territory[];
  createdAt: Date;
}

export interface AllianceMember {
  playerId: string;
  rank: number;
  joinedAt: Date;
  contribution: number;
  roles?: string[];
}

export interface AllianceTech {
  development: TechBranch;
  warfare: TechBranch;
  defense: TechBranch;
  alliance: TechBranch;
  dominion: TechBranch;
}

export interface TechBranch {
  level: number;
  researching?: boolean;
  completionTime?: Date;
}

export interface Territory {
  id: string;
  type: 'outpost' | 'installation' | 'city' | 'region' | 'capital';
  location: Coordinate;
  owner: string;
  level: number;
  structures: Structure[];
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface Structure {
  type: string;
  level: number;
  defenses?: number;
}

export interface March {
  id: string;
  playerId: string;
  commander: Commander;
  troops: TroopArmy;
  destination: Coordinate;
  type: 'assault' | 'hunter' | 'siege' | 'extermination' | 'guardian' | 'logistics' | 'rally' | 'invasion';
  status: 'marching' | 'arrived' | 'returning';
  arrivalTime: Date;
}

export interface HuntSquad {
  id: string;
  allianceId: string;
  leader: string;
  members: string[];
  target: string | Coordinate;
  status: 'forming' | 'marching' | 'engaged' | 'completed';
}
