import type { FastifyPluginAsync } from 'fastify';
import '@fastify/websocket';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { BombPartyRoomManager } from './RoomManager.ts';
import { BombPartyWSServer } from './wsServer.ts';
import { BombPartyTournamentManager } from './tournament/BombPartyTournamentManager.ts';
import {
  handleCreateTournament,
  handleJoinTournament,
  handleLeaveTournament,
  handleStartTournament,
  handleGetTournamentStatus,
  handleListTournaments
} from './tournament/tournamentHandlers.ts';
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
  tournamentId?: string;
  authenticated: boolean;
}

const bombPartyWSHandlers: FastifyPluginAsync = async (fastify) => {
  const roomManager = new BombPartyRoomManager();
  const wsServer = new BombPartyWSServer();
  const tournamentManager = new BombPartyTournamentManager(
    roomManager,
    (playerIds: string[], event: string, payload: any) => {
      wsServer.broadcastToPlayers(playerIds, { event, payload });
    }
  );

  function broadcastLobbyList(): void {
    const publicRooms = roomManager.getPublicRooms();
    const message = {
      event: 'bp:lobby:list_updated',
      payload: { rooms: publicRooms }
    };

    // envoie seulement aux connexions pas dans un tournoi
    const conns = wsServer.getAllConnections();
    for (const conn of conns) {
      const pid = conn.playerId;
      if (!pid || !tournamentManager.isPlayerInTournament(pid)) {
        wsServer.sendMessage(conn.socket, message);
      }
    }
  }

  fastify.get('/bombparty/ws', { websocket: true }, (socket: WebSocket, request) => {
    const session: WSSession = {
      authenticated: false
    };

    // check jwt a l'upgrade
    let userId: number | undefined;
    let userAuthenticated = false;
    
    try {
      // recupere le token depuis query string ou headers
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
          // ignore les erreurs de parsing url
        }
      }

      if (token && JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
          userId = decoded.id;
          userAuthenticated = true;
          bombPartyLogger.info({ userId }, 'WebSocket connection authenticated');
        } catch (jwtError) {
          // token invalide ou expire, on laisse quand meme se connecter en guest
          bombPartyLogger.warn({ error: jwtError instanceof Error ? jwtError.message : String(jwtError) }, 'JWT verification failed on WS upgrade, allowing unauthenticated connection');
          userId = undefined;
          userAuthenticated = false;
        }
      } else {
        // pas de token, mode guest
        bombPartyLogger.info('No token provided on WS upgrade, allowing unauthenticated connection');
        userId = undefined;
        userAuthenticated = false;
      }
    } catch (error) {
      // en cas d'erreur on laisse quand meme se connecter en guest
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
      const nameResult = validatePlayerName(playerName);
      if (!nameResult.success) {
        sendError(nameResult.error || 'Nom invalide', nameResult.code || ErrorCode.VALIDATION_ERROR);
        return false;
      }
      
      // si user authentifie, on recupere le display_name depuis la db
      let finalPlayerName = nameResult.data!;
      if (userAuthenticated && typeof userId === 'number') {
        try {
          const user = await new Promise<any>((resolve, reject) => {
            fastify.db.get('SELECT display_name FROM users WHERE id = ?', [userId], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          
          if (user && user.display_name) {
            finalPlayerName = user.display_name;
            bombPartyLogger.info({ userId, displayName: finalPlayerName }, 'Using display name from database for authenticated user');
          }
        } catch (error) {
          bombPartyLogger.warn({ userId, error }, 'Failed to fetch user display name from DB, using provided name');
        }
      }
      
      // reuse playerId si user authentifie et qu'on a deja un mapping
      let resolvedPlayerId: string | undefined;
      if (userAuthenticated && typeof userId === 'number') {
        resolvedPlayerId = wsServer.getPlayerIdForUser(userId);
      }

      // Si un autre onglet est déjà connecté pour ce user, fermer la connexion précédente
      if (userAuthenticated && typeof userId === 'number') {
        const all = wsServer.getAllConnections();
        for (const conn of all) {
          if (conn.userId === userId && conn.socket !== socket) {
            bombPartyLogger.info({ userId }, 'Closing previous connection for same authenticated user');
            wsServer.closeConnection(conn.socket, 'DUPLICATE_LOGIN');
          }
        }
      }

      session.playerId = resolvedPlayerId || uuidv4();
      session.playerName = finalPlayerName;
      session.authenticated = true;

      roomManager.registerPlayer(socket, session.playerId, session.playerName);
      wsServer.updateConnection(socket, session.playerId, undefined, userId);
      if (userAuthenticated && typeof userId === 'number') {
        wsServer.setPlayerIdForUser(userId, session.playerId);
      }

      // tentative de reconnexion au tournoi si applicable
      try {
        tournamentManager.handlePlayerReconnect(session.playerId, socket);
      } catch (e) {
        bombPartyLogger.warn({ playerId: session.playerId, error: e instanceof Error ? e.message : String(e) }, 'Tournament reconnect attempt failed');
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
        
        // rate limiting par type de message (amélioré avec throttling)
        const messageType = rawMessage.event || 'unknown';
        const rateLimitConfig: Record<string, { max: number; window: number }> = {
          'bp:game:input': { max: 10, window: 2000 }, // réduit de 15 à 10 pour éviter le spam
          'bp:chat:message': { max: 8, window: 2000 },
          'bp:lobby:update': { max: 5, window: 2000 },
          'bp:bonus:activate': { max: 3, window: 2000 }, // très restrictif pour les bonus
          'bp:lobby:create': { max: 3, window: 5000 }, // limiter création de rooms
          'bp:lobby:join': { max: 5, window: 2000 },
        };
        
        const config = rateLimitConfig[messageType] || { max: 10, window: 2000 };
        if (!wsServer.checkRateLimit(socket, messageType, config.max, config.window)) {
          // rate limit depasse, envoyer une erreur au client
          sendError(`Rate limit exceeded for ${messageType}. Please slow down.`, ErrorCode.VALIDATION_ERROR);
          return;
        }
        
        if (messageType !== 'bp:ping' && messageType !== 'bp:pong') {
          bombPartyLogger.info({ event: messageType, userId }, 'Message received');
        }

        // Repond au ping meme avant authentification (heartbeat frontend)
        if (rawMessage.event === 'bp:ping') {
          sendMessage({ event: 'bp:pong', payload: { ts: Date.now() } });
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

          // handlers tournoi
          case 'bp:tournament:create':
            handleTournamentCreate(playerId, message.payload);
            break;

          case 'bp:tournament:join':
            handleTournamentJoin(playerId, message.payload);
            break;

          case 'bp:tournament:leave':
            handleTournamentLeave(playerId, message.payload);
            break;

          case 'bp:tournament:start':
            handleTournamentStart(playerId, message.payload);
            break;

          case 'bp:tournament:status':
            handleTournamentStatus(playerId, message.payload);
            break;

          case 'bp:tournament:list':
            handleTournamentList(playerId);
            break;

          case 'bp:tournament:ready': {
            const tournament = tournamentManager.getTournamentByPlayerId(playerId);
            if (!tournament) {
              sendError('You are not in a tournament', ErrorCode.STATE_ERROR);
              break;
            }
            try {
              const matchId = message.payload?.matchId;
              const ready = !!message.payload?.ready;
              if (!matchId) {
                sendError('Missing matchId', ErrorCode.VALIDATION_ERROR);
                break;
              }
              tournament.setPlayerReady(matchId, playerId, ready);
            } catch (e) {
              sendError('Failed to set readiness', ErrorCode.STATE_ERROR);
            }
            break;
          }

          default:
            sendError(`Event not supported: ${message.event}`, ErrorCode.VALIDATION_ERROR);
        }

      } catch (error) {
        bombPartyLogger.error({ userId, error }, 'Error processing message');
        sendError('Error processing message', ErrorCode.STATE_ERROR);
      }
    });

    function handleLobbyCreate(playerId: string, payload: any): void {
      // empeche de creer un lobby si le joueur est dans un tournoi
      if (tournamentManager.isPlayerInTournament(playerId)) {
        sendError('You cannot create a lobby while in a tournament', ErrorCode.STATE_ERROR);
        return;
      }
      
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
      // empeche de rejoindre un lobby si le joueur est dans un tournoi
      if (tournamentManager.isPlayerInTournament(playerId)) {
        sendError('You cannot join a lobby while in a tournament', ErrorCode.STATE_ERROR);
        return;
      }
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
        
        // Mettre à jour la liste des lobbies pour tous les clients
        broadcastLobbyList();
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
        
        // Mettre à jour la liste des lobbies pour tous les clients
        broadcastLobbyList();
      } else {
        sendError(result.error || 'Error leaving lobby', ErrorCode.STATE_ERROR);
      }
    }
    function handleLobbyList(playerId: string, payload: any): void {
      if (tournamentManager.isPlayerInTournament(playerId)) {
        bombPartyLogger.info({ playerId }, 'Player in tournament - lobby list blocked');
        sendError('You cannot list lobbies while in a tournament', ErrorCode.STATE_ERROR);
        return;
      }
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
        const result = await roomManager.handleGameInput(
          playerId,
          payload.roomId,
          payload.word,
          payload.msTaken
        );

        if (!result.success) {
          sendError(result.error || 'Error game input', ErrorCode.STATE_ERROR);
        }
      } catch (error) {
        bombPartyLogger.error({ playerId, error }, 'Error handling game input');
        sendError('Internal server error processing game input', ErrorCode.STATE_ERROR);
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

    // wrappers pour les handlers tournoi (standardise la signature sendMessage)
    function handleTournamentCreate(playerId: string, payload: any): void {
      if (!payload.tournamentId) {
        payload.tournamentId = uuidv4();
      }
      const res = handleCreateTournament(
        playerId,
        session.playerName || 'Unknown',
        socket,
        {
          tournamentId: payload.tournamentId,
          capacity: payload.capacity,
          password: payload.password
        },
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
      if (res?.success) {
        session.tournamentId = payload.tournamentId;
      }
    }

    function handleTournamentJoin(playerId: string, payload: any): void {
      const res = handleJoinTournament(
        playerId,
        session.playerName || 'Unknown',
        socket,
        payload,
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
      if (res?.success) {
        if (session.roomId) {
          wsServer.updateConnection(socket, session.playerId, undefined);
          session.roomId = undefined;
        }
        session.tournamentId = payload.tournamentId;
      }
    }

    function handleTournamentLeave(playerId: string, payload: any): void {
      const res = handleLeaveTournament(
        playerId,
        payload,
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
      if (res?.success && session.tournamentId === payload.tournamentId) {
        session.tournamentId = undefined;
      }
    }

    function handleTournamentStart(playerId: string, payload: any): void {
      handleStartTournament(
        playerId,
        payload,
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
    }

    function handleTournamentStatus(playerId: string, payload: any): void {
      handleGetTournamentStatus(
        playerId,
        payload,
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
    }

    function handleTournamentList(playerId: string): void {
      handleListTournaments(
        playerId,
        {
          tournamentManager,
          sendMessage: (event: string, p: any) => sendMessage({ event, payload: p }),
          sendError
        }
      );
    }

    socket.on('close', (code: number, reason: Buffer) => {
      if (session.playerId && session.roomId) {
        roomManager.leaveRoom(session.playerId, session.roomId);
      }
      
      // gestion deconnexion tournoi
      if (session.playerId) {
        tournamentManager.handlePlayerDisconnect(session.playerId);
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

  // recupere l'instance du RoomManager (pour les tests)
  static getRoomManager(): BombPartyRoomManager | null {
    return this.instance;
  }

  static setRoomManager(manager: BombPartyRoomManager): void {
    this.instance = manager;
  }
}
