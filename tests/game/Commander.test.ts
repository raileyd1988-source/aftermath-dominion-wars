import { CommanderClass, CommanderInstance, CommanderCollection } from '../../src/game/Commander';

describe('Commander System', () => {
  let commander: CommanderClass;
  let collection: CommanderCollection;

  beforeEach(() => {
    commander = new CommanderClass('cmdr-iron-kane', 'Marcus "Iron" Kane', 'Iron Warlord', 'legendary');
    commander.description = 'A battle-hardened military commander';
    commander.baseStats = { attack: 150, defense: 120, hp: 200, march: 130, gathering: 80 };

    collection = new CommanderCollection('player-1');
  });

  describe('Commander Class', () => {
    test('should create a commander class', () => {
      expect(commander.name).toBe('Marcus "Iron" Kane');
      expect(commander.rarity).toBe('legendary');
    });

    test('should add skills to commander', () => {
      commander.addSkill({
        id: 'skill-1',
        name: 'Iron Will',
        description: '+20% attack',
        type: 'attack',
        value: 20,
        tier: 1,
      });

      expect(commander.skills.length).toBe(1);
    });

    test('should calculate stat at level', () => {
      const statLevel10 = commander.getStatAtLevel('attack', 10);
      const baseStat = commander.baseStats.attack;
      expect(statLevel10).toBeGreaterThan(baseStat);
    });
  });

  describe('Commander Instance', () => {
    test('should create a commander instance', () => {
      const instance = new CommanderInstance('instance-1', commander, 'player-1');
      expect(instance.currentLevel).toBe(1);
      expect(instance.starLevel).toBe(1);
    });

    test('should add experience and level up', () => {
      const instance = new CommanderInstance('instance-1', commander, 'player-1');
      const leveledUp = instance.addExperience(1000);

      expect(leveledUp).toBe(true);
      expect(instance.currentLevel).toBe(2);
    });

    test('should add fragments and promote', () => {
      const instance = new CommanderInstance('instance-1', commander, 'player-1');
      const promoted = instance.addFragments(10);

      expect(promoted).toBe(true);
      expect(instance.starLevel).toBe(2);
    });

    test('should calculate total attack bonus', () => {
      const instance = new CommanderInstance('instance-1', commander, 'player-1');
      instance.addFragments(10); // Promote to 2-star

      const bonus = instance.getTotalAttackBonus();
      expect(bonus).toBeGreaterThan(commander.baseStats.attack);
    });

    test('should equip items on commander', () => {
      const instance = new CommanderInstance('instance-1', commander, 'player-1');
      const result = instance.equipItem('weapon', 'sword-1');

      expect(result).toBe(true);
      expect(instance.equipment.get('weapon')).toBe('sword-1');
    });
  });

  describe('Commander Collection', () => {
    test('should add commander to collection', () => {
      const instance = collection.addCommander(commander);
      expect(instance).not.toBeNull();
      expect(collection.commanders.size).toBe(1);
    });

    test('should get commander by ID', () => {
      const instance = collection.addCommander(commander);
      const retrieved = collection.getCommander(instance.id);
      expect(retrieved).toBe(instance);
    });

    test('should get all commanders', () => {
      collection.addCommander(commander);
      const c2 = new CommanderClass('cmdr-2', 'Commander Two', 'Title', 'epic');
      collection.addCommander(c2);

      expect(collection.getAllCommanders().length).toBe(2);
    });

    test('should get commanders by rarity', () => {
      collection.addCommander(commander); // legendary
      const c2 = new CommanderClass('cmdr-2', 'Commander Two', 'Title', 'epic');
      collection.addCommander(c2);

      const legendaries = collection.getCommandersByRarity('legendary');
      expect(legendaries.length).toBe(1);
    });

    test('should calculate total commander power', () => {
      collection.addCommander(commander);
      const c2 = new CommanderClass('cmdr-2', 'Commander Two', 'Title', 'epic');
      collection.addCommander(c2);

      const power = collection.getTotalCommanderPower();
      expect(power).toBeGreaterThan(0);
    });
  });
});
