// Game Constants

export const GAME_CONFIG = {
  MAX_ALLIANCE_SIZE: 75,
  MIN_ALLIANCE_SIZE: 1,
  PROTECTED_HQ_LEVEL: 9,
  MAX_MARCHES: 5,
  MAX_COMMAND_CENTER_LEVEL: 30,
  MAX_VIP_LEVEL: 15,
  INITIAL_BUILDERS: 1,
  SECOND_BUILDER_UNLOCK_LEVEL: 10,
};

export const TROOP_TIERS = {
  T1: 1,
  T2: 4,
  T3: 7,
  T4: 10,
  T5: 13,
  T6: 16,
  T7: 19,
  T8: 22,
  T9: 26,
  T10: 30,
} as const;

export const TROOP_CLASSES = {
  VANGUARD: 'vanguard',
  RANGERS: 'rangers',
  ARMOR: 'armor',
} as const;

export const ALLIANCE_RANKS = {
  R5: 5, // Commander
  R4: 4, // Officers
  R3: 3, // Veterans
  R2: 2, // Members
  R1: 1, // Recruits
} as const;

export const RESOURCES = {
  FOOD: 'food',
  FUEL: 'fuel',
  STEEL: 'steel',
  COMPONENTS: 'components',
  NEXUS_MATERIALS: 'nexus_materials',
} as const;

export const MONETIZATION = {
  NORMAL_MAX_PACK: 49.99,
  ELITE_PACK_PRICE: 99.99,
  ELITE_PACK_MAX_PER_MONTH: 1,
} as const;

export const RECOVERY_RATES = {
  BASE_FREE_RECOVERY: 0.9, // 90%
  MAX_RECOVERY: 0.95, // 95%
} as const;

export const SVS_DOMINION_POINTS = {
  MONDAY_TO_FRIDAY: 1,
  SATURDAY_WAR: 3,
  LOSING_SERVER_PERCENT: 0.75, // 75% of winning rewards
} as const;
