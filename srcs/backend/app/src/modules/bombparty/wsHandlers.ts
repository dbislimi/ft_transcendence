import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { BombPartyRoomManager } from './RoomManager.ts';
import { BombPartyWSServer } from './wsServer.ts';
import { 
  validateClientMessage, 
  validatePlayerName,
  validateAuthMessage
} from './validation.ts';
import { ErrorCode } from './types.ts';
import { v4 as uuidv4 } from 'uuid';

interface WSSession {
  playerId?: string;
  playerName?: string;
  roomId?: string;
  authenticated: boolean;
}

export default async function bombPartyWSHandlers(fastify: FastifyInstance) {
  const roomManager = new BombPartyRoomManager();
  const wsServer = new BombPartyWSServer();

  function broadcastLobbyList(): void {
    const publicRooms = roomManager.getPublicRooms();
    wsServer.broadcastToAll({
      event: 'bp:lobby:list_updated',
      payload: {
        rooms: publicRooms
      }
    });
  }

  // WebSocket route for Bomb Party
  fastify.get('/bombparty/ws', { websocket: true }, (socket: WebSocket, request) => {
    const session: WSSession = {
      authenticated: false
    };

    wsServer.registerConnection(socket);


    function sendError(error: string, code: ErrorCode = ErrorCode.STATE_ERROR): void {
      wsServer.sendError(socket, error, code);
    }
    function sendMessage(message: any): void {
      wsServer.sendMessage(socket, message);
    }

    function authenticatePlayer(playerName: string): boolean {
      const nameResult = validatePlayerName(playerName);
      if (!nameResult.success) {
        sendError(nameResult.error || 'Nom invalide', nameResult.code || ErrorCode.VALIDATION_ERROR);
        return false;
      }

      session.playerId = uuidv4();
      session.playerName = nameResult.data!;
      session.authenticated = true;

      roomManager.registerPlayer(socket, session.playerId, session.playerName);
      wsServer.updateConnection(socket, session.playerId);
      return true;
    }

    function requireAuth(): boolean {
      if (!session.authenticated || !session.playerId) {
        sendError('Authentification requise', ErrorCode.AUTH_ERROR);
        return false;
      }
      return true;
    }

    socket.on('message', (data: Buffer) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        console.log(`[BombParty] Message received: ${rawMessage.event}`, rawMessage);

        if (rawMessage.event === 'bp:auth') {
          const validation = validateAuthMessage(rawMessage);
          if (!validation.success) {
            sendError(validation.error || 'Invalid authentication message', validation.code || ErrorCode.VALIDATION_ERROR);
            return;
          }
          
          if (authenticatePlayer(validation.data!.payload.playerName)) {
            sendMessage({
              event: 'bp:auth:success',
              payload: {
                playerId: session.playerId,
                playerName: session.playerName
              }
            });
          }
          return;
        }

        if (!requireAuth()) return;

        const validation = validateClientMessage(rawMessage);
        if (!validation.success) {
          sendError(validation.error || 'Invalid message', validation.code || ErrorCode.VALIDATION_ERROR);
          return;
        }

        const message = validation.data!;
        const playerId = session.playerId!;

        switch (message.event) {
          case 'bp:lobby:create':
            handleLobbyCreate(playerId, message.payload);
            break;

          case 'bp:lobby:join':
            handleLobbyJoin(playerId, message.payload);
            break;

          case 'bp:lobby:leave':
            handleLobbyLeave(playerId, message.payload);
            break;

          case 'bp:lobby:start':
            handleLobbyStart(playerId, message.payload);
            break;

          case 'bp:lobby:list':
            handleLobbyList(playerId, message.payload);
            break;

          case 'bp:lobby:details':
            handleLobbyDetails(playerId, message.payload);
            break;

          case 'bp:game:input':
            handleGameInput(playerId, message.payload);
            break;

          case 'bp:bonus:activate':
            handleBonusActivate(playerId, message.payload);
            break;

          case 'bp:room:subscribe':
            console.log(`[BombParty] Room subscribe ignored (not implemented): roomId=${message.payload?.roomId}`);
            break;

          default:
            sendError(`Event not supported: ${message.event}`, ErrorCode.VALIDATION_ERROR);
        }

      } catch (error) {
        console.error('[BombParty] Error processing message:', error);
        sendError('Error processing message', ErrorCode.STATE_ERROR);
      }
    });

    function handleLobbyCreate(playerId: string, payload: any): void {
      
      const result = roomManager.createRoom(
        playerId,
        payload.name,
        payload.isPrivate,
        payload.password,
        payload.maxPlayers
      );

      if (result.success && result.roomId) {
        session.roomId = result.roomId;
        wsServer.updateConnection(socket, session.playerId, result.roomId);
        
        sendMessage({
          event: 'bp:lobby:created',
          payload: {
            roomId: result.roomId,
            playerId,
            maxPlayers: result.maxPlayers
          }
        });
        
        const roomInfo = roomManager.getRoomInfo(result.roomId);
        if (roomInfo) {
          const playersList = Array.from(roomInfo.players.values()).map(p => ({
            id: p.id,
            name: p.name
          }));
          
          sendMessage({
            event: 'bp:lobby:joined',
            payload: {
              roomId: result.roomId,
              playerId,
              players: playersList,
              maxPlayers: result.maxPlayers,
              isHost: true
            }
          });
        }
        
        broadcastLobbyList();
      } else {
        sendError(result.error || 'Error creating lobby', ErrorCode.STATE_ERROR);
      }
    }

    function handleLobbyJoin(playerId: string, payload: any): void {
      const result = roomManager.joinRoom(playerId, payload.roomId, payload.password);

      if (result.success) {
        session.roomId = payload.roomId;
        wsServer.updateConnection(socket, session.playerId, payload.roomId);
        sendMessage({
          event: 'bp:lobby:joined',
          payload: {
            roomId: payload.roomId,
            playerId,
            players: result.players || [],
            maxPlayers: result.maxPlayers
          }
        });
      } else {
        let code: ErrorCode = ErrorCode.STATE_ERROR;
        if (result.error?.includes('non trouvée')) code = ErrorCode.STATE_ERROR;
        else if (result.error?.includes('pleine')) code = ErrorCode.STATE_ERROR;
        else if (result.error?.includes('mot de passe')) code = ErrorCode.AUTH_ERROR;
        else if (result.error?.includes('déjà dans')) code = ErrorCode.STATE_ERROR;

        sendError(result.error || 'Error joining lobby', code);
      }
    }

    function handleLobbyLeave(playerId: string, payload: any): void {
      const result = roomManager.leaveRoom(playerId, payload.roomId);

      if (result.success) {
        session.roomId = undefined;
        wsServer.updateConnection(socket, session.playerId);
        sendMessage({
          event: 'bp:lobby:left',
          payload: {
            roomId: payload.roomId,
            playerId
          }
        });
      } else {
        sendError(result.error || 'Error leaving lobby', ErrorCode.STATE_ERROR);
      }
    }
    function handleLobbyList(playerId: string, payload: any): void {
      const publicRooms = roomManager.getPublicRooms();
      console.log(`[BombParty] Sending lobby list: ${publicRooms.length} public rooms`, publicRooms.map(r => ({ id: r.id, name: r.name, players: r.players })));
      
      sendMessage({
        event: 'bp:lobby:list',
        payload: {
          rooms: publicRooms
        }
      });
    }

    function handleLobbyDetails(playerId: string, payload: any): void {
      const result = roomManager.getRoomDetails(payload.roomId);

      if (result.success) {
        sendMessage({
          event: 'bp:lobby:details',
          payload: {
            room: result.room
          }
        });
      } else {
        sendError(result.error || 'Lobby not found', ErrorCode.STATE_ERROR);
      }
    }

    function handleLobbyStart(playerId: string, payload: any): void {
      console.log(`[BombParty] handleLobbyStart called: playerId=${playerId}, roomId=${payload.roomId}`);
      const result = roomManager.startGame(playerId, payload.roomId);

      if (!result.success) {
        console.log(`[BombParty] Start error: ${result.error}`);
        sendError(result.error || 'Error starting game', ErrorCode.STATE_ERROR);
      } else {
        console.log(`[BombParty] Start successful for roomId=${payload.roomId}`);
      }
    }

    function handleGameInput(playerId: string, payload: any): void {
      const result = roomManager.handleGameInput(
        playerId,
        payload.roomId,
        payload.word,
        payload.msTaken
      );

      if (!result.success) {
        sendError(result.error || 'Error game input', ErrorCode.STATE_ERROR);
      }
    }

    function handleBonusActivate(playerId: string, payload: any): void {
      const result = roomManager.activateBonus(
        playerId,
        payload.roomId,
        payload.bonusKey
      );

      if (!result.success) {
        sendError(result.error || 'Error activating bonus', ErrorCode.STATE_ERROR);
      }
    }

    socket.on('close', (code: number, reason: Buffer) => {
      if (session.playerId && session.roomId) {
        roomManager.leaveRoom(session.playerId, session.roomId);
      }
    });

    socket.on('error', (error: Error) => {
      console.error('[BombParty] WebSocket error:', error);
    });

    sendMessage({
      event: 'bp:welcome',
      payload: {
        message: 'Bomb Party connection established',
        version: '1.0.0'
      }
    });
  });

}

export class BombPartyWSManager {
  private static instance: BombPartyRoomManager | null = null;

  /**
   * Obtient l'instance du RoomManager (pour les tests)
   */
  static getRoomManager(): BombPartyRoomManager | null {
    return this.instance;
  }

  static setRoomManager(manager: BombPartyRoomManager): void {
    this.instance = manager;
  }
}
