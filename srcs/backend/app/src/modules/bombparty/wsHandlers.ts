/**
 * Handlers WebSocket pour Bomb Party
 * 
 * Gère les connexions WebSocket et les messages des clients
 * Intègre avec RoomManager pour la logique métier
 */

import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { BombPartyRoomManager } from './RoomManager.ts';
import { 
  validateClientMessage, 
  validatePlayerName,
} from './validation.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface pour les données de session WebSocket
 */
interface WSSession {
  playerId?: string;
  playerName?: string;
  roomId?: string;
  authenticated: boolean;
}

/**
 * Plugin Fastify pour les WebSocket Bomb Party
 */
export default async function bombPartyWSHandlers(fastify: FastifyInstance) {
  const roomManager = new BombPartyRoomManager();

  // Route WebSocket pour Bomb Party
  fastify.get('/bombparty/ws', { websocket: true }, (socket: WebSocket, request) => {
    const session: WSSession = {
      authenticated: false
    };


    /**
     * Envoie un message d'erreur au client
     */
    function sendError(error: string, code?: string): void {
      const message = {
        event: 'bp:lobby:error',
        payload: {
          error,
          code: code || 'UNKNOWN_ERROR'
        }
      };
      
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('❌ [BombParty] Erreur envoi message:', err);
      }
    }

    /**
     * Envoie un message de succès au client
     */
    function sendMessage(message: any): void {
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('❌ [BombParty] Erreur envoi message:', err);
      }
    }

    /**
     * Authentifie un joueur (version simplifiée)
     */
    function authenticatePlayer(playerName: string): boolean {
      const nameResult = validatePlayerName(playerName);
      if (!nameResult.success) {
        sendError(nameResult.error || 'Nom invalide', 'INVALID_NAME');
        return false;
      }

      session.playerId = uuidv4();
      session.playerName = nameResult.data!;
      session.authenticated = true;

      roomManager.registerPlayer(socket, session.playerId, session.playerName);
      

      return true;
    }

    /**
     * Vérifie l'authentification
     */
    function requireAuth(): boolean {
      if (!session.authenticated || !session.playerId) {
        sendError('Authentification requise', 'AUTH_REQUIRED');
        return false;
      }
      return true;
    }

    socket.on('message', (data: Buffer) => {
      try {
        const rawMessage = JSON.parse(data.toString());

        if (rawMessage.event === 'bp:auth') {
          if (!rawMessage.payload?.playerName) {
            sendError('Nom de joueur requis', 'MISSING_PLAYER_NAME');
            return;
          }
          
          if (authenticatePlayer(rawMessage.payload.playerName)) {
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
          sendError(validation.error || 'Message invalide', 'VALIDATION_ERROR');
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

          default:
            sendError(`Event non supporté: ${message.event}`, 'UNSUPPORTED_EVENT');
        }

      } catch (error) {
        console.error('❌ [BombParty] Erreur traitement message:', error);
        sendError('Erreur traitement message', 'MESSAGE_ERROR');
      }
    });

    /**
     * Gère la création d'un lobby
     */
    function handleLobbyCreate(playerId: string, payload: any): void {
      
      const result = roomManager.createRoom(
        playerId,
        payload.name,
        payload.isPrivate,
        payload.password,
        payload.maxPlayers
      );

      if (result.success) {
        session.roomId = result.roomId;
        sendMessage({
          event: 'bp:lobby:created',
          payload: {
            roomId: result.roomId,
            playerId,
            maxPlayers: result.maxPlayers
          }
        });
      } else {
        sendError(result.error || 'Erreur création lobby', 'CREATE_FAILED');
      }
    }

    /**
     * Gère la connexion à un lobby
     */
    function handleLobbyJoin(playerId: string, payload: any): void {
      const result = roomManager.joinRoom(playerId, payload.roomId, payload.password);

      if (result.success) {
        session.roomId = payload.roomId;
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
        let code = 'JOIN_FAILED';
        if (result.error?.includes('non trouvée')) code = 'ROOM_NOT_FOUND';
        else if (result.error?.includes('pleine')) code = 'ROOM_FULL';
        else if (result.error?.includes('mot de passe')) code = 'WRONG_PASSWORD';
        else if (result.error?.includes('déjà dans')) code = 'ALREADY_IN_ROOM';

        sendError(result.error || 'Erreur rejoindre lobby', code);
      }
    }

    /**
     * Gère la sortie d'un lobby
     */
    function handleLobbyLeave(playerId: string, payload: any): void {
      const result = roomManager.leaveRoom(playerId, payload.roomId);

      if (result.success) {
        sendMessage({
          event: 'bp:lobby:left',
          payload: {
            roomId: payload.roomId,
            playerId
          }
        });
      } else {
        sendError(result.error || 'Erreur sortie lobby', 'LEAVE_FAILED');
      }
    }

    /**
     * Gère la demande de liste des lobbies publics
     */
    function handleLobbyList(playerId: string, payload: any): void {
      const publicRooms = roomManager.getPublicRooms();
      
      sendMessage({
        event: 'bp:lobby:list',
        payload: {
          rooms: publicRooms
        }
      });
    }

    /**
     * Gère la demande de détails d'un lobby
     */
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
        sendError(result.error || 'Lobby non trouvé', 'ROOM_NOT_FOUND');
      }
    }

    /**
     * Gère le démarrage d'une partie
     */
    function handleLobbyStart(playerId: string, payload: any): void {
      const result = roomManager.startGame(playerId, payload.roomId);

      if (!result.success) {
        sendError(result.error || 'Erreur démarrage partie', 'START_FAILED');
      }
    }

    /**
     * Gère l'entrée d'un mot dans le jeu
     */
    function handleGameInput(playerId: string, payload: any): void {
      const result = roomManager.handleGameInput(
        playerId,
        payload.roomId,
        payload.word,
        payload.msTaken
      );

      if (!result.success) {
        sendError(result.error || 'Erreur entrée jeu', 'INPUT_FAILED');
      }
    }

    /**
     * Gère l'activation d'un bonus
     */
    function handleBonusActivate(playerId: string, payload: any): void {
      const result = roomManager.activateBonus(
        playerId,
        payload.roomId,
        payload.bonusKey
      );

      if (!result.success) {
        sendError(result.error || 'Erreur activation bonus', 'BONUS_FAILED');
      }
    }

    socket.on('close', () => {
    });

    socket.on('error', (error) => {
      console.error('❌ [BombParty] Erreur WebSocket:', error);
    });

    // Envoyer un message de bienvenue
    sendMessage({
      event: 'bp:welcome',
      payload: {
        message: 'Connexion Bomb Party établie',
        version: '1.0.0'
      }
    });

     socket.on('close', (code: number, reason: Buffer) => {
       if (session.playerId && session.roomId) {
         roomManager.leaveRoom(session.playerId, session.roomId);
       }
     });

     socket.on('error', (error: Error) => {
       console.error('❌ [BombParty] Erreur WebSocket:', error);
     });
  });

}

/**
 * Utilitaires pour les tests et le debug
 */
export class BombPartyWSManager {
  private static instance: BombPartyRoomManager | null = null;

  /**
   * Obtient l'instance du RoomManager (pour les tests)
   */
  static getRoomManager(): BombPartyRoomManager | null {
    return this.instance;
  }

  /**
   * Définit l'instance du RoomManager (pour les tests)
   */
  static setRoomManager(manager: BombPartyRoomManager): void {
    this.instance = manager;
  }
}
