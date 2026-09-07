import { GameServer } from '../../src/game/GameServer';
import { CrossServerSystem, Invasion } from '../../src/game/CrossServer';
import { Alliance } from '../../src/game/Alliance';
import { Dominion } from '../../src/game/Dominion';

describe('Game Server System', () => {
  let server: GameServer;
  let dominion: Dominion;
  let alliance: Alliance;

  beforeEach(() => {
    server = new GameServer('server-1', 'Test Server', 'US');
    dominion = new Dominion('player-1', 'My Base');
    alliance = new Alliance('alliance-1', 'Test Alliance', 'leader-1');
  });

  test('should register player on server', () => {
    const registered = server.registerPlayer('player-1', 'alliance-1', dominion);
    expect(registered).toBe(true);
    expect(server.players.size).toBe(1);
  });

  test('should not register duplicate player', () => {
    server.registerPlayer('player-1', 'alliance-1', dominion);
    const duplicate = server.registerPlayer('player-1', 'alliance-1', dominion);
    expect(duplicate).toBe(false);
  });

  test('should register alliance on server', () => {
    const registered = server.registerAlliance(alliance);
    expect(registered).toBe(true);
    expect(server.alliances.size).toBe(1);
  });

  test('should award dominion points', () => {
    server.registerPlayer('player-1', 'alliance-1', dominion);
    const awarded = server.awardDominionPoints('player-1', 100, 'pvp');
    expect(awarded).toBe(true);

    const player = server.players.get('player-1');
    expect(player?.contribution).toBe(100);
  });

  test('should track alliance points', () => {
    server.registerAlliance(alliance);
    server.registerPlayer('player-1', 'alliance-1', dominion);
    server.registerPlayer('player-2', 'alliance-1', dominion);

    server.awardDominionPoints('player-1', 100, 'pvp');
    server.awardDominionPoints('player-2', 150, 'boss');

    const alliancePoints = server.getAlliancePoints('alliance-1');
    expect(alliancePoints).toBe(250);
  });

  test('should get alliance ranking', () => {
    const alliance2 = new Alliance('alliance-2', 'Alliance 2', 'leader-2');
    server.registerAlliance(alliance);
    server.registerAlliance(alliance2);

    server.registerPlayer('player-1', 'alliance-1', dominion);
    server.registerPlayer('player-2', 'alliance-2', dominion);

    server.awardDominionPoints('player-1', 100, 'pvp');
    server.awardDominionPoints('player-2', 200, 'pvp');

    const alliance1Rank = server.getAllianceRanking('alliance-1');
    const alliance2Rank = server.getAllianceRanking('alliance-2');

    expect(alliance2Rank).toBeLessThan(alliance1Rank);
  });

  test('should get top alliances', () => {
    const alliance2 = new Alliance('alliance-2', 'Alliance 2', 'leader-2');
    server.registerAlliance(alliance);
    server.registerAlliance(alliance2);

    server.registerPlayer('player-1', 'alliance-1', dominion);
    server.registerPlayer('player-2', 'alliance-2', dominion);

    server.awardDominionPoints('player-1', 100, 'pvp');
    server.awardDominionPoints('player-2', 200, 'pvp');

    const topAlliances = server.getTopAlliances(10);
    expect(topAlliances.length).toBe(2);
    expect(topAlliances[0].alliance.id).toBe('alliance-2');
  });
});

describe('Cross Server System', () => {
  let crossServer: CrossServerSystem;
  let server1: GameServer;
  let server2: GameServer;
  let alliance1: Alliance;
  let alliance2: Alliance;
  let dominion1: Dominion;
  let dominion2: Dominion;

  beforeEach(() => {
    crossServer = new CrossServerSystem();
    server1 = new GameServer('server-1', 'Server 1', 'US');
    server2 = new GameServer('server-2', 'Server 2', 'EU');

    alliance1 = new Alliance('alliance-1', 'Alliance 1', 'leader-1');
    alliance2 = new Alliance('alliance-2', 'Alliance 2', 'leader-2');

    dominion1 = new Dominion('player-1', 'Base 1');
    dominion2 = new Dominion('player-2', 'Base 2');

    crossServer.registerServer(server1);
    crossServer.registerServer(server2);

    server1.registerAlliance(alliance1);
    server2.registerAlliance(alliance2);

    server1.registerPlayer('player-1', 'alliance-1', dominion1);
    server2.registerPlayer('player-2', 'alliance-2', dominion2);
  });

  test('should register servers in cross-server system', () => {
    expect(crossServer.servers.size).toBe(2);
  });

  test('should initiate invasion', () => {
    const invasion = crossServer.initiateInvasion('server-1', 'server-2');
    expect(invasion).not.toBeNull();
    expect(invasion?.phase).toBe('preparation');
  });

  test('should create invasion corridor', () => {
    const invasion = crossServer.initiateInvasion('server-1', 'server-2');
    if (!invasion) throw new Error('Invasion not created');

    const corridor = invasion.createCorridor('corridor-1', { x: 100, y: 100 }, 50, 120);
    expect(corridor.isOpen).toBe(true);
    expect(invasion.corridors.size).toBe(1);
  });

  test('should begin invasion', () => {
    const invasion = crossServer.initiateInvasion('server-1', 'server-2');
    if (!invasion) throw new Error('Invasion not created');

    invasion.createCorridor('corridor-1', { x: 100, y: 100 });
    const began = invasion.beginInvasion();
    expect(began).toBe(true);
    expect(invasion.phase).toBe('invasion');
  });

  test('should conclude invasion and award unity boost', () => {
    const invasion = crossServer.initiateInvasion('server-1', 'server-2');
    if (!invasion) throw new Error('Invasion not created');

    invasion.createCorridor('corridor-1', { x: 100, y: 100 });
    invasion.beginInvasion();
    invasion.concludeInvasion('attacker_victory');

    expect(invasion.result).toBe('attacker_victory');
    expect(invasion.serverUnityBoost.get('server-1')).toBe(1000);
    expect(invasion.serverUnityBoost.get('server-2')).toBe(500);
  });

  test('should track server unity', () => {
    const unity = crossServer.getServerUnity('server-1');
    expect(unity).not.toBeNull();
    expect(unity?.unityLevel).toBe(1);

    unity?.addUnityPoints('alliance-1', 500);
    expect(unity?.unityPoints).toBe(500);
  });

  test('should level up server unity', () => {
    const unity = crossServer.getServerUnity('server-1');
    if (!unity) throw new Error('Unity not found');

    // Add 10,000 points to level up
    unity.addUnityPoints('alliance-1', 10000);
    expect(unity.unityLevel).toBe(2);
  });

  test('should get global server rankings', () => {
    server1.registerPlayer('player-3', 'alliance-1', new Dominion('player-3', 'Base 3'));
    server1.awardDominionPoints('player-1', 1000, 'pvp');
    server1.awardDominionPoints('player-3', 500, 'pvp');

    const rankings = crossServer.getGlobalServerRankings();
    expect(rankings.length).toBe(2);
  });

  test('should track invasions by server', () => {
    const invasion1 = crossServer.initiateInvasion('server-1', 'server-2');
    const invasion2 = crossServer.initiateInvasion('server-2', 'server-1');

    const server1Invasions = crossServer.getInvasionsForServer('server-1');
    expect(server1Invasions.length).toBe(2);
  });
});
