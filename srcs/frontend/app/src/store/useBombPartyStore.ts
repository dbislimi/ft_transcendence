import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type GamePhase = 'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME' | 'TURN_ACTIVE' | 'GAME_OVER';
export type ConnectionStateType = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface Player {
  id: string;
  name: string;
  lives: number;
  isEliminated: boolean;
  streak: number;
  bonuses: {
    inversion: number;
    plus5sec: number;
    vitesseEclair: number;
    doubleChance: number;
    extraLife: number;
  };
  pendingEffects?: {
    vitesseEclair?: boolean;
    doubleChance?: boolean;
  };
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentPlayerId: string;
  currentTrigram: string;
  usedWords: string[];
  turnStartedAt: number;
  turnDurationMs: number;
  turnOrder: string[];
  turnDirection: 1 | -1;
  baseTurnSeconds: number;
  pendingFastForNextPlayerId?: string;
  history: Array<{
    playerId: string;
    word: string;
    ok: boolean;
    msTaken: number;
  }>;
}

export interface UIState {
  wordJustSubmitted: boolean;
  turnInProgress: boolean;
  timerGracePeriod: boolean;
  timerFlash: boolean;
  profilePlayerId: string | null;
  infoOpen: boolean;
}

export interface ConnectionState {
  state: ConnectionStateType;
  playerId: string | null;
  roomId: string | null;
  isHost: boolean;
  lobbyPlayers: Array<{ id: string; name: string }>;
  lobbyMaxPlayers: number;
  isAuthenticating: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

interface BombPartyStore {
  // State
  gamePhase: GamePhase;
  gameState: GameState | null;
  ui: UIState;
  connection: ConnectionState;
  
  // Actions
  setGamePhase: (phase: GamePhase) => void;
  receiveServerState: (gameState: GameState) => void;
  handleTurnStarted: (turnStartedAt: number, turnDurationMs: number, currentPlayerId: string) => void;
  submitWord: (word: string, msTaken: number) => void;
  activateBonus: (bonusKey: string) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: () => void;
  createRoom: (name: string, isPrivate: boolean, password?: string, maxPlayers?: number) => void;
  startGame: () => void;
  
  // Connection actions
  setConnectionState: (state: ConnectionStateType) => void;
  setPlayerId: (playerId: string | null) => void;
  setRoomId: (roomId: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setLobbyPlayers: (players: Array<{ id: string; name: string }>) => void;
  setLobbyMaxPlayers: (maxPlayers: number) => void;
  setIsAuthenticating: (isAuthenticating: boolean) => void;
  setReconnectAttempts: (attempts: number) => void;
  setLastError: (error: string | null) => void;
  
  // UI actions
  setWordJustSubmitted: (submitted: boolean) => void;
  setTurnInProgress: (inProgress: boolean) => void;
  setTimerGracePeriod: (gracePeriod: boolean) => void;
  setTimerFlash: (flash: boolean) => void;
  setProfilePlayerId: (playerId: string | null) => void;
  setInfoOpen: (open: boolean) => void;
  
  // Computed getters
  getCurrentPlayer: () => Player | null;
  getRemainingTime: () => number;
  isMyTurn: () => boolean;
  canSubmitWord: () => boolean;
}

const initialGameState: GameState = {
  phase: 'LOBBY',
  players: [],
  currentPlayerIndex: 0,
  currentPlayerId: '',
  currentTrigram: '',
  usedWords: [],
  turnStartedAt: 0,
  turnDurationMs: 15000,
  turnOrder: [],
  turnDirection: 1,
  baseTurnSeconds: 15,
  history: []
};

const initialUIState: UIState = {
  wordJustSubmitted: false,
  turnInProgress: false,
  timerGracePeriod: false,
  timerFlash: false,
  profilePlayerId: null,
  infoOpen: false
};

const initialConnectionState: ConnectionState = {
  state: 'disconnected',
  playerId: null,
  roomId: null,
  isHost: false,
  lobbyPlayers: [],
  lobbyMaxPlayers: 4,
  isAuthenticating: true,
  reconnectAttempts: 0,
  lastError: null
};

export const useBombPartyStore = create<BombPartyStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gamePhase: 'RULES',
    gameState: null,
    ui: initialUIState,
    connection: initialConnectionState,
    
    // Game phase actions
    setGamePhase: (phase) => set({ gamePhase: phase }),
    
    // Server state actions
    receiveServerState: (gameState) => set({ gameState }),
    
    handleTurnStarted: (turnStartedAt, turnDurationMs, currentPlayerId) => {
      const currentState = get().gameState;
      if (currentState) {
        set({
          gameState: {
            ...currentState,
            turnStartedAt,
            turnDurationMs,
            currentPlayerId,
            phase: 'TURN_ACTIVE'
          }
        });
      }
    },
    
    submitWord: (word, msTaken) => {
      console.log('Submitting word:', word, 'msTaken:', msTaken);
    },
    
    activateBonus: (bonusKey) => {
      console.log('Activating bonus:', bonusKey);
    },
    
    joinRoom: (roomId, password) => {
      console.log('Joining room:', roomId, 'password:', password);
    },
    
    leaveRoom: () => {
      console.log('Leaving room');
    },
    
    createRoom: (name, isPrivate, password, maxPlayers) => {
      console.log('Creating room:', name, 'isPrivate:', isPrivate, 'password:', password, 'maxPlayers:', maxPlayers);
    },
    
    startGame: () => {
      console.log('Starting game');
    },
    
    // Connection actions
    setConnectionState: (state) => set((prev) => ({ 
      connection: { ...prev.connection, state } 
    })),
    
    setPlayerId: (playerId) => set((prev) => ({ 
      connection: { ...prev.connection, playerId } 
    })),
    
    setRoomId: (roomId) => set((prev) => ({ 
      connection: { ...prev.connection, roomId } 
    })),
    
    setIsHost: (isHost) => set((prev) => ({ 
      connection: { ...prev.connection, isHost } 
    })),
    
    setLobbyPlayers: (lobbyPlayers) => set((prev) => ({ 
      connection: { ...prev.connection, lobbyPlayers } 
    })),
    
    setLobbyMaxPlayers: (lobbyMaxPlayers) => set((prev) => ({ 
      connection: { ...prev.connection, lobbyMaxPlayers } 
    })),
    
    setIsAuthenticating: (isAuthenticating) => set((prev) => ({ 
      connection: { ...prev.connection, isAuthenticating } 
    })),
    
    setReconnectAttempts: (reconnectAttempts) => set((prev) => ({ 
      connection: { ...prev.connection, reconnectAttempts } 
    })),
    
    setLastError: (lastError) => set((prev) => ({ 
      connection: { ...prev.connection, lastError } 
    })),
    
    // UI actions
    setWordJustSubmitted: (wordJustSubmitted) => set((prev) => ({ 
      ui: { ...prev.ui, wordJustSubmitted } 
    })),
    
    setTurnInProgress: (turnInProgress) => set((prev) => ({ 
      ui: { ...prev.ui, turnInProgress } 
    })),
    
    setTimerGracePeriod: (timerGracePeriod) => set((prev) => ({ 
      ui: { ...prev.ui, timerGracePeriod } 
    })),
    
    setTimerFlash: (timerFlash) => set((prev) => ({ 
      ui: { ...prev.ui, timerFlash } 
    })),
    
    setProfilePlayerId: (profilePlayerId) => set((prev) => ({ 
      ui: { ...prev.ui, profilePlayerId } 
    })),
    
    setInfoOpen: (infoOpen) => set((prev) => ({ 
      ui: { ...prev.ui, infoOpen } 
    })),
    
    // Computed getters
    getCurrentPlayer: () => {
      const { gameState } = get();
      if (!gameState || gameState.players.length === 0) return null;
      return gameState.players[gameState.currentPlayerIndex] || null;
    },
    
    getRemainingTime: () => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== 'TURN_ACTIVE') return 0;
      const now = performance.now();
      const elapsed = now - gameState.turnStartedAt;
      return Math.max(0, gameState.turnDurationMs - elapsed);
    },
    
    isMyTurn: () => {
      const { gameState, connection } = get();
      if (!gameState || !connection.playerId) return false;
      return gameState.currentPlayerId === connection.playerId;
    },
    
    canSubmitWord: () => {
      const { gameState, connection, ui } = get();
      if (!gameState || !connection.playerId) return false;
      if (gameState.phase !== 'TURN_ACTIVE') return false;
      if (gameState.currentPlayerId !== connection.playerId) return false;
      if (ui.wordJustSubmitted) return false;
      return true;
    }
  }))
);
