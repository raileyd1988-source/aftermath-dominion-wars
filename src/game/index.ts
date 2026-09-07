// Game module exports
export { Building, CommandCenter, Barracks, VehicleFactory, ResearchCenter, Hospital, AllianceHall as AllianceHallBuilding } from './Building';
export { Dominion } from './Dominion';
export { Alliance, OfficerPosition, MemberActivity, Recognition } from './Alliance';
export { AllianceHall } from './AllianceHall';
export { AllianceStore, DominionVault } from './AllianceStore';
export { AllianceTech } from './AllianceTech';
export { HuntSquad, HuntSquadManager, type FormationType } from './HuntSquad';
export { CommanderClass, CommanderInstance, CommanderCollection } from './Commander';
export { Troop, ArmyComposition, TROOP_DATABASE, type TroopClass, type TroopTier } from './Troops';
export { CombatEngine, type CombatParticipant, type CombatResult, type CombatRound } from './CombatEngine';
export { March, MarchManager, type MarchType, type MarchStatus } from './March';
export { Rally, RallyManager, type RallyMember, type RallyConfig } from './Rally';
export { DefenseManager, ServerDefense, type DefenseArmy, type IncomingAttack } from './Defense';
export { GameServer, type SvSPhase, type SvSResult, type DominionPoints, type ServerRanking } from './GameServer';
export { CrossServerSystem, Invasion, ServerUnity, type InvasionPhase, type InvasionResult, type InvasionCorridor } from './CrossServer';

export type { BuildingConfig } from './Building';
export type { AlliancePermission, OfficerRole } from './Alliance';
export type { RelocationRequest, HiveZone } from './AllianceHall';
export type { StoreItem, StorePurchase } from './AllianceStore';
export type { TechResearch, ResearchProgress } from './AllianceTech';
export type { SquadMember, SquadOrder, SquadCombatLog, CombatEvent } from './HuntSquad';
export type { CommanderSkill, CommanderAbility, CommanderProgression } from './Commander';
export type { TroopDefinition, TroopStats } from './Troops';
export type { CombatAction, DamageRecord } from './CombatEngine';
export type { MarchConfig } from './March';
export type { ServerPlayer, SvSReward } from './GameServer';
export type { CrossServerBattle, InvasionReward } from './CrossServer';
