import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { BombPartyRoomManager } from './RoomManager.ts';
import { BombPartyWSServer } from './wsServer.ts';
import { 
  validateClientMessage, 
  validatePlayerName,
  validateAuthMessage
} from './validation.ts';
import { ErrorCode } from './types.ts';
import { v4 as uuidv4 } from 'uuid';
import { bombPartyLogger } from './log.ts';

const JWT_SECRET = process.env.JWT_SECRET!;

interface WSSession {
  playerId?: string;
  playerName?: string;
  roomId?: string;
  authenticated: boolean;
}

export default async function bombPartyWSHandlers(fastify: FastifyInstance<any, any, any, any, any>) {
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

    // Vérifier le JWT dès l'upgrade
    let userId: number | undefined;
    let userAuthenticated = false;
    
    try {
      // Essayer de récupérer le token depuis query string ou headers
      let token: string | undefined;
      
      if (request.query && typeof request.query.token === 'string') {
        token = request.query.token;
      } else if (request.headers && request.headers.authorization) {
        const authHeader = request.headers.authorization as string;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      } else if (request.url && typeof request.url === 'string') {
        try {
          const url = new URL(`http://localhost${request.url}`);
          token = url.searchParams.get('token') || undefined;
        } catch (e) {
          // Ignorer les erreurs de parsing d'URL
        }
      }

      if (token && JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
          userId = decoded.id;
          userAuthenticated = true;
          bombPartyLogger.info({ userId }, 'WebSocket connection authenticated');
        } catch (jwtError) {
          // Token invalide ou expiré
          bombPartyLogger.warn({ error: jwtError instanceof Error ? jwtError.message : String(jwtError) }, 'JWT verification failed on WS upgrade');
          socket.close(1008, 'Authentication failed');
          return;
        }
      } else {
        // Pas de token fourni - refuser la connexion
        bombPartyLogger.warn('No token provided on WS upgrade');
        socket.close(1008, 'Authentication required');
        return;
      }
    } catch (error) {
      bombPartyLogger.error({ error }, 'Error during WS authentication');
      socket.close(1008, 'Authentication error');
      return;
    }

    wsServer.registerConnection(socket, undefined, undefined, userId);


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
        
        // Rate limiting par type de message
        const messageType = rawMessage.event || 'unknown';
        const rateLimitConfig: Record<string, { max: number; window: number }> = {
          'bp:game:input': { max: 15, window: 2000 }, // Plus permissif pour les inputs
          'bp:chat:message': { max: 10, window: 2000 },
          'bp:lobby:update': { max: 10, window: 2000 },
          'bp:bonus:activate': { max: 5, window: 2000 }, // Moins permissif pour les bonus
        };
        
        const config = rateLimitConfig[messageType] || { max: 10, window: 2000 };
        if (!wsServer.checkRateLimit(socket, messageType, config.max, config.window)) {
          // Rate limit dépassé - ignorer silencieusement
          return;
        }
        
        if (messageType !== 'bp:ping' && messageType !== 'bp:pong') {
          bombPartyLogger.info({ event: messageType, userId }, 'Message received');
        }

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
          bombPartyLogger.warn({ 
            userId, 
            event: rawMessage.event, 
            error: validation.error 
          }, 'Validation error');
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
            bombPartyLogger.info({ playerId, roomId: message.payload?.roomId }, 'Room subscribe ignored (not implemented)');
            break;

          default:
            sendError(`Event not supported: ${message.event}`, ErrorCode.VALIDATION_ERROR);
        }

      } catch (error) {
        bombPartyLogger.error({ userId, error }, 'Error processing message');
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
      bombPartyLogger.info({ playerId, roomCount: publicRooms.length }, 'Sending lobby list');
      
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
      bombPartyLogger.info({ playerId, roomId: payload.roomId }, 'handleLobbyStart called');
      const result = roomManager.startGame(playerId, payload.roomId);

      if (!result.success) {
        bombPartyLogger.warn({ playerId, roomId: payload.roomId, error: result.error }, 'Start error');
        sendError(result.error || 'Error starting game', ErrorCode.STATE_ERROR);
      } else {
        bombPartyLogger.info({ playerId, roomId: payload.roomId }, 'Start successful');
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
      bombPartyLogger.error({ userId, error }, 'WebSocket error');
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
