import { useState, useCallback, useRef } from 'react';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { logger } from '../../utils/logger';
import type { BombPartyClient } from '../../services/ws/bombPartyClient';
import { bombPartyService } from '../../services/bombPartyService';

export interface UseBombPartyLobbyReturn {
  lobbyPlayers: Array<{ id: string; name: string }>;
  isHost: boolean;
  lobbyMaxPlayers: number;
  setLobbyPlayers: (players: Array<{ id: string; name: string }>) => void;
  setIsHost: (isHost: boolean) => void;
  setLobbyMaxPlayers: (max: number) => void;
  handleLobbyCreate: (meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }, client?: any) => void;
  handleLobbyJoin: (roomId: string, password: string | undefined, client?: any) => void;
  handleLeaveLobby: (roomId: string | null, client: BombPartyClient) => void;
  handleStartGame: (roomId: string | null, isHost: boolean, lobbyPlayers: Array<{ id: string; name: string }>, client?: BombPartyClient) => void;
}

export function useBombPartyLobby() {
  const [lobbyPlayers, setLobbyPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [lobbyMaxPlayers, setLobbyMaxPlayers] = useState(4);
  const startingGameRef = useRef(false);

  const setGamePhase = useBombPartyStore((state) => state.setGamePhase);
  const playerId = useBombPartyStore((state) => state.connection.playerId);
  const isAuthenticating = useBombPartyStore((state) => state.connection.isAuthenticating);
  const connectionState = useBombPartyStore((state) => state.connection.state);

  const handleLobbyCreate = useCallback((meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }, client?: any) => {
    logger.info('handleLobbyCreate appele', {
      maxPlayers: meta.maxPlayers,
      name: meta.name,
      isPrivate: meta.isPrivate,
      playerId,
      isAuthenticating,
      connectionState
    });

    if (!playerId || isAuthenticating) {
      logger.warn('Impossible de créer le lobby: non authentifié', {
        playerId,
        isAuthenticating,
        connectionState
      });

      // 🔧 FIX: Better error messages based on state
      if (isAuthenticating) {
        useBombPartyStore.getState().setLastError('Authentification en cours, veuillez patienter quelques secondes...');
      } else {
        useBombPartyStore.getState().setLastError('Vous devez être connecté pour créer un lobby');
      }
      return;
    }

    if (connectionState !== 'connected') {
      logger.warn('Impossible de creer le lobby: connexion non etablie', { connectionState });
      useBombPartyStore.getState().setLastError('Connexion non etablie. Veuillez reessayer.');
      return;
    }

    if (!meta.name || meta.name.trim().length === 0) {
      logger.error('Impossible de creer le lobby: nom invalide', undefined, { name: meta.name });
      useBombPartyStore.getState().setLastError('Le nom du lobby ne peut pas être vide');
      return;
    }

    if (meta.maxPlayers < 2 || meta.maxPlayers > 12) {
      logger.error('Impossible de creer le lobby: nombre de joueurs invalide', undefined, { maxPlayers: meta.maxPlayers });
      useBombPartyStore.getState().setLastError('Le nombre de joueurs doit être entre 2 et 12');
      return;
    }

    logger.info('Creation du lobby via bombPartyService', {
      name: meta.name,
      isPrivate: meta.isPrivate,
      maxPlayers: meta.maxPlayers,
      playerId
    });

    try {
      bombPartyService.createRoom(meta.name, meta.isPrivate, meta.password, meta.maxPlayers);
      logger.info('bombPartyService.createRoom appele avec succes');
    } catch (err) {
      logger.error('Erreur lors de la creation du lobby', err, { playerId, meta, error: err });
      useBombPartyStore.getState().setLastError('Erreur lors de la creation du lobby');
    }
  }, [playerId, isAuthenticating, connectionState]);

  const handleLobbyJoin = useCallback((roomId: string, password: string | undefined, client?: any) => {
    if (!playerId || isAuthenticating) {
      logger.warn('Impossible de rejoindre le lobby: non authentifie', { playerId, isAuthenticating, roomId });
      useBombPartyStore.getState().setLastError('Vous devez être connecte pour rejoindre un lobby');
      return;
    }

    if (connectionState !== 'connected') {
      logger.warn('Impossible de rejoindre le lobby: connexion non etablie', { connectionState, roomId });
      useBombPartyStore.getState().setLastError('Connexion non etablie. Veuillez reessayer.');
      return;
    }

    if (!roomId || roomId.trim().length === 0) {
      logger.error('Impossible de rejoindre le lobby: roomId invalide', undefined, { roomId });
      useBombPartyStore.getState().setLastError('ID de lobby invalide');
      return;
    }

    logger.info('Rejoindre le lobby via bombPartyService', { roomId, playerId, hasPassword: !!password });

    try {
      bombPartyService.joinRoom(roomId, password);
      logger.info('bombPartyService.joinRoom appele avec succes');
    } catch (err) {
      logger.error('Erreur lors de la connexion au lobby', err, { playerId, roomId });
      useBombPartyStore.getState().setLastError('Erreur lors de la connexion au lobby');
    }
  }, [playerId, isAuthenticating, connectionState]);

  const handleLeaveLobby = useCallback((roomId: string | null, client: BombPartyClient) => {
    if (roomId && client) {
      try {
        client.sendMessage({
          event: 'bp:lobby:leave',
          payload: { roomId }
        });
      } catch (err) {
        logger.error('Erreur lors de la deconnexion du lobby', err, { roomId });
      }
    }
    setGamePhase('RULES');
    setLobbyPlayers([]);
    setIsHost(false);
  }, [setGamePhase]);

  const handleStartGame = useCallback((roomId: string | null, isHost: boolean, lobbyPlayers: Array<{ id: string; name: string }>, client?: BombPartyClient) => {
    if (startingGameRef.current) {
      logger.warn('Demarrage dejà en cours, appel ignore');
      return;
    }

    logger.debug('Demarrage du jeu demande', {
      roomId,
      isHost,
      playersCount: lobbyPlayers.length,
      players: lobbyPlayers
    });

    if (!roomId) {
      logger.error('Impossible de demarrer: pas de roomId', undefined, { isHost, playersCount: lobbyPlayers.length });
      useBombPartyStore.getState().setLastError('Room ID manquant');
      return;
    }
    if (!isHost) {
      logger.warn('Impossible de demarrer: pas hôte', { roomId, isHost });
      useBombPartyStore.getState().setLastError('Seul l\'hôte peut demarrer la partie');
      return;
    }
    if (lobbyPlayers.length < 2) {
      logger.warn('Impossible de demarrer: pas assez de joueurs', { roomId, playersCount: lobbyPlayers.length });
      useBombPartyStore.getState().setLastError('Il faut au moins 2 joueurs pour demarrer');
      return;
    }

    startingGameRef.current = true;

    const store = useBombPartyStore.getState();
    if (store.connection.state !== 'connected') {
      logger.warn('Impossible de demarrer: connexion non etablie', { connectionState: store.connection.state, roomId });
      store.setLastError('Connexion non etablie. Veuillez reessayer.');
      return;
    }

    if (store.connection.roomId !== roomId) {
      logger.warn('RoomId mismatch, mise à jour du store', {
        storeRoomId: store.connection.roomId,
        providedRoomId: roomId
      });
      store.setRoomId(roomId);
    }

    logger.info('Envoi du demarrage au serveur via bombPartyService', { roomId, playersCount: lobbyPlayers.length });

    try {
      bombPartyService.startGame();
      logger.info('bombPartyService.startGame appele avec succes');

      setTimeout(() => {
        startingGameRef.current = false;
      }, 2000);
    } catch (err) {
      logger.error('Erreur lors du demarrage du jeu', err, { roomId });
      useBombPartyStore.getState().setLastError('Erreur lors du demarrage du jeu');
      startingGameRef.current = false;
    }
  }, []);

  return {
    lobbyPlayers,
    isHost,
    lobbyMaxPlayers,
    setLobbyPlayers,
    setIsHost,
    setLobbyMaxPlayers,
    handleLobbyCreate,
    handleLobbyJoin,
    handleLeaveLobby,
    handleStartGame
  };
}

