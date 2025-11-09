import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BombPartyTournament } from '../../modules/bombparty/tournament/BombPartyTournament.ts';
import { BombPartyRoomManager } from '../../modules/bombparty/RoomManager.ts';

// Minimal mock for RoomManager methods used by tournament
class MockRoomManager extends BombPartyRoomManager {
  constructor() { super(); }
  // Override to skip actual game engine complexity in tests
  createRoom(creatorId: string, roomName: string, isPrivate: boolean, password?: string, maxPlayers?: number) {
    return { success: true, roomId: `${roomName}-${Date.now()}`, maxPlayers: maxPlayers || 2 };
  }
  joinRoom(playerId: string, roomId: string) { return { success: true, players: [], maxPlayers: 2 }; }
  startGame(playerId: string, roomId: string) { return { success: true }; }
  leaveRoom(playerId: string, roomId: string) { return { success: true }; }
}

describe('BombPartyTournament flow & progression', () => {
  let roomManager: MockRoomManager;
  let events: Array<{ event: string; payload: any }>;
  let tournament: BombPartyTournament;

  const broadcastToPlayers = (playerIds: string[], event: string, payload: any) => {
    events.push({ event, payload });
  };

  beforeEach(() => {
    if (typeof jest !== 'undefined' && jest.useFakeTimers) {
      jest.useFakeTimers();
    }
    roomManager = new MockRoomManager();
    events = [];
    tournament = new BombPartyTournament({
      id: 'test-t-1',
      capacity: 4,
      roomManager,
      onEnd: () => {},
      broadcastToPlayers
    });
  });

  it('should allow 4 players to join and auto-start', () => {
    for (let i = 1; i <= 4; i++) {
      const ok = tournament.join({ id: `P${i}`, name: `Player${i}`, ws: {} });
      expect(ok).toBe(true);
    }
    const info = tournament.getTournamentInfo();
    expect(info.players.length).toBe(4);
    // Fast-forward the auto-start timeout
    if (jest.advanceTimersByTime) jest.advanceTimersByTime(1500);
    expect(events.some(e => e.event === 'bp:tournament:started')).toBe(true);
    // Bracket built
    const bracket = tournament.getBracketStatus();
    expect(bracket).toBeDefined();
    expect(bracket?.rounds[0].matches.length).toBe(2); // 4 players -> 2 matches first round
  });

  it('should emit player_forfeit when handleForfeit invoked', () => {
    // Join and start
    for (let i = 1; i <= 4; i++) {
      tournament.join({ id: `P${i}`, name: `Player${i}`, ws: {} });
    }
    if (jest.advanceTimersByTime) jest.advanceTimersByTime(1500);
    // Force a forfeit by directly calling private via casting (simulate scenario)
    // We locate an in-progress match after start round
    const bracket = tournament.getBracketStatus();
    const firstMatch = bracket?.rounds[0].matches[0];
    expect(firstMatch).toBeDefined();
    // Simulate forfeit: access private method via any cast
    (tournament as any).handleForfeit(firstMatch!.players[0].id);
    expect(events.some(e => e.event === 'bp:tournament:player_forfeit')).toBe(true);
    expect(events.some(e => e.event === 'bp:tournament:match_ended')).toBe(true);
  });

  it('should emit updated events on state changes', () => {
    tournament.join({ id: 'A', name: 'A', ws: {} });
    tournament.join({ id: 'B', name: 'B', ws: {} });
    tournament.join({ id: 'C', name: 'C', ws: {} });
    tournament.join({ id: 'D', name: 'D', ws: {} });
    if (jest.advanceTimersByTime) jest.advanceTimersByTime(1500);
    const updatedEvents = events.filter(e => e.event === 'bp:tournament:updated');
    expect(updatedEvents.length).toBeGreaterThan(0);
  });

  it('should progress through rounds and finish the tournament', () => {
    // Join 4 players (A,B,C,D)
    const ids = ['A','B','C','D'];
    ids.forEach(id => tournament.join({ id, name: id, ws: {} }));

    // Auto-start delay
    if (jest.advanceTimersByTime) jest.advanceTimersByTime(1500);

    // Capture bracket and finish round 1 matches
    let bracket = tournament.getBracketStatus();
    expect(bracket?.currentRound).toBe(1);
    const r1 = bracket!.rounds[0];
    expect(r1.matches.length).toBe(2);

    // Force winners for both matches = first player wins
    r1.matches.forEach(m => {
      const winnerId = m.players[0].id;
      tournament.handleMatchEnd(m.matchId, winnerId, 'victory');
    });

    // Round end triggers next round after 5s
    if (jest.advanceTimersByTime) jest.advanceTimersByTime(5000);

    // Round 2 should be started
    bracket = tournament.getBracketStatus();
    expect(bracket?.currentRound).toBe(2);
    const r2 = bracket!.rounds[1];
    expect(r2.matches.length).toBe(1);

    // Finish final
    const finalMatch = r2.matches[0];
    const finalWinner = finalMatch.players[0]?.id || finalMatch.players[1]?.id;
    expect(finalWinner).toBeDefined();
    tournament.handleMatchEnd(finalMatch.matchId, finalWinner!, 'victory');

    // Tournament finished event emitted
    expect(events.some(e => e.event === 'bp:tournament:finished')).toBe(true);
    const info = tournament.getTournamentInfo();
    expect(info.status).toBe('FINISHED');
    expect(info.winnerId).toBe(finalWinner);
  });
});
