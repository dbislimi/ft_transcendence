import { useBombPartyStore } from '../store/useBombPartyStore';
import { wsCoordinator } from './ws/WebSocketCoordinator';
import { logger } from '../utils/logger';

export interface BombPartyMessage {
  t?: string;
  event?: string;
  payload?: any;
  code?: string;
  msg?: string;
  turnStartedAt?: number;
  turnDurationMs?: number;
  currentPlayerId?: string;
  gameState?: any;
}

export interface TypedError {
  t: 'error';
  code: string;
  msg: string;
}


export class BombPartyService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private maxReconnectAttemptsForServerDown = 3; // Arrêter plus rapidement si le serveur est down
  private reconnectDelays = [1000, 2000, 5000, 10000, 10000];
  private heartbeatInterval: number | null = null;
  private lastPong = Date.now();
  private readonly PONG_TIMEOUT = 30000; // 30s pour réseau chargé (démo multi-joueurs)
  private readonly HEARTBEAT_INTERVAL = 10000; // 10s pour réduire traffic réseau
  private connectionId: string;
  private registeredWithCoordinator: boolean = false;
  private isInitialized: boolean = false;
  private pendingPlayerName: string | null = null;
  private isWebSocketReady: boolean = false;
  private countdownInterval: number | null = null;
  private lastHotReloadTime: number = 0; // Timestamp du dernier hot reload
  private hotReloadDebounceTimer: ReturnType<typeof setTimeout> | null = null; // Timer pour debounce
  private readonly HOT_RELOAD_DEBOUNCE_MS = 500; // Ignorer les hot reloads trop rapprochés
  
  private getWebSocketStateName(readyState?: number): string {
    if (readyState === undefined) return 'UNDEFINED';
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
  
  private getReadyStateString(): string {
    if (!this.ws) return 'NO_WS';
    return this.getWebSocketStateName(this.ws.readyState);
  }
  private lastConnectionError: { code?: number; reason?: string } | null = null;
  private isConnecting: boolean = false;
  private isDisconnecting: boolean = false;
  private hotReloadDetected: boolean = false;
  private lastProcessedMessages: Map<string, number> = new Map();
  private readonly MESSAGE_DEDUP_WINDOW = 1000; // fenetre de 1s pour deduplication messages
  private messageCounter: number = 0;
  private pendingMessages: Array<{ event: string; payload: any }> = [];

  constructor() {
    this.connectionId = `bps_${Math.random().toString(36).substring(2, 10)}`;
    logger.debug('Instance created', { connectionId: this.connectionId });
    
    // Détecter le hot reload de Vite
    // @ts-ignore - import.meta.hot est disponible en mode dev Vite
    if (typeof import.meta.hot !== 'undefined') {
      logger.debug('Hot reload support detected (Vite)', { connectionId: this.connectionId });
      
      // @ts-ignore
      import.meta.hot.on('vite:beforeUpdate', () => {
        const wsState = this.ws?.readyState;
        const isConnected = wsState === WebSocket.OPEN;
        const wsStateName = this.getWebSocketStateName(wsState);
        
        if (isConnected) {
          this.hotReloadDetected = true;
          logger.info('Hot reload: beforeUpdate - préservation de la connexion ouverte', {
            connectionId: this.connectionId,
            wsState: wsStateName,
            isConnected: true
          });
        } else {
          this.hotReloadDetected = false;
          logger.info('Hot reload: beforeUpdate - connexion fermée, pas de préservation', {
            connectionId: this.connectionId,
            wsState: wsStateName,
            isConnected: false,
            reason: 'Connexion non ouverte, nouvelle connexion sera créée après hot reload'
          });
        }
      });
      
      // @ts-ignore
      import.meta.hot.on('vite:afterUpdate', () => {
        const wsState = this.ws?.readyState;
        const isConnected = wsState === WebSocket.OPEN;
        const wsStateName = this.getWebSocketStateName(wsState);
        
        if (this.hotReloadDetected && isConnected) {
          logger.info('Hot reload: afterUpdate - connexion préservée avec succès', {
            connectionId: this.connectionId,
            wsState: wsStateName,
            isConnected: true
          });
        } else if (!isConnected) {
          logger.info('Hot reload: afterUpdate - connexion fermée, reconnexion nécessaire', {
            connectionId: this.connectionId,
            wsState: wsStateName,
            isConnected: false,
            willReconnect: true
          });
          
          // Si la connexion était fermée, reconnecter après un court délai
          const store = useBombPartyStore.getState();
          const hadRoomId = store.connection.roomId;
          const hadPlayerId = store.connection.playerId;
          const storedName = localStorage.getItem('bombparty_player_name');
          const token = localStorage.getItem('token');
          const playerName = storedName || (token ? 'AuthenticatedUser' : null);
          
          setTimeout(() => {
            logger.info('Hot reload: tentative de reconnexion après hot reload', {
              connectionId: this.connectionId,
              hadRoomId,
              hadPlayerId,
              willReauth: !!playerName,
              willRejoinRoom: !!hadRoomId
            });
            
            // Réinitialiser le compteur de tentatives pour une reconnexion propre
            this.reconnectAttempts = 0;
            this.connect();
            
            if (playerName && hadRoomId) {
              // Attendre que la connexion soit ouverte
              const checkConnection = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                  clearInterval(checkConnection);
                  
                  // Réauthentifier
                  if (playerName) {
                    logger.info('Hot reload: réauthentification après reconnexion', {
                      connectionId: this.connectionId,
                      playerName: playerName.replace(/token=[^&]+/, 'token=***')
                    });
                    // Stocker le nom pour l'authentification automatique dans onopen
                    this.pendingPlayerName = playerName;
                    // L'authentification se fera automatiquement dans onopen
                  }
                  
                  // Rejoindre la room après un court délai
                  if (hadRoomId) {
                    setTimeout(() => {
                      logger.info('Hot reload: rejoindre la room après reconnexion', {
                        connectionId: this.connectionId,
                        roomId: hadRoomId
                      });
                      this.joinRoom(hadRoomId);
                    }, 500);
                  }
                }
              }, 100);
              
              // Timeout de sécurité
              setTimeout(() => clearInterval(checkConnection), 5000);
            }
          }, 500);
        }
        
        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          this.hotReloadDetected = false;
          logger.debug('Hot reload flag reset', { connectionId: this.connectionId });
        }, 1000);
      });
    }
  }

  public init(): void {
    if (this.isInitialized) {
      logger.debug('Already initialized', { connectionId: this.connectionId });
      
      // Vérifier si la connexion est toujours active
      if (this.ws?.readyState === WebSocket.OPEN) {
        logger.debug('Connection already open, skipping reconnection', { connectionId: this.connectionId });
        return;
      }
      
      const isHotReload = typeof import.meta.hot !== 'undefined';
      if (isHotReload && this.hotReloadDetected) {
        logger.debug('Hot reload detected, preserving connection state', { connectionId: this.connectionId });
        return;
      }
    }
    logger.debug('Manual initialization', { connectionId: this.connectionId });
    this.isInitialized = true;
    this.connect();
  }

  private connect(): void {
    // Empêcher les connexions multiples simultanées
    if (this.isConnecting) {
      logger.warn('Connection already in progress, ignoring duplicate request', { 
        connectionId: this.connectionId,
        wsState: this.ws?.readyState,
        wsStateString: this.getReadyStateString()
      });
      return;
    }
    
    // Vérifier si déjà connecté
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('Already connected, ignoring connection request', { 
        connectionId: this.connectionId,
        wsState: this.ws.readyState
      });
      return;
    }
    
    // Vérifier si en train de se connecter
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      logger.warn('Connection in progress (CONNECTING state), ignoring duplicate request', { 
        connectionId: this.connectionId,
        wsState: this.ws.readyState
      });
      return;
    }
    
    // Vérifier si une connexion WebSocket existe déjà
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      logger.warn('WebSocket already connected or connecting, ignoring duplicate request', {
        connectionId: this.connectionId,
        readyState: this.ws.readyState
      });
      return;
    }
    
    // Fermer proprement toute connexion existante avant d'en créer une nouvelle
    if (this.ws) {
      logger.debug('Cleaning up old WebSocket before creating new connection', {
        connectionId: this.connectionId,
        oldState: this.ws.readyState
      });
      this.cleanupWebSocket();
    }
    
    this.isConnecting = true;
    const store = useBombPartyStore.getState();
    store.setConnectionState('connecting');
    
    this.registeredWithCoordinator = wsCoordinator.registerConnection(
      this.connectionId,
      'bombPartyService',
      50 // Higher than BombPartyClient to remain primary
    );
    
    if (!this.registeredWithCoordinator) {
      logger.debug('Not authorized by coordinator, connection cancelled', { connectionId: this.connectionId });
      store.setConnectionState('disconnected');
      this.isConnecting = false;
      return;
    }
    
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsUrl = isDev 
        ? `ws://localhost:3001/bombparty/ws`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/bombparty/ws`;
      
      logger.debug('Connecting to WebSocket', { connectionId: this.connectionId, url: wsUrl.replace(/token=[^&]+/, 'token=***') });
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      logger.error('Connection error', error, { connectionId: this.connectionId });
      this.isConnecting = false;
      this.handleConnectionError();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) {
      logger.warn('setupEventHandlers called but ws is null', { connectionId: this.connectionId });
      return;
    }

    if (this.ws.onopen !== null) {
      logger.warn('Handlers already attached, cleaning before re-attaching', { connectionId: this.connectionId });
      this.cleanupHandlers();
    }

    logger.debug('Setting up WebSocket event handlers', { connectionId: this.connectionId });

    this.ws.onopen = () => {
      logger.info('WebSocket connected', { connectionId: this.connectionId });
      this.isConnecting = false; // Connexion réussie
      this.reconnectAttempts = 0;
      this.lastPong = Date.now(); // Réinitialiser lastPong à la connexion
      this.startHeartbeat();
      this.isWebSocketReady = true;

      const token = localStorage.getItem('token');
      const storedName = localStorage.getItem('bombparty_player_name');
      const hasAuthUser = !!token;

      logger.debug('Auth decision', { hasAuthUser, storedName: storedName ? 'PRESENT' : 'MISSING', pending: this.pendingPlayerName ? 'PRESENT' : 'MISSING' });

      if (this.pendingPlayerName) {
        this.authenticate(this.pendingPlayerName);
        this.pendingPlayerName = null;
        return;
      }

      if (storedName) {
        this.authenticate(storedName);
        return;
      }

      if (hasAuthUser) {
        this.authenticate('AuthenticatedUser');
        return;
      }

      const guestId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.authenticate(`Guest_${guestId}`);
      
      // Envoyer les messages en attente après la reconnexion
      this.flushPendingMessages();
      
      const store = useBombPartyStore.getState();
      if (store.connection.roomId) {
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN && store.connection.playerId && store.connection.roomId) {
            logger.info('🔄 Demande automatique de l\'état de la room après reconnexion', {
              connectionId: this.connectionId,
              roomId: store.connection.roomId,
              playerId: store.connection.playerId
            });
            this.requestRoomState(store.connection.roomId);
          }
        }, 1000);
      }
    };

    this.ws.onmessage = (event) => {
      const isPrimary = wsCoordinator.isPrimaryConnection(this.connectionId);
      
      this.lastPong = Date.now();
      
      // Incrémenter le compteur de messages
      this.messageCounter++;
      
      try {
        const message: BombPartyMessage = JSON.parse(event.data);
        
        // Vérifier si c'est un message dupliqué
        if (this.isDuplicateMessage(message)) {
          logger.warn('Duplicate message detected, ignoring', { 
            connectionId: this.connectionId, 
            event: message.event,
            messageCounter: this.messageCounter
          });
          return;
        }
        
        if (message.event !== 'bp:ping' && message.event !== 'bp:pong') {
          logger.debug('Message received', { 
            connectionId: this.connectionId, 
            isPrimary, 
            event: message.event,
            messageCounter: this.messageCounter
          });
        }
        this.handleMessage(message);
      } catch (error) {
        logger.error('Error parsing message', error, { connectionId: this.connectionId });
      }
    };

    this.ws.onclose = (event) => {
      logger.info('Disconnected', { connectionId: this.connectionId, code: event.code, reason: event.reason });
      this.isConnecting = false;
      this.stopHeartbeat();
      
      // Stocker les informations d'erreur pour détecter les erreurs permanentes
      this.lastConnectionError = { code: event.code, reason: event.reason };
      
      this.handleDisconnection(event.code, event.reason);
    };

    this.ws.onerror = (error) => {
      const errorInfo = {
        connectionId: this.connectionId,
        type: error.type || 'unknown',
        message: 'WebSocket connection error',
        target: error.target ? (error.target instanceof WebSocket ? 'WebSocket' : String(error.target)) : 'unknown'
      };
      logger.error('WebSocket error', errorInfo);
      this.isConnecting = false;
      this.handleConnectionError();
    };
  }

  /**
   * Vérifie si un message est un duplicata récent
   * @param message Le message à vérifier
   * @returns true si le message est un duplicata, false sinon
   */
  private isDuplicateMessage(message: BombPartyMessage): boolean {
    // Ne pas appliquer la déduplication aux pings/pongs
    if (message.event === 'bp:ping' || message.event === 'bp:pong') {
      return false;
    }
    
    // Créer une clé unique pour le message basée sur son type et son contenu
    const messageKey = `${message.event}_${JSON.stringify(message.payload || {})}`;
    const now = Date.now();
    
    // Vérifier si ce message a été traité récemment
    const lastProcessed = this.lastProcessedMessages.get(messageKey);
    if (lastProcessed && (now - lastProcessed) < this.MESSAGE_DEDUP_WINDOW) {
      return true;
    }
    
    // Enregistrer ce message comme traité
    this.lastProcessedMessages.set(messageKey, now);
    
    // Nettoyer les anciennes entrées (toutes celles plus vieilles que la fenêtre)
    for (const [key, timestamp] of this.lastProcessedMessages.entries()) {
      if ((now - timestamp) > this.MESSAGE_DEDUP_WINDOW) {
        this.lastProcessedMessages.delete(key);
      }
    }
    
    return false;
  }

  private handleMessage(message: BombPartyMessage): void {
    const store = useBombPartyStore.getState();

    if (message.t === 'error') {
      const error = message as TypedError;
      logger.warn('Error message received from server', { 
        connectionId: this.connectionId,
        code: error.code,
        msg: error.msg
      });
      store.setLastError(error.msg);
      
      // Cas particulier: la room n'existe plus après reconnexion
      if ((error.code === 'STATE_ERROR' || error.code === 'ROOM_NOT_FOUND') && /room not found/i.test(error.msg || '')) {
        const hadRoom = !!store.connection.roomId;
        const gameInProgress = store.gameState && store.gameState.phase === 'TURN_ACTIVE';
        if (hadRoom && !gameInProgress) {
          logger.info('Room not found on server (no game in progress), resetting local room state');
          store.setRoomId(null);
          store.setLobbyPlayers([]);
          store.setIsHost(false);
          store.setGamePhase('LOBBY');
        } else if (hadRoom && gameInProgress) {
          logger.warn('Room not found but game in progress, preserving game state');
          // Ne pas réinitialiser pour éviter de casser la partie en cours
        }
      }
      
      // Ne pas fermer la connexion pour une erreur - c'est juste un message d'erreur
      // La connexion reste ouverte pour permettre de nouvelles tentatives
      return;
    }

    if (!message.event) {
      logger.warn('Message received without event field', { message });
      return;
    }

    if (message.event === 'bp:pong') {
      this.lastPong = Date.now();
      return;
    }

    switch (message.event) {
      case 'bp:welcome':
        logger.debug('Welcome message received');
        break;

      case 'bp:auth:success':
        store.setPlayerId(message.payload.playerId);
        store.setIsAuthenticating(false);
        store.setConnectionState('connected');
        this.requestLobbyList();
        break;

      case 'bp:lobby:created':
        logger.info('Lobby créé avec succès', { 
          connectionId: this.connectionId,
          roomId: message.payload.roomId, 
          maxPlayers: message.payload.maxPlayers,
          playerId: message.payload.playerId
        });
        
        // Vérifier que la connexion est toujours ouverte
        if (this.ws?.readyState !== WebSocket.OPEN) {
          logger.error('WebSocket closed during lobby creation', {
            connectionId: this.connectionId,
            roomId: message.payload.roomId,
            wsState: this.ws?.readyState
          });
          store.setLastError('Connexion perdue pendant la création du lobby');
          return;
        }
        
        store.setRoomId(message.payload.roomId);
        store.setIsHost(true);
        store.setLobbyMaxPlayers(message.payload.maxPlayers);
        // Les joueurs seront mis à jour par bp:lobby:joined qui suit
        store.setGamePhase('PLAYERS');
        break;

      case 'bp:lobby:joined':
        logger.info('Lobby rejoint avec succès', { 
          roomId: message.payload.roomId, 
          playersCount: message.payload.players?.length || 0,
          maxPlayers: message.payload.maxPlayers 
        });
        store.setRoomId(message.payload.roomId);
        store.setLobbyPlayers(message.payload.players || []);
        store.setLobbyMaxPlayers(message.payload.maxPlayers);
        if (message.payload.players && store.connection.playerId) {
          const first = message.payload.players[0]?.id;
          store.setIsHost(first === store.connection.playerId);
        }
        store.setGamePhase('PLAYERS');
        
        const isReconnect = message.payload.isReconnect || false;
        if (isReconnect || store.gameState) {
          logger.info('🔄 Reconnexion détectée - demande de l\'état de la room', {
            connectionId: this.connectionId,
            roomId: message.payload.roomId,
            isReconnect
          });
          setTimeout(() => {
            this.requestRoomState(message.payload.roomId);
          }, 500);
        }
        
        // Envoyer les messages en attente après avoir rejoint la room
        this.flushPendingMessages();
        break;

      case 'bp:lobby:player_joined':
        logger.info('Nouveau joueur a rejoint le lobby', { 
          roomId: message.payload.roomId,
          newPlayerId: message.payload.playerId,
          newPlayerName: message.payload.playerName,
          playersCount: message.payload.players?.length || 0,
          maxPlayers: message.payload.maxPlayers
        });
        if (store.connection.roomId === message.payload.roomId) {
          store.setLobbyPlayers(message.payload.players || []);
          store.setLobbyMaxPlayers(message.payload.maxPlayers);
          // Vérifier si on est toujours l'hôte
          if (message.payload.players && store.connection.playerId) {
            const first = message.payload.players[0]?.id;
            store.setIsHost(first === store.connection.playerId);
          }
        }
        break;

      case 'bp:lobby:player_left':
        logger.info('Joueur a quitté le lobby', { 
          roomId: message.payload.roomId,
          leftPlayerId: message.payload.playerId,
          playersCount: message.payload.players?.length || 0
        });
        if (store.connection.roomId === message.payload.roomId) {
          store.setLobbyPlayers(message.payload.players || []);
          // Vérifier si on est maintenant l'hôte
          if (message.payload.players && store.connection.playerId) {
            const first = message.payload.players[0]?.id;
            store.setIsHost(first === store.connection.playerId);
          }
        }
        break;

      case 'bp:lobby:left':
        // Si c'est nous qui quittons, vider tout
        if (message.payload.playerId === store.connection.playerId) {
          logger.info('Nous avons quitté le lobby', { roomId: message.payload.roomId });
          store.setRoomId(null);
          store.setIsHost(false);
          store.setLobbyPlayers([]);
          store.setGamePhase('LOBBY');
        } else {
          logger.info('Un joueur a quitté le lobby', { 
            roomId: message.payload.roomId,
            leftPlayerId: message.payload.playerId,
            playersCount: message.payload.players?.length || 0
          });
          if (store.connection.roomId === message.payload.roomId) {
            store.setLobbyPlayers(message.payload.players || []);
            // Vérifier si on est maintenant l'hôte
            if (message.payload.players && store.connection.playerId) {
              const first = message.payload.players[0]?.id;
              store.setIsHost(first === store.connection.playerId);
            }
          }
        }
        break;

      case 'bp:lobby:list':
        store.setLobbies(message.payload.rooms);
        break;

      case 'bp:lobby:list_updated':
        store.setLobbies(message.payload.rooms);
        break;

      case 'bp:lobby:details':
        break;
        
      case 'bp:room:state':
        logger.debug('Room state updated', { payload: message.payload });
        const isReconnectState = message.payload.isReconnect || false;
        
        if (store.connection.roomId === message.payload.roomId) {
          store.setLobbyPlayers(message.payload.players);
          store.setLobbyMaxPlayers(message.payload.maxPlayers);
          
          // Si c'est une reconnexion, logger l'information
          if (isReconnectState) {
            logger.info('✅ État de la room reçu après reconnexion', {
              connectionId: this.connectionId,
              roomId: message.payload.roomId,
              hasGameState: !!message.payload.gameState,
              sequenceNumber: message.payload.sequenceNumber,
              stateVersion: message.payload.stateVersion
            });
          }
          
          if (message.payload.gameState) {
            this.flushPendingMessages();
          }
        }
        if (message.payload.players && store.connection.playerId) {
          const first = message.payload.players[0]?.id;
          store.setIsHost(first === store.connection.playerId);
        }
        this.requestLobbyList();
        break;
        
      case 'bp:room:closed':
        logger.info('Room closed', { payload: message.payload });
        store.setRoomId(null);
        store.setLobbyPlayers([]);
        store.setIsHost(false);
        store.setLastError('Room closed by host');
        break;
        
      case 'bp:error':
        logger.error('Server error', undefined, { payload: message.payload });
        const errorCode = message.payload.code;
        let errorMessage = 'An error occurred';
        
        switch (errorCode) {
          case 'ROOM_FULL':
            errorMessage = 'Room is full';
            break;
          case 'BAD_PASSWORD':
            errorMessage = 'Incorrect password';
            break;
          case 'ROOM_NOT_FOUND':
            errorMessage = 'Room not found';
            break;
          case 'NOT_AUTH':
            errorMessage = 'You must be connected';
            break;
          default:
            errorMessage = message.payload.message || errorMessage;
        }
        
        store.setLastError(errorMessage);
        break;

      case 'bp:game:countdown':
        logger.debug('Game countdown received', { payload: message.payload });
        
        // Vérifier que c'est pour notre room
        if (message.payload?.roomId === store.connection.roomId) {
          const startTime = message.payload.startTime ?? Date.now();
          const duration = message.payload.countdownDuration ?? 3000;
          
          const updateCountdown = () => {
            const now = Date.now();
            const remainingMs = Math.max(0, startTime + duration - now);
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            store.setCountdown(remainingSeconds);
          };
          
          // S'assurer que la phase est 'GAME' pour que le countdown s'affiche
          store.setGamePhase('GAME');
          updateCountdown();
          
          // Nettoyer l'interval précédent s'il existe
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          
          // Mettre à jour le countdown toutes les 100ms
          this.countdownInterval = setInterval(() => {
            updateCountdown();
            if (Date.now() >= startTime + duration) {
              if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
              }
              store.setCountdown(0);
            }
          }, 100) as unknown as number;
          
          logger.info('Countdown démarré', { startTime, duration, roomId: message.payload.roomId, countdown: Math.ceil((startTime + duration - Date.now()) / 1000) });
        }
        break;

      case 'bp:game:start':
        logger.debug('Game start received', { payload: message.payload });
        
        // Vérifier que c'est pour notre room
        if (message.payload?.roomId === store.connection.roomId) {
          store.setGamePhase('GAME');
          // Le countdown sera remis à 0 par son propre interval quand il arrive à 0
          store.setGameStartTime(Date.now());
          logger.info('Jeu démarré', { roomId: message.payload.roomId });
        }
        break;

      case 'bp:game:input:received':
        // Confirmation immédiate que le serveur a reçu la soumission
        logger.debug('Game input received confirmation', { payload: message.payload });
        // Émettre un événement personnalisé pour que les composants puissent l'écouter
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bp:game:input:received', {
            detail: message.payload
          }));
        }
        break;

      case 'bp:game:state':
        // Gérer les messages en format complet ou delta
        try {
          const gameStatePayload = message.payload;
          const currentTurnStartTime = store.turnStartTime;
          
          // Vérifier si c'est un état complet ou un delta
          if (gameStatePayload.full === true && gameStatePayload.gameState) {
          // Format complet : état complet fourni
          logger.debug('Received full game state', {
            connectionId: this.connectionId,
            sequenceNumber: gameStatePayload.sequenceNumber,
            phase: gameStatePayload.gameState.phase
          });
          
          const newGameState = gameStatePayload.gameState;
          const newTurnStartedAt = newGameState.turnStartedAt;
          
          if (newGameState.phase === 'TURN_ACTIVE' && newTurnStartedAt) {
            const isNewTurn = newTurnStartedAt !== currentTurnStartTime;
            const needsUpdate = isNewTurn || currentTurnStartTime === 0;
            const timeDiff = Math.abs(newTurnStartedAt - currentTurnStartTime);
            
            if (needsUpdate || timeDiff > 100) {
              logger.info('🎯 bp:game:state (full) - Synchronisation du timer', {
                connectionId: this.connectionId,
                currentTurnStartTime,
                newTurnStartedAt,
                isNewTurn,
                isInitialization: currentTurnStartTime === 0,
                isResync: !isNewTurn && timeDiff > 100,
                timeDiff,
                currentPlayerId: newGameState.currentPlayerId,
                timeOffset: Date.now() - newTurnStartedAt,
                turnDurationMs: newGameState.turnDurationMs,
                sequenceNumber: gameStatePayload.sequenceNumber
              });
              store.setTurnStartTime(newTurnStartedAt);
            } else {
              logger.debug('bp:game:state (full) - Timer déjà synchronisé', {
                connectionId: this.connectionId,
                turnStartTime: currentTurnStartTime,
                serverTurnStartedAt: newTurnStartedAt,
                timeDiff
              });
            }
          } else if (newGameState.phase !== 'TURN_ACTIVE' && currentTurnStartTime > 0) {
            logger.debug('bp:game:state (full) - Phase changée, turnStartTime conservé', {
              connectionId: this.connectionId,
              oldPhase: 'TURN_ACTIVE',
              newPhase: newGameState.phase,
              turnStartTime: currentTurnStartTime
            });
          }
          
          store.receiveServerState(newGameState);
          
          if (newGameState.phase === 'TURN_ACTIVE') {
            store.setGamePhase('GAME');
          }
          
          // Si c'est une reconnexion, logger l'information
          if (gameStatePayload.isReconnect) {
            logger.info('✅ État complet du jeu reçu après reconnexion', {
              connectionId: this.connectionId,
              roomId: gameStatePayload.roomId,
              phase: newGameState.phase,
              sequenceNumber: gameStatePayload.sequenceNumber,
              stateVersion: gameStatePayload.stateVersion,
              currentPlayerId: newGameState.currentPlayerId,
              turnStartedAt: newGameState.turnStartedAt
            });
          }
          
          this.flushPendingMessages();
        } else if (gameStatePayload.delta && !gameStatePayload.full) {
          logger.debug('Received game state delta', {
            connectionId: this.connectionId,
            sequenceNumber: gameStatePayload.sequenceNumber,
            deltaKeys: Object.keys(gameStatePayload.delta)
          });
          
          const delta = gameStatePayload.delta;
          const newTurnStartedAt = delta.turnStartedAt;
          
          if (delta.phase === 'TURN_ACTIVE' && newTurnStartedAt) {
            const isNewTurn = newTurnStartedAt !== currentTurnStartTime;
            const needsUpdate = isNewTurn || currentTurnStartTime === 0;
            const timeDiff = Math.abs(newTurnStartedAt - currentTurnStartTime);
            
            const durationChanged = delta.turnDurationMs && 
                                   store.gameState?.turnDurationMs && 
                                   delta.turnDurationMs !== store.gameState.turnDurationMs;
            
            if (needsUpdate || timeDiff > 100 || durationChanged) {
              logger.info('🎯 bp:game:state (delta) - Synchronisation du timer', {
                connectionId: this.connectionId,
                currentTurnStartTime,
                newTurnStartedAt,
                isNewTurn,
                isInitialization: currentTurnStartTime === 0,
                isResync: !isNewTurn && (timeDiff > 100 || durationChanged),
                timeDiff,
                durationChanged,
                oldDuration: store.gameState?.turnDurationMs,
                newDuration: delta.turnDurationMs,
                timeOffset: Date.now() - newTurnStartedAt,
                turnDurationMs: delta.turnDurationMs,
                sequenceNumber: gameStatePayload.sequenceNumber,
                deltaKeys: Object.keys(delta)
              });
              store.setTurnStartTime(newTurnStartedAt);
            } else {
              logger.debug('bp:game:state (delta) - Timer déjà synchronisé', {
                connectionId: this.connectionId,
                turnStartTime: currentTurnStartTime,
                serverTurnStartedAt: newTurnStartedAt,
                timeDiff
              });
            }
          }
          
          store.applyGameStateDelta(delta, gameStatePayload.sequenceNumber);
          
          // Mettre à jour la phase si elle est dans le delta
          if (delta.phase === 'TURN_ACTIVE') {
            store.setGamePhase('GAME');
          }
          
          // Si c'est une reconnexion, logger l'information
          if (gameStatePayload.isReconnect) {
            logger.info('✅ État delta du jeu reçu après reconnexion', {
              connectionId: this.connectionId,
              roomId: gameStatePayload.roomId,
              sequenceNumber: gameStatePayload.sequenceNumber,
              stateVersion: gameStatePayload.stateVersion,
              deltaKeys: Object.keys(delta)
            });
          }
          
          // Envoyer les messages en attente après avoir reçu l'état du jeu (reconnexion)
          this.flushPendingMessages();
        } else {
          // Message malformé : logger un avertissement
          logger.warn('Invalid game state message format', {
            connectionId: this.connectionId,
            hasGameState: !!gameStatePayload.gameState,
            hasDelta: !!gameStatePayload.delta,
            full: gameStatePayload.full,
            sequenceNumber: gameStatePayload.sequenceNumber
          });
        }
        } catch (error) {
          logger.error('Error processing bp:game:state', error, {
            connectionId: this.connectionId,
            hasPayload: !!message.payload,
            payloadKeys: message.payload ? Object.keys(message.payload) : []
          });
          // Ne pas crasher le jeu, continuer avec l'état actuel
        }
        break;

      case 'bp:game:end':
        logger.debug('Game end received', { payload: message.payload });
        const endPayload = message.payload;
        store.setGamePhase('GAME_OVER');
        
        const currentState = store.gameState;
        if (currentState && endPayload.winner) {
          const updatedState = {
            ...currentState,
            winner: endPayload.winner,
            phase: 'GAME_OVER' as const
          };
          store.receiveServerState(updatedState);
          logger.debug('Winner added to gameState', { winnerId: endPayload.winner.id });
        }
        break;

      case 'bp:turn:started':
        logger.debug('Turn started received', { payload: message.payload });
        const payload = message.payload;
        if (payload && 
            payload.turnStartedAt !== undefined && 
            payload.turnDurationMs !== undefined && 
            payload.currentPlayerId !== undefined) {
          // Vérifier que c'est pour notre room
          if (payload.roomId === store.connection.roomId) {
            const currentTurnStartTime = store.turnStartTime;
            const newTurnStartedAt = payload.turnStartedAt;
            
            const isNewTurn = currentTurnStartTime !== newTurnStartedAt;
            
            logger.info('🎯 bp:turn:started - Mise à jour de turnStartTime', {
              roomId: payload.roomId,
              currentPlayerId: payload.currentPlayerId,
              turnDurationMs: payload.turnDurationMs,
              turnStartedAt: newTurnStartedAt,
              currentTurnStartTime,
              isNewTurn,
              timeOffset: Date.now() - newTurnStartedAt
            });
            
            store.handleTurnStarted(
              payload.turnStartedAt,
              payload.turnDurationMs,
              payload.currentPlayerId
            );
            store.setGamePhase('GAME');
            
            store.setTurnStartTime(payload.turnStartedAt);
            
            logger.info('✅ Tour démarré - turnStartTime mis à jour avec le temps serveur');
          }
        }
        break;

      case 'turn_started':
        if (message.turnStartedAt !== undefined && 
            message.turnDurationMs !== undefined && 
            message.currentPlayerId !== undefined) {
          store.handleTurnStarted(
            message.turnStartedAt,
            message.turnDurationMs,
            message.currentPlayerId
          );
        }
        break;

      case 'game_state':
        store.receiveServerState(message.gameState);
        break;

      case 'bp:pong':
        // Mise à jour explicite de lastPong pour le heartbeat
        const pongReceivedAt = Date.now();
        const previousLastPong = this.lastPong;
        this.lastPong = pongReceivedAt;
        
        const latency = message.payload?.ts ? pongReceivedAt - message.payload.ts : 'unknown';
        const timeSinceLastPong = previousLastPong > 0 ? pongReceivedAt - previousLastPong : 'unknown';
        
        logger.debug('Pong received', { 
          connectionId: this.connectionId, 
          timestamp: message.payload?.ts,
          latency,
          timeSinceLastPong,
          lastPongUpdated: pongReceivedAt
        });
        break;

      default:
        logger.debug('Unknown message', { message });
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    logger.debug('Starting heartbeat', { 
      connectionId: this.connectionId,
      interval: this.HEARTBEAT_INTERVAL,
      timeout: this.PONG_TIMEOUT
    });
    
    this.heartbeatInterval = setInterval(() => {
      if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
        return;
      }
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const timeSinceLastPong = now - this.lastPong;
        
        if (timeSinceLastPong > this.PONG_TIMEOUT) {
          logger.warn('⏱️ Heartbeat timeout detected before ping', { 
            connectionId: this.connectionId,
            timeSinceLastPong,
            threshold: this.PONG_TIMEOUT,
            lastPong: this.lastPong,
            now,
            wsState: this.getReadyStateString()
          });
          this.handleConnectionError();
          return;
        }
        
        logger.debug('Sending heartbeat ping', { 
          connectionId: this.connectionId,
          timeSinceLastPong,
          threshold: this.PONG_TIMEOUT,
          wsState: this.getReadyStateString()
        });
        
        try {
          this.ws.send(JSON.stringify({ event: 'bp:ping', payload: { ts: now } }));
        } catch (error) {
          logger.error('Error sending ping', error, { 
            connectionId: this.connectionId,
            wsState: this.getReadyStateString()
          });
          this.handleConnectionError();
          return;
        }
        
        setTimeout(() => {
          const checkTime = Date.now();
          const timeSincePong = checkTime - this.lastPong;
          
          if (timeSincePong > this.PONG_TIMEOUT) {
            logger.warn('⏱️ Pong timeout detected after ping', { 
              connectionId: this.connectionId,
              timeSincePong,
              threshold: this.PONG_TIMEOUT,
              lastPong: this.lastPong,
              now: checkTime,
              wsState: this.getReadyStateString()
            });
            this.handleConnectionError();
          } else {
            logger.debug('Pong check OK', {
              connectionId: this.connectionId,
              timeSincePong,
              threshold: this.PONG_TIMEOUT
            });
          }
        }, this.HEARTBEAT_INTERVAL / 2); // Vérifier après 5s (moitié du heartbeat)
      } else {
        logger.warn('Heartbeat skipped - WebSocket not open', {
          connectionId: this.connectionId,
          wsState: this.getReadyStateString()
        });
      }
    }, this.HEARTBEAT_INTERVAL); // Ping toutes les 10 secondes (optimisé pour réseau chargé)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Nettoie uniquement les handlers WebSocket sans fermer la connexion
   */
  private cleanupHandlers(): void {
    if (!this.ws) return;
    
    logger.debug('Cleaning up WebSocket handlers', { connectionId: this.connectionId });
    
    try {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
    } catch (err) {
      logger.warn('Error cleaning up handlers', { connectionId: this.connectionId, error: err });
    }
  }

  /**
   * Ferme proprement une connexion WebSocket existante
   */
  private cleanupWebSocket(): void {
    logger.debug('Cleaning up WebSocket', { 
      connectionId: this.connectionId,
      wsState: this.ws?.readyState 
    });
    
    this.stopHeartbeat();
    this.stopCountdown();
    
    if (this.ws) {
      try {
        // Nettoyer les handlers avant de fermer
        this.cleanupHandlers();
        
        // Fermer la connexion si elle est ouverte
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (err) {
        logger.warn('Error closing WebSocket', { connectionId: this.connectionId, error: err });
      }
      
      this.ws = null;
    }
    
    this.isWebSocketReady = false;
  }

  private handleDisconnection(code?: number, reason?: string): void {
    if (this.hotReloadDetected && this.ws?.readyState === WebSocket.OPEN) {
      logger.info('Hot reload in progress - ignoring disconnection (connexion ouverte préservée)', {
        connectionId: this.connectionId,
        code,
        reason,
        wsState: this.getWebSocketStateName(this.ws?.readyState)
      });
      return;
    }
    
    if (this.hotReloadDetected && this.ws?.readyState !== WebSocket.OPEN) {
      logger.info('Hot reload in progress mais connexion fermée - traitement de la déconnexion', {
        connectionId: this.connectionId,
        code,
        reason,
        wsState: this.getWebSocketStateName(this.ws?.readyState),
        reasonForLog: 'Connexion déjà fermée, pas de préservation nécessaire'
      });
      // Continuer le traitement normal de la déconnexion
    }
    
    this.stopCountdown();
    const store = useBombPartyStore.getState();
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    // Déterminer le type de déconnexion et l'action à prendre
    const disconnectionInfo = this.getDisconnectionInfo(code, reason);
    
    const gameInProgress = !!store.connection.roomId;
    const currentRoomId = store.connection.roomId;
    const currentPlayerId = store.connection.playerId;
    
    logger.info('🔌 Handling disconnection', {
      connectionId: this.connectionId,
      code,
      reason,
      type: disconnectionInfo.type,
      description: disconnectionInfo.description,
      shouldReconnect: disconnectionInfo.shouldReconnect,
      isServerError: disconnectionInfo.isServerError,
      reconnectAttempts: this.reconnectAttempts,
      gameInProgress,
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
    
    // Ne pas reconnecter pour les fermetures normales
    if (!disconnectionInfo.shouldReconnect) {
      store.setConnectionState('disconnected');
      logger.info('✅ Normal disconnection - not reconnecting', {
        connectionId: this.connectionId,
        code,
        reason: disconnectionInfo.description,
        type: disconnectionInfo.type
      });
      return;
    }
    
    const maxAttempts = disconnectionInfo.isServerError 
      ? this.maxReconnectAttemptsForServerDown 
      : this.maxReconnectAttempts;
    
    // Vérifier si on a déjà atteint ou dépassé la limite
    if (this.reconnectAttempts >= maxAttempts) {
      // Maximum de tentatives atteint - arrêter définitivement
      store.setConnectionState('server_unreachable');
      const errorMessage = disconnectionInfo.isServerError
        ? 'Le serveur est inaccessible. Veuillez réessayer plus tard.'
        : 'Connexion perdue. Veuillez rafraîchir la page.';
      store.setLastError(errorMessage);
      
      logger.error('❌ Max reconnect attempts reached - giving up', {
        connectionId: this.connectionId,
        attempts: this.reconnectAttempts,
        maxAttempts,
        disconnectionType: disconnectionInfo.type,
        description: disconnectionInfo.description,
        gameInProgress,
        roomId: currentRoomId
      });
      
      // Nettoyer tout timeout de reconnexion en cours
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
        logger.debug('Cleared pending reconnect timeout after max attempts', { connectionId: this.connectionId });
      }
      
      return; // Arrêter ici, ne pas programmer de reconnexion
    }
    
    store.setConnectionState('reconnecting');
    
    // Préserver l'état pour la reconnexion
    const reconnectInfo = {
      connectionId: this.connectionId,
      disconnectionType: disconnectionInfo.type,
      description: disconnectionInfo.description,
      attempt: this.reconnectAttempts + 1, // Prochaine tentative
      maxAttempts,
      gameInProgress,
      roomId: currentRoomId,
      playerId: currentPlayerId
    };
    
    if (disconnectionInfo.type === 'PONG_TIMEOUT') {
      logger.warn('⏱️ PONG_TIMEOUT detected - reconnecting automatically', reconnectInfo);
    } else {
      logger.info('🔄 Scheduling reconnection for error', reconnectInfo);
    }
    
    this.scheduleReconnect(disconnectionInfo.isServerError);
  }
  
  private getDisconnectionInfo(code?: number, reason?: string): {
    type: string;
    description: string;
    shouldReconnect: boolean;
    isServerError: boolean;
  } {
    // Codes de fermeture WebSocket standard
    switch (code) {
      case 1000:
        // Normal Closure - fermeture propre, pas de reconnexion
        return {
          type: 'NORMAL_CLOSURE',
          description: 'Normal closure (1000)',
          shouldReconnect: false,
          isServerError: false
        };
      
      case 1001:
        // Going Away - navigateur ferme la page/onglet, ou serveur redémarre
        // Ne pas reconnecter car c'est généralement intentionnel
        return {
          type: 'GOING_AWAY',
          description: 'Going away (1001) - page closing or server restart',
          shouldReconnect: false,
          isServerError: false
        };
      
      case 1006:
        // Abnormal Closure - connexion perdue sans fermeture propre
        // Peut indiquer que le serveur n'est pas accessible
        const isInitialConnection = this.reconnectAttempts === 0;
        return {
          type: 'ABNORMAL_CLOSURE',
          description: isInitialConnection 
            ? 'Abnormal closure (1006) - server may be unreachable'
            : 'Abnormal closure (1006) - connection lost',
          shouldReconnect: true,
          isServerError: isInitialConnection // Considérer comme erreur serveur si c'est la première tentative
        };
      
      case 1005:
        // No Status Received - pas de code de statut
        // Peut indiquer une erreur réseau
        return {
          type: 'NO_STATUS',
          description: 'No status received (1005) - possible network error',
          shouldReconnect: true,
          isServerError: true
        };
      
      case 1002:
        // Protocol Error
        return {
          type: 'PROTOCOL_ERROR',
          description: 'Protocol error (1002)',
          shouldReconnect: false,
          isServerError: false
        };
      
      case 1003:
        // Unsupported Data
        return {
          type: 'UNSUPPORTED_DATA',
          description: 'Unsupported data (1003)',
          shouldReconnect: false,
          isServerError: false
        };
      
      case 1008:
        // Policy Violation - mais peut être un PONG_TIMEOUT qui nécessite reconnexion
        // Vérifier la raison pour distinguer les cas
        if (reason === 'PONG_TIMEOUT' || reason?.includes('PONG_TIMEOUT') || reason?.includes('timeout')) {
          // PONG_TIMEOUT est une erreur temporaire qui nécessite reconnexion
          return {
            type: 'PONG_TIMEOUT',
            description: 'Pong timeout (1008) - connection lost due to heartbeat timeout',
            shouldReconnect: true,
            isServerError: false // Erreur temporaire, pas une erreur serveur permanente
          };
        }
        // Autre violation de politique - ne pas reconnecter automatiquement
        return {
          type: 'POLICY_VIOLATION',
          description: `Policy violation (1008) - ${reason || 'unknown reason'}`,
          shouldReconnect: false,
          isServerError: false
        };
      
      case 1011:
        // Internal Server Error
        return {
          type: 'SERVER_ERROR',
          description: 'Internal server error (1011)',
          shouldReconnect: true,
          isServerError: true
        };
      
      case undefined:
        // Pas de code fourni - considérer comme une erreur
        return {
          type: 'UNKNOWN',
          description: 'Unknown disconnection (no code)',
          shouldReconnect: true,
          isServerError: false
        };
      
      default:
        // Autres codes - par défaut, considérer comme une erreur nécessitant reconnexion
        return {
          type: 'OTHER',
          description: `Disconnection with code ${code}`,
          shouldReconnect: true,
          isServerError: false
        };
    }
  }

  private handleConnectionError(): void {
    if (this.hotReloadDetected && this.ws?.readyState === WebSocket.OPEN) {
      logger.info('Hot reload in progress - ignoring connection error (connexion ouverte préservée)', {
        connectionId: this.connectionId,
        wsState: this.getWebSocketStateName(this.ws?.readyState)
      });
      return;
    }
    
    // Si hot reload mais connexion fermée, traiter l'erreur normalement
    if (this.hotReloadDetected && this.ws?.readyState !== WebSocket.OPEN) {
      logger.info('Hot reload in progress mais connexion fermée - traitement de l\'erreur', {
        connectionId: this.connectionId,
        wsState: this.getWebSocketStateName(this.ws?.readyState),
        reason: 'Connexion déjà fermée, pas de préservation nécessaire'
      });
      // Continuer le traitement normal de l'erreur
    }
    
    const store = useBombPartyStore.getState();
    
    const maxAttempts = this.maxReconnectAttemptsForServerDown;
    
    logger.warn('Connection error detected, attempting to reconnect', {
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts,
      roomId: store.connection.roomId,
      playerId: store.connection.playerId
    });
    
    if (this.reconnectAttempts >= maxAttempts) {
      // Maximum de tentatives atteint
      store.setConnectionState('server_unreachable');
      store.setLastError('Le serveur est inaccessible. Veuillez réessayer plus tard.');
      
      logger.error('❌ Max reconnect attempts reached in handleConnectionError - giving up', {
        connectionId: this.connectionId,
        attempts: this.reconnectAttempts,
        maxAttempts
      });
      return;
    }
    
    store.setConnectionState('reconnecting');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.stopCountdown();
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    this.scheduleReconnect(true); // isServerUnreachable = true car c'est une erreur de connexion
  }

  private scheduleReconnect(isServerUnreachable: boolean = false): void {
    const maxAttempts = isServerUnreachable 
      ? this.maxReconnectAttemptsForServerDown 
      : this.maxReconnectAttempts;
    
    if (this.reconnectAttempts >= maxAttempts) {
      logger.error('Cannot schedule reconnect - max attempts already reached', {
        connectionId: this.connectionId,
        attempts: this.reconnectAttempts,
        maxAttempts,
        isServerUnreachable
      });
      const store = useBombPartyStore.getState();
      store.setConnectionState('server_unreachable');
      store.setLastError('Le serveur est inaccessible. Veuillez réessayer plus tard.');
      return;
    }
    
    // Annuler toute reconnexion en attente pour éviter les reconnexions multiples
    if (this.reconnectTimeout) {
      logger.debug('Cancelling previous reconnect timeout', { connectionId: this.connectionId });
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Ne pas programmer de reconnexion si une connexion est déjà en cours
    if (this.isConnecting) {
      logger.warn('Connection already in progress, not scheduling reconnect', { connectionId: this.connectionId });
      return;
    }
    
    const store = useBombPartyStore.getState();
    const delay = this.reconnectDelays[Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1)];
    
    const nextAttempt = this.reconnectAttempts + 1;
    
    logger.info('Scheduling reconnection', {
      connectionId: this.connectionId,
      attempt: nextAttempt,
      maxAttempts,
      delay,
      roomId: store.connection.roomId,
      playerId: store.connection.playerId
    });
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null; // Nettoyer immédiatement
      
      if (this.reconnectAttempts >= maxAttempts) {
        logger.error('Reconnect timeout fired but max attempts already reached, cancelling', {
          connectionId: this.connectionId,
          attempts: this.reconnectAttempts,
          maxAttempts
        });
        const store = useBombPartyStore.getState();
        store.setConnectionState('server_unreachable');
        store.setLastError('Le serveur est inaccessible. Veuillez réessayer plus tard.');
        return;
      }
      
      this.reconnectAttempts++;
      store.setReconnectAttempts(this.reconnectAttempts);
      
      // Préserver l'état du jeu pendant la reconnexion
      const roomId = store.connection.roomId;
      const playerId = store.connection.playerId;
      
      logger.info('Reconnecting...', {
        connectionId: this.connectionId,
        attempt: this.reconnectAttempts,
        roomId,
        playerId
      });
      
      this.connect();
      
      // Si reconnecté avec succès, réauthentifier et rejoindre la room
      // Préserver le nom du joueur pour la réauthentification
      if (!this.pendingPlayerName) {
        const storedName = localStorage.getItem('bombparty_player_name');
        const token = localStorage.getItem('token');
        if (storedName) {
          this.pendingPlayerName = storedName;
          logger.debug('Preserved player name for reauthentication', { 
            playerName: storedName.replace(/token=[^&]+/, 'token=***'),
            connectionId: this.connectionId
          });
        } else if (token) {
          this.pendingPlayerName = 'AuthenticatedUser';
          logger.debug('Using authenticated user for reauthentication', { 
            connectionId: this.connectionId
          });
        }
      }
      
      if (this.pendingPlayerName) {
        // Attendre que la connexion soit établie
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            
            // Assurer un nom de joueur sûr si manquant
            if (!this.pendingPlayerName) {
              const storedName = (localStorage.getItem('bombparty_player_name') || '').trim();
              if (storedName) {
                this.pendingPlayerName = storedName;
              } else {
                const guestId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                this.pendingPlayerName = `Guest_${guestId}`;
              }
            }

            logger.info('🔄 Réauthentification après reconnexion', {
              connectionId: this.connectionId,
              playerName: this.pendingPlayerName?.replace(/token=[^&]+/, 'token=***'),
              roomId,
              playerId
            });
            
            this.authenticate(this.pendingPlayerName!);
            
            // Rejoindre la room si elle existait
            if (roomId) {
              // Attendre que l'authentification soit complète
              setTimeout(() => {
                const store = useBombPartyStore.getState();
                if (store.connection.playerId) {
                  logger.info('🔄 Rejoindre la room après reconnexion', {
                    connectionId: this.connectionId,
                    roomId,
                    playerId: store.connection.playerId
                  });
                  this.joinRoom(roomId);
                  
                  // Demander l'état de la room après avoir rejoint
                  setTimeout(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                      logger.info('🔄 Demande de l\'état de la room après reconnexion', {
                        connectionId: this.connectionId,
                        roomId
                      });
                      this.requestRoomState(roomId);
                    }
                  }, 1000);
                } else {
                  logger.warn('PlayerId not available after authentication, retrying join', {
                    connectionId: this.connectionId,
                    roomId
                  });
                  // Réessayer après un délai
                  setTimeout(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                      this.joinRoom(roomId);
                    }
                  }, 1000);
                }
              }, 500);
            }
          }
        }, 100);
        
        // Timeout de sécurité pour éviter les boucles infinies
        setTimeout(() => {
          clearInterval(checkConnection);
        }, 10000);
      }
    }, delay) as unknown as number;
  }

  authenticate(playerName: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    // Sécuriser le playerName: éviter null/undefined/vides
    let safeName = (playerName ?? '').toString().trim();
    if (!safeName) {
      const stored = (localStorage.getItem('bombparty_player_name') || '').trim();
      if (stored) {
        safeName = stored;
      } else {
        const guestId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        safeName = `Guest_${guestId}`;
      }
      logger.warn('Authentication fallback to safe name', { requested: playerName, used: safeName });
    }

    logger.debug('Authentication', { playerName: safeName, connectionId: this.connectionId });
    this.ws.send(JSON.stringify({
      event: 'bp:auth',
      payload: { playerName: safeName }
    }));

    // Persister le nom pour les reconnexions futures
    try {
      localStorage.setItem('bombparty_player_name', safeName);
    } catch {}

    // Stocker le nom du joueur pour la reconnexion en mémoire
    this.pendingPlayerName = safeName;
  }

  authenticateWithName(playerName: string): void {
    localStorage.setItem('bombparty_player_name', playerName);
    
    if (this.isWebSocketReady) {
      this.authenticate(playerName);
    } else {
      this.pendingPlayerName = playerName;
    }
  }

  createRoom(name: string, isPrivate: boolean, password?: string, maxPlayers?: number): void {
    const store = useBombPartyStore.getState();
    
    logger.info('createRoom appelé', {
      connectionId: this.connectionId,
      name,
      isPrivate,
      maxPlayers,
      wsState: this.ws?.readyState,
      wsOpen: this.ws?.readyState === WebSocket.OPEN,
      playerId: store.connection.playerId,
      connectionState: store.connection.state,
      isAuthenticating: store.connection.isAuthenticating
    });
    
    if (!this.ws) {
      logger.error('Cannot create room: WebSocket is null', undefined, { connectionId: this.connectionId });
      store.setLastError('Connexion WebSocket non initialisée. Veuillez rafraîchir la page.');
      return;
    }
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      logger.error('Cannot create room: WebSocket not open', undefined, { 
        connectionId: this.connectionId,
        readyState: this.ws.readyState,
        readyStateName: this.getReadyStateString()
      });
      store.setLastError('Connexion perdue. Veuillez rafraîchir la page.');
      return;
    }
    
    if (!store.connection.playerId) {
      logger.error('Cannot create room: not authenticated', undefined, { 
        connectionId: this.connectionId,
        connectionState: store.connection.state,
        isAuthenticating: store.connection.isAuthenticating
      });
      store.setLastError('Vous devez être authentifié pour créer un lobby. Veuillez patienter...');
      
      if (store.connection.isAuthenticating) {
        logger.info('Authentication in progress, will retry createRoom in 2 seconds');
        setTimeout(() => {
          if (useBombPartyStore.getState().connection.playerId) {
            logger.info('Retrying createRoom after authentication');
            this.createRoom(name, isPrivate, password, maxPlayers);
          } else {
            logger.error('Authentication still not complete after wait');
            useBombPartyStore.getState().setLastError('Authentification échouée. Veuillez rafraîchir la page.');
          }
        }, 2000);
      }
      return;
    }
    
    if (store.connection.state !== 'connected') {
      logger.error('Cannot create room: connection state is not connected', undefined, { 
        connectionId: this.connectionId,
        connectionState: store.connection.state
      });
      store.setLastError(`État de connexion invalide: ${store.connection.state}. Veuillez rafraîchir la page.`);
      return;
    }
    
    logger.info('Sending create room request', { 
      connectionId: this.connectionId, 
      name, 
      isPrivate, 
      maxPlayers,
      playerId: store.connection.playerId
    });
    
    try {
      const message = JSON.stringify({
        event: 'bp:lobby:create',
        payload: { name, isPrivate, password, maxPlayers }
      });
      
      this.ws.send(message);
      logger.info('Create room message sent successfully', { connectionId: this.connectionId });
    } catch (error) {
      logger.error('Error sending create room message', error, { connectionId: this.connectionId });
      store.setLastError('Erreur lors de l\'envoi de la requête. Veuillez réessayer.');
    }
  }

  joinRoom(roomId: string, password?: string): void {
    const store = useBombPartyStore.getState();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!store.connection.playerId) {
        logger.error('Cannot join: not authenticated', undefined, { connectionId: this.connectionId });
        store.setLastError('You must be connected to join a room');
        return;
      }
      
      logger.debug('Join room', { connectionId: this.connectionId, roomId, hasPassword: !!password });
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:join',
        payload: { roomId, password }
      }));
    } else {
      logger.error('Cannot join: WebSocket not open', undefined, { connectionId: this.connectionId });
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  leaveRoom(): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:leave',
        payload: { roomId: store.connection.roomId }
      }));
    }
  }

  subscribeToRoom(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('Subscribing to room', { roomId });
      this.ws.send(JSON.stringify({
        event: 'bp:room:subscribe',
        payload: { roomId }
      }));
    }
  }

  unsubscribeFromRoom(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('Unsubscribing from room', { roomId });
      this.ws.send(JSON.stringify({
        event: 'bp:room:unsubscribe',
        payload: { roomId }
      }));
    }
  }

  startGame(): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:start',
        payload: { roomId: store.connection.roomId }
      }));
    }
  }

  submitWord(word: string, msTaken: number): void {
    const store = useBombPartyStore.getState();
    
    if (!store.connection.roomId) {
      logger.error('submitWord - No roomId', { connectionId: this.connectionId });
      store.setLastError('Erreur: Pas de room');
      return;
    }
    
    const message = {
      event: 'bp:game:input',
      payload: { roomId: store.connection.roomId, word, msTaken }
    };
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Mettre en file d'attente si le WebSocket n'est pas ouvert
      logger.warn('submitWord - WebSocket not open, queuing message', { 
        connectionId: this.connectionId, 
        readyState: this.ws?.readyState,
        pendingMessages: this.pendingMessages.length
      });
      this.pendingMessages.push(message);
      // Ne pas définir d'erreur car le message sera envoyé après la reconnexion
      return;
    }
    
    logger.info('submitWord - Sending word to server', { 
      connectionId: this.connectionId,
      word,
      msTaken,
      roomId: store.connection.roomId,
      playerId: store.connection.playerId
    });
    
    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('submitWord - Error sending message', error, { connectionId: this.connectionId });
      // En cas d'erreur, mettre en file d'attente
      this.pendingMessages.push(message);
      store.setLastError('Erreur lors de l\'envoi du mot');
    }
  }
  
  private flushPendingMessages(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    if (this.pendingMessages.length === 0) {
      return;
    }
    
    logger.info('Flushing pending messages', { 
      connectionId: this.connectionId,
      count: this.pendingMessages.length
    });
    
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];
    
    for (const message of messages) {
      try {
        this.ws.send(JSON.stringify(message));
        logger.debug('Pending message sent', { 
          connectionId: this.connectionId,
          event: message.event
        });
      } catch (error) {
        logger.error('Error sending pending message', error, { 
          connectionId: this.connectionId,
          event: message.event
        });
        // Remettre en file d'attente en cas d'erreur
        this.pendingMessages.push(message);
      }
    }
  }

  activateBonus(bonusKey: string): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:bonus:activate',
        payload: { roomId: store.connection.roomId, bonusKey }
      }));
    }
  }

  requestLobbyList(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('Request lobby list', { connectionId: this.connectionId });
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:list',
        payload: {}
      }));
    } else {
      logger.debug('Cannot request list: WebSocket not open', { connectionId: this.connectionId });
    }
  }

  requestRoomState(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('🔄 Requesting room state for reconnection', { 
        connectionId: this.connectionId,
        roomId 
      });
      this.ws.send(JSON.stringify({
        event: 'bp:room:state_request',
        payload: { roomId }
      }));
    } else {
      logger.warn('Cannot request room state: WebSocket not open', { 
        connectionId: this.connectionId,
        roomId,
        wsState: this.getReadyStateString()
      });
    }
  }

  disconnect(): void {
    // Éviter les déconnexions multiples
    if (this.isDisconnecting) {
      logger.debug('Disconnection already in progress', { connectionId: this.connectionId });
      return;
    }
    
    if (this.hotReloadDetected && this.ws?.readyState === WebSocket.OPEN) {
      logger.info('Hot reload detected - skipping disconnection to preserve open connection', {
        connectionId: this.connectionId,
        wsState: this.getWebSocketStateName(this.ws?.readyState),
        isConnected: true
      });
      return;
    }
    
    // Si hot reload mais connexion fermée, permettre la déconnexion (nettoyage)
    if (this.hotReloadDetected && this.ws?.readyState !== WebSocket.OPEN) {
      logger.info('Hot reload detected but connection closed - allowing disconnection for cleanup', {
        connectionId: this.connectionId,
        wsState: this.getWebSocketStateName(this.ws?.readyState),
        isConnected: false,
        reason: 'Connexion déjà fermée, nettoyage nécessaire'
      });
      // Continuer le traitement normal de la déconnexion
    }
    
    logger.debug('Explicit disconnection', { connectionId: this.connectionId });
    this.isDisconnecting = true;
    
    // Réinitialiser les flags
    this.isConnecting = false;
    this.isWebSocketReady = false;
    
    this.stopHeartbeat();
    this.stopCountdown();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      } catch (err) {
        logger.warn('Error closing WebSocket', { connectionId: this.connectionId, error: err });
      }
      this.ws = null;
    }
    
    this.isDisconnecting = false;
  }
}

export const bombPartyService = new BombPartyService();
