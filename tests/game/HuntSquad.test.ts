import { HuntSquad, HuntSquadManager } from './HuntSquad';

describe('Hunt Squad System', () => {
  let allianceMock: any;
  let manager: HuntSquadManager;

  beforeEach(() => {
    allianceMock = {
      id: 'alliance-1',
      leader: 'leader-1',
      members: new Map([
        ['player-1', { playerId: 'player-1', rank: 2 }],
        ['player-2', { playerId: 'player-2', rank: 2 }],
        ['player-3', { playerId: 'player-3', rank: 2 }],
      ]),
    };

    manager = new HuntSquadManager(allianceMock);
  });

  describe('Squad Creation', () => {
    test('should create a new hunt squad', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      expect(squad).not.toBeNull();
      expect(squad?.leaderId).toBe('player-1');
      expect(squad?.members.size).toBe(1); // Leader auto-added
    });

    test('should not create squad for non-member', () => {
      const squad = manager.createSquad('unknown-player', 'boss-1', 'boss');
      expect(squad).toBeNull();
    });
  });

  describe('Squad Membership', () => {
    test('should add members to squad', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      const result = squad.addMember('player-2', 'commander-2', 500);
      expect(result).toBe(true);
      expect(squad.members.size).toBe(2);
    });

    test('should not exceed max members', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      for (let i = 2; i <= 6; i++) {
        const mockPlayerId = `player-${i}`;
        if (i <= 5) {
          squad.addMember(mockPlayerId, `commander-${i}`, 500);
        }
      }

      // Try to add 6th member (should fail - max is leader + 5)
      const result = squad.addMember('player-6', 'commander-6', 500);
      expect(result).toBe(false);
    });
  });

  describe('Squad Operations', () => {
    test('should start march to target', () => {
      const squad = manager.createSquad('player-1', { x: 100, y: 100 }, 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 500);
      const result = squad.startMarch({ x: 150, y: 150 });

      expect(result).toBe(true);
      expect(squad.status).toBe('marching');
    });

    test('should not start march with insufficient members', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      // Only leader, no hunters
      const result = squad.startMarch({ x: 150, y: 150 });
      expect(result).toBe(false);
    });

    test('should engage combat after arrival', () => {
      const squad = manager.createSquad('player-1', { x: 100, y: 100 }, 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 500);
      squad.startMarch({ x: 150, y: 150 });
      const result = squad.arriveAtTarget();

      expect(result).toBe(true);
      expect(squad.status).toBe('engaged');
      expect(squad.combatLog).toBeDefined();
    });
  });

  describe('Squad Commands', () => {
    test('should issue hold order', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 500);
      squad.startMarch({ x: 150, y: 150 });
      squad.arriveAtTarget();

      const result = squad.issueOrder('hold');
      expect(result).toBe(true);
      expect(squad.orderHistory.length).toBeGreaterThan(0);
    });

    test('should increase coordination bonus on surround', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 500);
      const initialBonus = squad.coordinationBonus;
      squad.issueOrder('surround');

      expect(squad.coordinationBonus).toBeGreaterThan(initialBonus);
    });
  });

  describe('Squad Stats', () => {
    test('should calculate squad stats', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 500);
      squad.addMember('player-3', 'commander-3', 600);

      const stats = squad.getSquadStats();
      expect(stats.totalMembers).toBe(3);
      expect(stats.totalTroops).toBe(2100); // 1000 + 500 + 600
    });

    test('should apply formation bonus to combat rating', () => {
      const squad = manager.createSquad('player-1', 'boss-1', 'boss');
      if (!squad) throw new Error('Squad not created');

      squad.addMember('player-2', 'commander-2', 1000);
      const standardRating = squad.getCombatRating();

      squad.setFormation('phalanx');
      const phalanxRating = squad.getCombatRating();

      expect(phalanxRating).toBeGreaterThan(standardRating);
    });
  });

  describe('Squad Manager', () => {
    test('should get active squads', () => {
      manager.createSquad('player-1', 'boss-1', 'boss');
      manager.createSquad('player-2', 'boss-2', 'boss');

      const active = manager.getActiveSquads();
      expect(active.length).toBe(2);
    });

    test('should get squads by leader', () => {
      manager.createSquad('player-1', 'boss-1', 'boss');
      manager.createSquad('player-1', 'boss-2', 'boss');
      manager.createSquad('player-2', 'boss-3', 'boss');

      const squads = manager.getSquadsByLeader('player-1');
      expect(squads.length).toBe(2);
    });
  });
});
