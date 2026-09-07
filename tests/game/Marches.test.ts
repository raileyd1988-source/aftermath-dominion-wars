import { March, MarchManager } from '../../src/game/March';
import { Rally, RallyManager } from '../../src/game/Rally';
import { DefenseManager, ServerDefense } from '../../src/game/Defense';
import { ArmyComposition } from '../../src/game/Troops';
import { CommanderClass, CommanderInstance } from '../../src/game/Commander';

describe('March System', () => {
  let manager: MarchManager;
  let army: ArmyComposition;
  let commander: CommanderInstance;

  beforeEach(() => {
    manager = new MarchManager('player-1', 5);

    army = new ArmyComposition();
    army.addTroops('vanguard', 1, 100);
    army.addTroops('rangers', 1, 100);

    const cmdr = new CommanderClass('cmdr-1', 'Test Commander', 'Title', 'epic');
    commander = new CommanderInstance('instance-1', cmdr, 'player-1');
  });

  test('should create a march', () => {
    const march = manager.createMarch({ x: 0, y: 0 }, { x: 100, y: 100 }, army, commander, 'assault');
    expect(march).not.toBeNull();
    expect(march?.type).toBe('assault');
  });

  test('should calculate march distance', () => {
    const march = manager.createMarch({ x: 0, y: 0 }, { x: 100, y: 0 }, army, commander, 'assault');
    expect(march?.distanceTiles).toBe(100);
  });

  test('should start march and set times', () => {
    const march = manager.createMarch({ x: 0, y: 0 }, { x: 100, y: 100 }, army, commander, 'assault');
    if (!march) throw new Error('March not created');

    march.startMarch();
    expect(march.status).toBe('marching');
    expect(march.departureTime).toBeDefined();
    expect(march.arrivalTime).toBeDefined();
  });

  test('should recall march', () => {
    const march = manager.createMarch({ x: 0, y: 0 }, { x: 100, y: 100 }, army, commander, 'assault');
    if (!march) throw new Error('March not created');

    march.startMarch();
    const recalled = march.recall();
    expect(recalled).toBe(true);
    expect(march.status).toBe('recalled');
  });

  test('should get active marches', () => {
    manager.createMarch({ x: 0, y: 0 }, { x: 100, y: 100 }, army, commander, 'assault');
    manager.createMarch({ x: 0, y: 0 }, { x: 200, y: 200 }, army, commander, 'hunter');

    const active = manager.getActiveMarches();
    expect(active.length).toBe(2);
  });
});

describe('Rally System', () => {
  let allianceMock: any;
  let rallyManager: RallyManager;
  let marchManager: MarchManager;
  let army: ArmyComposition;
  let commander: CommanderInstance;

  beforeEach(() => {
    allianceMock = {
      id: 'alliance-1',
      members: new Map([
        ['player-1', { playerId: 'player-1', rank: 5 }],
        ['player-2', { playerId: 'player-2', rank: 2 }],
        ['player-3', { playerId: 'player-3', rank: 2 }],
      ]),
    };

    rallyManager = new RallyManager(allianceMock);
    marchManager = new MarchManager('player-1', 5);

    army = new ArmyComposition();
    army.addTroops('vanguard', 1, 100);

    const cmdr = new CommanderClass('cmdr-1', 'Test Commander', 'Title', 'epic');
    commander = new CommanderInstance('instance-1', cmdr, 'player-1');
  });

  test('should create a rally', () => {
    const rally = rallyManager.createRally('player-1', { x: 100, y: 100 }, 'assault');
    expect(rally).not.toBeNull();
    expect(rally?.config.leaderId).toBe('player-1');
  });

  test('should not allow non-officers to create rally', () => {
    const rally = rallyManager.createRally('player-2', { x: 100, y: 100 }, 'assault');
    expect(rally).toBeNull();
  });

  test('should add members to rally', () => {
    const rally = rallyManager.createRally('player-1', { x: 100, y: 100 }, 'assault');
    if (!rally) throw new Error('Rally not created');

    rally.addMember('player-2', 'march-1', 500);
    expect(rally.members.size).toBe(1);
  });

  test('should start rally with minimum members', () => {
    const rally = rallyManager.createRally('player-1', { x: 100, y: 100 }, 'assault');
    if (!rally) throw new Error('Rally not created');

    rally.addMember('player-2', 'march-1', 500);
    const started = rally.startRally();
    expect(started).toBe(true);
    expect(rally.status).toBe('marching');
  });

  test('should track rally casualties', () => {
    const rally = rallyManager.createRally('player-1', { x: 100, y: 100 }, 'assault');
    if (!rally) throw new Error('Rally not created');

    rally.recordCasualties('player-1', 50);
    rally.recordCasualties('player-2', 30);

    expect(rally.getTotalCasualties()).toBe(80);
  });

  test('should get rally statistics', () => {
    const rally = rallyManager.createRally('player-1', { x: 100, y: 100 }, 'assault');
    if (!rally) throw new Error('Rally not created');

    rally.addMember('player-2', 'march-1', 500);
    const stats = rally.getStats();

    expect(stats.participants).toBe(1);
    expect(stats.totalTroops).toBe(500);
  });
});

describe('Defense System', () => {
  let defense: DefenseManager;
  let serverDefense: ServerDefense;

  beforeEach(() => {
    defense = new DefenseManager('player-1', { x: 0, y: 0 });
    serverDefense = new ServerDefense('server-1');
  });

  test('should add defense troops', () => {
    defense.addDefenseTroops('vanguard', 1, 100);
    const power = defense.getTotalDefensePower();
    expect(power).toBeGreaterThan(0);
  });

  test('should activate shield', () => {
    const activated = defense.activateShield(60); // 60 minutes
    expect(activated).toBe(true);
    expect(defense.isShieldActive()).toBe(true);
  });

  test('should not activate multiple shields', () => {
    defense.activateShield(60);
    const secondActivate = defense.activateShield(60);
    expect(secondActivate).toBe(false);
  });

  test('should register incoming attacks', () => {
    defense.registerIncomingAttack({
      marchId: 'march-1',
      attackerId: 'player-2',
      arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
      troopCount: 500,
      marchType: 'assault',
    });

    const incoming = defense.getIncomingAttacks();
    expect(incoming.length).toBe(1);
  });

  test('should identify urgent attacks', () => {
    defense.registerIncomingAttack({
      marchId: 'march-1',
      attackerId: 'player-2',
      arrivalTime: new Date(Date.now() + 2 * 60 * 1000),
      troopCount: 500,
      marchType: 'assault',
    });

    const urgent = defense.getUrgentAttacks();
    expect(urgent.length).toBe(1);
  });

  test('should log server attacks', () => {
    serverDefense.logAttack('player-1', 'player-2', 'victory', 100, 200);
    const stats = serverDefense.getAttackStats();

    expect(stats.totalAttacks).toBe(1);
    expect(stats.successRate).toBe(1); // 100% win rate
  });
});
