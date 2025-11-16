import type { FastifyPluginAsync } from 'fastify';
import '@fastify/websocket';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { BombPartyRoomManager } from './RoomManager.ts';
import { BombPartyWSServer } from './wsServer.ts';
import { 
  validateClientMessage, 
  validatePlayerName,
  validateAuthMessage
} from './validation.ts';
import { sanitizePlayerName } from './security.ts';
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

const bombPartyWSHandlers: FastifyPluginAsync = async (fastify) => {
  const roomManager = new BombPartyRoomManager();
  const wsServer = new BombPartyWSServer();

  function broadcastLobbyList(): void {
    const publicRooms = roomManager.getPublicRooms();
    const message = {
      event: 'bp:lobby:list_updated',
      payload: { rooms: publicRooms }
    };

    const conns = wsServer.getAllConnections();
    for (const conn of conns) {
      wsServer.sendMessage(conn.socket, message);
    }
  }

  roomManager.setBroadcastLobbyListCallback(broadcastLobbyList);

  fastify.get('/bombparty/ws', { websocket: true }, (socket: WebSocket, request) => {
    const session: WSSession = {
      authenticated: false
    };

    let userId: number | undefined;
    let userAuthenticated = false;
    
    try {
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
        }
      }

      if (token && JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
          userId = decoded.id;
          userAuthenticated = true;
          bombPartyLogger.info({ userId }, 'WebSocket connection authenticated');
        } catch (jwtError) {
          bombPartyLogger.warn({ error: jwtError instanceof Error ? jwtError.message : String(jwtError) }, 'JWT verification failed on WS upgrade, allowing unauthenticated connection');
          userId = undefined;
          userAuthenticated = false;
        }
      } else {
        bombPartyLogger.info('No token provided on WS upgrade, allowing unauthenticated connection');
        userId = undefined;
        userAuthenticated = false;
      }
    } catch (error) {
      bombPartyLogger.warn({ error }, 'Error during WS authentication, allowing unauthenticated connection');
      userId = undefined;
      userAuthenticated = false;
    }

    wsServer.registerConnection(socket, undefined, undefined, userId);


    function sendError(error: string, code: ErrorCode = ErrorCode.STATE_ERROR): void {
      wsServer.sendError(socket, error, code);
    }
    function sendMessage(message: any): void {
      wsServer.sendMessage(socket, message);
    }

    async function authenticatePlayer(playerName: string): Promise<boolean> {
      const sanitizedName = sanitizePlayerName(playerName);
      
      const nameResult = validatePlayerName(sanitizedName);
      if (!nameResult.success) {
        sendError(nameResult.error || 'Nom invalide', nameResult.code || ErrorCode.VALIDATION_ERROR);
        return false;
      }
      
      let finalPlayerName = sanitizePlayerName(nameResult.data!);
      if (userAuthenticated && typeof userId === 'number') {
        try {
          const user = await new Promise<any>((resolve, reject) => {
            fastify.db.get('SELECT display_name FROM users WHERE id = ?', [userId], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          
          if (user && user.display_name) {
            finalPlayerName = sanitizePlayerName(user.display_name);
            bombPartyLogger.info({ userId, displayName: finalPlayerName }, 'Using display name from database for authenticated user');
          }
        } catch (error) {
          bombPartyLogger.warn({ userId, error }, 'Failed to fetch user display name from DB, using provided name');
        }
      }
      
      let resolvedPlayerId: string | undefined;
      if (userAuthenticated && typeof userId === 'number') {
        resolvedPlayerId = wsServer.getPlayerIdForUser(userId);
      }

      session.playerId = resolvedPlayerId || uuidv4();
      session.playerName = finalPlayerName;
      session.authenticated = true;

      roomManager.registerPlayer(socket, session.playerId, session.playerName);
      wsServer.updateConnection(socket, session.playerId, undefined, userId);
      if (userAuthenticated && typeof userId === 'number') {
        wsServer.setPlayerIdForUser(userId, session.playerId);
      }

      return true;
    }

    function requireAuth(): boolean {
      if (!session.authenticated || !session.playerId) {
        sendError('Authentification requise', ErrorCode.AUTH_ERROR);
        return false;
      }
      return true;
    }

    socket.on('message', async (data: Buffer) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        
        const messageType = rawMessage.event || 'unknown';
        const rateLimitConfig: Record<string, { max: number; window: number }> = {
          'bp:game:input': { max: 10, window: 2000 },
          'bp:chat:message': { max: 8, window: 2000 },
          'bp:lobby:update': { max: 5, window: 2000 },
          'bp:bonus:activate': { max: 3, window: 2000 },
          'bp:lobby:create': { max: 3, window: 5000 },
          'bp:lobby:join': { max: 5, window: 2000 },
        };
        
        const config = rateLimitConfig[messageType] || { max: 10, window: 2000 };
        if (!wsServer.checkRateLimit(socket, messageType, config.max, config.window)) {
          sendError(`Rate limit exceeded for ${messageType}. Please slow down.`, ErrorCode.VALIDATION_ERROR);
          return;
        }
        
        if (messageType !== 'bp:ping' && messageType !== 'bp:pong') {
          bombPartyLogger.info({ event: messageType, userId }, 'Message received');
        }

        if (rawMessage.event === 'bp:ping') {
          const receivedAt = Date.now();
          const sentAt = rawMessage.payload?.ts;
          bombPartyLogger.debug({ 
            userId,
            sentAt,
            receivedAt,
            latency: sentAt ? receivedAt - sentAt : 'unknown'
          }, 'bp:ping received, sending bp:pong');
          sendMessage({ event: 'bp:pong', payload: { ts: receivedAt, clientTs: sentAt } });
          return;
        }

        if (rawMessage.event === 'bp:auth') {
          const validation = validateAuthMessage(rawMessage);
          if (!validation.success) {
            sendError(validation.error || 'Invalid authentication message', validation.code || ErrorCode.VALIDATION_ERROR);
            return;
          }
          
          if (await authenticatePlayer(validation.data!.payload.playerName)) {
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
        
        if (message.payload?.roomId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(message.payload.roomId)) {
          sendError('Invalid room ID format', ErrorCode.VALIDATION_ERROR);
          return;
        }
        
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

          case 'bp:room:state_request':
            handleRoomStateRequest(playerId, message.payload);
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
        
        const hasGameInProgress = roomManager.hasGameInProgress(payload.roomId);
        
        bombPartyLogger.info({ 
          playerId, 
          roomId: payload.roomId, 
          hasGameInProgress
        }, 'Player joined room');
        
        sendMessage({
          event: 'bp:lobby:joined',
          payload: {
            roomId: payload.roomId,
            playerId,
            players: result.players || [],
            maxPlayers: result.maxPlayers,
            isReconnect: hasGameInProgress
          }
        });
        
        if (hasGameInProgress) {
          const roomState = roomManager.getRoomStateForReconnect(playerId, payload.roomId);
          
          if (roomState.success && roomState.gameState) {
            bombPartyLogger.info({ 
              playerId, 
              roomId: payload.roomId,
              phase: roomState.gameState.phase
            }, 'Sending game state to reconnected player');
            
            sendMessage({
              event: 'bp:game:state',
              payload: {
                roomId: payload.roomId,
                gameState: roomState.gameState,
                full: true,
                sequenceNumber: roomState.sequenceNumber,
                stateVersion: roomState.stateVersion,
                isReconnect: true
              }
            });
          }
        }
        
        broadcastLobbyList();
      } else {
        let code: ErrorCode = ErrorCode.STATE_ERROR;
        const errorMsg = result.error || 'Error joining lobby';
        
        if (errorMsg.includes('non trouvée') || errorMsg.includes('not found')) {
          code = ErrorCode.STATE_ERROR;
        } else if (errorMsg.includes('pleine') || errorMsg.includes('full')) {
          code = ErrorCode.STATE_ERROR;
        } else if (errorMsg.includes('mot de passe') || errorMsg.includes('password') || errorMsg.includes('Mot de passe requis')) {
          code = ErrorCode.AUTH_ERROR;
        } else if (errorMsg.includes('déjà dans') || errorMsg.includes('already in')) {
          code = ErrorCode.STATE_ERROR;
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('invalide')) {
          code = ErrorCode.VALIDATION_ERROR;
        }

        sendError(errorMsg, code);
      }
    }

    function handleLobbyLeave(playerId: string, payload: any): void {
      const result = roomManager.leaveRoom(playerId, payload.roomId, socket);

      if (result.success) {
        session.roomId = undefined;
        wsServer.updateConnection(socket, session.playerId);
        sendMessage({
          event: 'bp:lobby:left',
          payload: {
            roomId: payload.roomId,
            playerId,
            newHostId: result.newHostId,
            hostTransferred: !!result.newHostId
          }
        });
        
        broadcastLobbyList();
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

    async function handleGameInput(playerId: string, payload: any): Promise<void> {
      try {
        if (!payload.roomId || !payload.word) {
          bombPartyLogger.warn({ playerId, payload }, 'Invalid payload in handleGameInput');
          sendError('Invalid game input payload', ErrorCode.VALIDATION_ERROR);
          return;
        }

        sendMessage({
          event: 'bp:game:input:received',
          payload: {
            roomId: payload.roomId,
            word: payload.word,
            receivedAt: Date.now()
          }
        });

        const result = await roomManager.handleGameInput(
          playerId,
          payload.roomId,
          payload.word,
          payload.msTaken || 0
        );

        if (!result.success) {
          bombPartyLogger.warn({ playerId, roomId: payload.roomId, error: result.error }, 'Game input failed');
          sendError(result.error || 'Error game input', ErrorCode.STATE_ERROR);
        }
      } catch (error) {
        bombPartyLogger.error({ playerId, roomId: payload?.roomId, error }, 'Error handling game input');
        sendError('Internal server error processing game input', ErrorCode.STATE_ERROR);
      }
    }

    async function handleBonusActivate(playerId: string, payload: any): Promise<void> {
      try {
        if (!payload.roomId || !payload.bonusKey) {
          bombPartyLogger.warn({ playerId, payload }, 'Invalid payload in handleBonusActivate');
          sendError('Invalid bonus activation payload', ErrorCode.VALIDATION_ERROR);
          return;
        }

        const result = roomManager.activateBonus(
          playerId,
          payload.roomId,
          payload.bonusKey
        );

        if (!result.success) {
          bombPartyLogger.warn({ playerId, roomId: payload.roomId, bonusKey: payload.bonusKey, error: result.error }, 'Bonus activation failed');
          sendError(result.error || 'Error activating bonus', ErrorCode.STATE_ERROR);
        }
      } catch (error) {
        bombPartyLogger.error({ playerId, roomId: payload?.roomId, bonusKey: payload?.bonusKey, error }, 'Error in handleBonusActivate');
        sendError('Internal server error activating bonus', ErrorCode.STATE_ERROR);
      }
    }

    function handleRoomStateRequest(playerId: string, payload: any): void {
      if (!payload.roomId) {
        sendError('Room ID required', ErrorCode.VALIDATION_ERROR);
        return;
      }

      const result = roomManager.getRoomStateForReconnect(playerId, payload.roomId);
      
      if (result.success) {
        if (result.gameState) {
          sendMessage({
            event: 'bp:game:state',
            payload: {
              roomId: payload.roomId,
              gameState: result.gameState,
              full: true,
              sequenceNumber: result.sequenceNumber,
              stateVersion: result.stateVersion,
              isReconnect: true
            }
          });
        } else {
          sendMessage({
            event: 'bp:room:state',
            payload: {
              roomId: payload.roomId,
              sequenceNumber: result.sequenceNumber,
              stateVersion: result.stateVersion,
              isReconnect: true
            }
          });
        }
      } else {
        sendError(result.error || 'Room state not available', ErrorCode.STATE_ERROR);
      }
    }

    socket.on('close', (code: number, reason: Buffer) => {
      if (session.playerId && session.roomId) {
        const gracePeriodMs = 5000;
        const playerId = session.playerId;
        const roomId = session.roomId;
        
        bombPartyLogger.info({ 
          playerId, 
          roomId, 
          code, 
          reason: reason.toString(),
          gracePeriodMs
        }, 'WebSocket fermé - Grace period de 5s avant éjection');
        
        setTimeout(() => {
          const room = roomManager.getRoom(roomId);
          if (!room) {
            bombPartyLogger.debug({ playerId, roomId }, 'Room inexistante après grace period');
            return;
          }
          
          const roomPlayer = room.players.get(playerId);
          if (!roomPlayer) {
            bombPartyLogger.debug({ playerId, roomId }, 'Joueur déjà parti de la room');
            return;
          }
          
          const hasActiveSocket = roomPlayer.sockets && roomPlayer.sockets.size > 0 && 
            Array.from(roomPlayer.sockets).some(ws => ws.readyState === 1); // OPEN = 1
          
          if (hasActiveSocket) {
            bombPartyLogger.info({ playerId, roomId }, '✅ Joueur reconnecté pendant grace period - pas d\'éjection');
            return;
          }
          
          bombPartyLogger.info({ playerId, roomId }, '❌ Pas de reconnexion après grace period - éjection du joueur');
          roomManager.leaveRoom(playerId, roomId, socket);
        }, gracePeriodMs);
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

};

export default bombPartyWSHandlers;

export class BombPartyWSManager {
  private static instance: BombPartyRoomManager | null = null;

  static getRoomManager(): BombPartyRoomManager | null {
    return this.instance;
  }

  static setRoomManager(manager: BombPartyRoomManager): void {
    this.instance = manager;
  }
}
