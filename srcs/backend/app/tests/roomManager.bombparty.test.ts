import { BombPartyRoomManager } from '../src/modules/bombparty/RoomManager';
import { v4 as uuidv4 } from 'uuid';

// Mock WebSocket
class MockWebSocket {
  public readyState = 1; // OPEN
  public onclose: ((code: number, reason: Buffer) => void) | null = null;
  public onerror: ((error: Error) => void) | null = null;
  
  send(data: string): void {
    // Mock implementation
  }
  
  close(code?: number, reason?: string): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(code || 1000, Buffer.from(reason || ''));
    }
  }
}

describe('BombPartyRoomManager', () => {
  let roomManager: BombPartyRoomManager;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;

  beforeEach(() => {
    roomManager = new BombPartyRoomManager();
    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
  });

  afterEach(() => {
    roomManager.cleanup();
  });

  describe('room creation', () => {
    it('should create public room', () => {
      const playerId = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, playerId, 'Player 1');
      
      const result = roomManager.createRoom(playerId, 'Test Room', false);
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      expect(result.maxPlayers).toBe(4);
    });

    it('should create private room with password', () => {
      const playerId = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, playerId, 'Player 1');
      
      const result = roomManager.createRoom(playerId, 'Private Room', true, 'password123');
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
    });

    it('should enforce player limits', () => {
      const playerId = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, playerId, 'Player 1');
      
      const result1 = roomManager.createRoom(playerId, 'Room 1', false, undefined, 1);
      expect(result1.success).toBe(false);
      
      const result2 = roomManager.createRoom(playerId, 'Room 2', false, undefined, 15);
      expect(result2.success).toBe(true);
      expect(result2.maxPlayers).toBe(12);
    });
  });

  describe('room joining', () => {
    let roomId: string;
    let player1Id: string;
    let player2Id: string;

    beforeEach(() => {
      player1Id = uuidv4();
      player2Id = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, player1Id, 'Player 1');
      roomManager.registerPlayer(mockWs2 as any, player2Id, 'Player 2');
      
      const createResult = roomManager.createRoom(player1Id, 'Test Room', false);
      roomId = createResult.roomId!;
    });

    it('should allow player to join room', () => {
      const result = roomManager.joinRoom(player2Id, roomId);
      
      expect(result.success).toBe(true);
      expect(result.players).toHaveLength(2);
    });

    it('should reject joining full room', () => {
      // Create room with max 2 players
      const player3Id = uuidv4();
      const mockWs3 = new MockWebSocket();
      roomManager.registerPlayer(mockWs3 as any, player3Id, 'Player 3');
      
      const createResult = roomManager.createRoom(player3Id, 'Small Room', false, undefined, 2);
      const smallRoomId = createResult.roomId!;
      
      // Join first player
      roomManager.joinRoom(player1Id, smallRoomId);
      
      // Try to join second player
      const result = roomManager.joinRoom(player2Id, smallRoomId);
      expect(result.success).toBe(true);
      
      // Try to join third player (should fail)
      const player4Id = uuidv4();
      const mockWs4 = new MockWebSocket();
      roomManager.registerPlayer(mockWs4 as any, player4Id, 'Player 4');
      const result2 = roomManager.joinRoom(player4Id, smallRoomId);
      expect(result2.success).toBe(false);
    });

    it('should reject wrong password for private room', () => {
      const privateRoomResult = roomManager.createRoom(player1Id, 'Private Room', true, 'correct123');
      const privateRoomId = privateRoomResult.roomId!;
      
      const result = roomManager.joinRoom(player2Id, privateRoomId, 'wrong123');
      expect(result.success).toBe(false);
    });
  });

  describe('room destruction', () => {
    it('should destroy room when empty', () => {
      const playerId = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, playerId, 'Player 1');
      
      const createResult = roomManager.createRoom(playerId, 'Test Room', false);
      const roomId = createResult.roomId!;
      
      // Room should exist
      expect(roomManager.getRoomInfo(roomId)).toBeDefined();
      
      // Leave room
      const leaveResult = roomManager.leaveRoom(playerId, roomId);
      expect(leaveResult.success).toBe(true);
      
      // Room should be destroyed
      expect(roomManager.getRoomInfo(roomId)).toBeUndefined();
    });

    it('should not destroy room when players remain', () => {
      const player1Id = uuidv4();
      const player2Id = uuidv4();
      roomManager.registerPlayer(mockWs1 as any, player1Id, 'Player 1');
      roomManager.registerPlayer(mockWs2 as any, player2Id, 'Player 2');
      
      const createResult = roomManager.createRoom(player1Id, 'Test Room', false);
      const roomId = createResult.roomId!;
      
      // Join second player
      roomManager.joinRoom(player2Id, roomId);
      
      // Leave first player
      roomManager.leaveRoom(player1Id, roomId);
      
      // Room should still exist
      expect(roomManager.getRoomInfo(roomId)).toBeDefined();
    });
  });
});
