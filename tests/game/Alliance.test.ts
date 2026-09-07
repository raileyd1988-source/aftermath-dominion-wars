import { Alliance, ALLIANCE_RANKS } from '../../src/game/Alliance';
import { GAME_CONFIG } from '../../src/shared/constants';

describe('Alliance System', () => {
  let alliance: Alliance;

  beforeEach(() => {
    alliance = new Alliance('alliance-1', 'Test Alliance', 'leader-123');
  });

  describe('Member Management', () => {
    test('should add a member to the alliance', () => {
      const result = alliance.addMember('player-1');
      expect(result).toBe(true);
      expect(alliance.getMemberCount()).toBe(1);
    });

    test('should not add a member if alliance is full', () => {
      for (let i = 0; i < GAME_CONFIG.MAX_ALLIANCE_SIZE; i++) {
        alliance.addMember(`player-${i}`);
      }

      const result = alliance.addMember('player-max');
      expect(result).toBe(false);
    });

    test('should remove a member from the alliance', () => {
      alliance.addMember('player-1');
      const result = alliance.removeMember('player-1', alliance.leader);
      expect(result).toBe(true);
      expect(alliance.getMemberCount()).toBe(0);
    });

    test('should promote a member to higher rank', () => {
      alliance.addMember('player-1');
      const result = alliance.promoteMember('player-1', ALLIANCE_RANKS.R2, alliance.leader);
      expect(result).toBe(true);
      expect(alliance.members.get('player-1')?.rank).toBe(ALLIANCE_RANKS.R2);
    });
  });

  describe('Officer Roles', () => {
    test('should assign an officer role to an R4 member', () => {
      alliance.addMember('officer-1', ALLIANCE_RANKS.R4);
      const result = alliance.assignOfficerRole('officer-1', 'warCommander', alliance.leader);
      expect(result).toBe(true);
      expect(alliance.officerPositions.get('warCommander')?.playerId).toBe('officer-1');
    });

    test('should return true when all officer positions are filled', () => {
      // Create 6 R4 officers
      const roles: Array<'warCommander' | 'communicationsOfficer' | 'territoryOfficer' | 'eventCommander' | 'diplomacyOfficer' | 'recruitmentOfficer'> = [
        'warCommander',
        'communicationsOfficer',
        'territoryOfficer',
        'eventCommander',
        'diplomacyOfficer',
        'recruitmentOfficer',
      ];

      roles.forEach((role, index) => {
        alliance.addMember(`officer-${index}`, ALLIANCE_RANKS.R4);
        alliance.assignOfficerRole(`officer-${index}`, role, alliance.leader);
      });

      expect(alliance.areAllOfficerPositionsFilled()).toBe(true);
    });
  });

  describe('Rank Bonuses', () => {
    test('should return correct bonuses for R1', () => {
      const bonuses = alliance.getRankBonuses(ALLIANCE_RANKS.R1);
      expect(bonuses.gathering).toBe(0.01);
      expect(bonuses.construction).toBe(0.01);
    });

    test('should return correct bonuses for R5', () => {
      const bonuses = alliance.getRankBonuses(ALLIANCE_RANKS.R5);
      expect(bonuses.march).toBe(0.05);
      expect(bonuses.construction).toBe(0.05);
    });
  });

  describe('United Command Bonus', () => {
    test('should return 0 bonuses when not all officers are assigned', () => {
      const bonus = alliance.getUnitedCommandBonus();
      expect(bonus.gathering).toBe(0);
      expect(bonus.construction).toBe(0);
    });

    test('should return bonuses when all officers are assigned', () => {
      const roles: Array<'warCommander' | 'communicationsOfficer' | 'territoryOfficer' | 'eventCommander' | 'diplomacyOfficer' | 'recruitmentOfficer'> = [
        'warCommander',
        'communicationsOfficer',
        'territoryOfficer',
        'eventCommander',
        'diplomacyOfficer',
        'recruitmentOfficer',
      ];

      roles.forEach((role, index) => {
        alliance.addMember(`officer-${index}`, ALLIANCE_RANKS.R4);
        alliance.assignOfficerRole(`officer-${index}`, role, alliance.leader);
      });

      const bonus = alliance.getUnitedCommandBonus();
      expect(bonus.gathering).toBe(0.02);
      expect(bonus.construction).toBe(0.02);
      expect(bonus.research).toBe(0.02);
      expect(bonus.training).toBe(0.02);
    });
  });

  describe('Member Activity', () => {
    test('should update member activity', () => {
      alliance.addMember('player-1');
      const result = alliance.updateMemberActivity('player-1', {
        power: 1000,
        commandCenterLevel: 5,
      });
      expect(result).toBe(true);
      const activity = alliance.getMemberActivityStatus('player-1');
      expect(activity?.power).toBe(1000);
      expect(activity?.commandCenterLevel).toBe(5);
    });

    test('should set member away status', () => {
      alliance.addMember('player-1');
      const result = alliance.setMemberAwayStatus('player-1', 'vacation');
      expect(result).toBe(true);
      const activity = alliance.getMemberActivityStatus('player-1');
      expect(activity?.awayStatus).toBe('vacation');
    });
  });

  describe('Diplomacy', () => {
    test('should set diplomatic relations', () => {
      alliance.setRelation('alliance-2', 'nap');
      const relation = alliance.getRelation('alliance-2');
      expect(relation).toBe('nap');
    });

    test('should record treaty violations', () => {
      alliance.recordViolation('player-1', 'nap_breach');
      alliance.recordViolation('player-1', 'nap_breach');
      expect(alliance.betrayalStatus).toBe('restricted');
    });
  });
});
