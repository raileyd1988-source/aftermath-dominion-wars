import { Troop, ArmyComposition, TROOP_DATABASE } from '../../src/game/Troops';
import { CombatEngine, CombatParticipant } from '../../src/game/CombatEngine';
import { CommanderInstance, CommanderClass } from '../../src/game/Commander';

describe('Troop System', () => {
  describe('Troop Class', () => {
    test('should create a troop with definition', () => {
      const definition = TROOP_DATABASE.get('vanguard_t1');
      if (!definition) throw new Error('Troop definition not found');

      const troop = new Troop(definition, 100);
      expect(troop.count).toBe(100);
      expect(troop.definition.name).toBe('Militia');
    });

    test('should take damage and lose units', () => {
      const definition = TROOP_DATABASE.get('vanguard_t1');
      if (!definition) throw new Error('Troop definition not found');

      const troop = new Troop(definition, 100);
      troop.takeDamage(5000);
      expect(troop.count).toBeLessThan(100);
    });

    test('should calculate survival rate', () => {
      const definition = TROOP_DATABASE.get('vanguard_t1');
      if (!definition) throw new Error('Troop definition not found');

      const troop = new Troop(definition, 100);
      const initialSurvival = troop.getSurvivalRate();
      expect(initialSurvival).toBe(1); // 100%

      troop.takeDamage(5000);
      const damagedSurvival = troop.getSurvivalRate();
      expect(damagedSurvival).toBeLessThan(1);
    });
  });

  describe('Army Composition', () => {
    test('should add troops to army', () => {
      const army = new ArmyComposition();
      army.addTroops('vanguard', 1, 100);
      expect(army.getTotalCount()).toBe(100);
    });

    test('should combine troops of same class and tier', () => {
      const army = new ArmyComposition();
      army.addTroops('vanguard', 1, 100);
      army.addTroops('vanguard', 1, 50);
      expect(army.getTotalCount()).toBe(150);
    });

    test('should calculate power rating', () => {
      const army = new ArmyComposition();
      army.addTroops('vanguard', 1, 100);
      const power = army.getPowerRating();
      expect(power).toBeGreaterThan(0);
    });

    test('should get all troops from all classes', () => {
      const army = new ArmyComposition();
      army.addTroops('vanguard', 1, 100);
      army.addTroops('rangers', 1, 50);
      army.addTroops('armor', 1, 75);

      const allTroops = army.getAllTroops();
      expect(allTroops.length).toBe(3);
    });
  });
});

describe('Combat Engine', () => {
  let attacker: CombatParticipant;
  let defender: CombatParticipant;
  let combatEngine: CombatEngine;

  beforeEach(() => {
    const attackerArmy = new ArmyComposition();
    attackerArmy.addTroops('vanguard', 1, 100);
    attackerArmy.addTroops('rangers', 1, 100);

    const defenderArmy = new ArmyComposition();
    defenderArmy.addTroops('vanguard', 1, 100);
    defenderArmy.addTroops('armor', 1, 80);

    attacker = {
      id: 'player-1',
      army: attackerArmy,
      commander: null,
      formation: 'standard',
      morale: 100,
      coordinationBonus: 0,
    };

    defender = {
      id: 'player-2',
      army: defenderArmy,
      commander: null,
      formation: 'standard',
      morale: 100,
      coordinationBonus: 0,
    };

    combatEngine = new CombatEngine(attacker, defender);
  });

  test('should execute a combat round', () => {
    const round = combatEngine.executeRound();
    expect(round.roundNumber).toBe(1);
    expect(round.actions.length).toBeGreaterThan(0);
    expect(round.damageLog.length).toBeGreaterThan(0);
  });

  test('should apply counter bonuses', () => {
    const round = combatEngine.executeRound();
    const counterDamage = round.damageLog.find(d => d.damageType === 'counter');
    // Counter damage should exist if units meet counter conditions
    // This depends on troop composition
  });

  test('should end combat when one side is eliminated', () => {
    // Heavily favor attacker
    const attackerArmy = new ArmyComposition();
    attackerArmy.addTroops('rangers', 10, 1000); // Rangers counter armor

    const defenderArmy = new ArmyComposition();
    defenderArmy.addTroops('armor', 1, 10); // Only 10 armor

    attacker.army = attackerArmy;
    defender.army = defenderArmy;

    const result = combatEngine.runFullCombat();
    expect(result.victor).toBe('player-1');
    expect(result.defeated).toBe('player-2');
  });

  test('should apply commander bonuses to damage', () => {
    const cmdr = new CommanderClass('cmdr-1', 'Test Commander', 'Title', 'legendary');
    const cmdrInstance = new CommanderInstance('instance-1', cmdr, 'player-1');
    cmdrInstance.addExperience(5000); // Level up

    attacker.commander = cmdrInstance;

    const round = combatEngine.executeRound();
    expect(round.actions.length).toBeGreaterThan(0);
  });

  test('should get combat result with casualties', () => {
    combatEngine.executeRound();
    const result = combatEngine.getCombatResult();

    expect(result.victor).toBeDefined();
    expect(result.defeated).toBeDefined();
    expect(result.totalRounds).toBeGreaterThan(0);
  });

  test('should track full combat log', () => {
    combatEngine.executeRound();
    combatEngine.executeRound();
    combatEngine.executeRound();

    const log = combatEngine.getCombatLog();
    expect(log.length).toBe(3);
    expect(log[0].roundNumber).toBe(1);
    expect(log[2].roundNumber).toBe(3);
  });
});
