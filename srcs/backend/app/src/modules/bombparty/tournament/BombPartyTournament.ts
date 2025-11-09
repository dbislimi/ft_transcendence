import type { TournamentPlayerConnection } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';
import { bombPartyLogger } from '../log.ts';
import type { BombPartyRoomManager } from '../RoomManager.ts';

// types tournoi (inline car les shared types peuvent pas etre accessibles de la meme facon)
export type TournamentStatus = 'WAITING' | 'ROUND_IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'FORFEIT';

export interface TournamentPlayer {
  id: string;
  name: string;
  joinedAt: number;
}

export interface TournamentMatch {
  matchId: string;
  roomId?: string;
  players: TournamentPlayer[];
  winnerId?: string;
  loserId?: string;
  status: MatchStatus;
  startedAt?: number;
  endedAt?: number;
  // readiness map (playerId -> ready boolean)
  ready?: Record<string, boolean>;
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
}

export interface TournamentBracket {
  rounds: TournamentRound[];
  currentRound: number;
  totalRounds: number;
}

export interface Tournament {
  id: string;
  capacity: number;
  players: TournamentPlayer[];
  bracket?: TournamentBracket;
  status: TournamentStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  winnerId?: string;
  password?: string;
  isPrivate: boolean;
}

interface BombPartyTournamentConfig {
  id: string;
  capacity: number;
  password?: string;
  roomManager: BombPartyRoomManager;
  onEnd: () => void;
  broadcastToPlayers: (playerIds: string[], event: string, payload: any) => void;
}

export class BombPartyTournament {
  private tournament: Tournament;
  private playerConnections: Map<string, TournamentPlayerConnection> = new Map();
  private roomManager: BombPartyRoomManager;
  private onEnd: () => void;
  private broadcastToPlayers: (playerIds: string[], event: string, payload: any) => void;
  private matchRooms: Map<string, string> = new Map(); // matchId -> roomId
  // TODO: peut-etre ajouter un cache pour les broadcasts pour eviter les doublons
  private broadcastUpdated(): void {
    this.broadcastToAllPlayers('bp:tournament:updated', {
      tournamentId: this.tournament.id,
      players: this.tournament.players,
      capacity: this.tournament.capacity,
      status: this.tournament.status,
      bracket: this.getBracketStatus(),
      currentRound: this.tournament.bracket?.currentRound
    });
  }

  constructor(config: BombPartyTournamentConfig) {
    this.tournament = {
      id: config.id,
      capacity: config.capacity,
      players: [],
      status: 'WAITING',
      createdAt: Date.now(),
      password: config.password,
      isPrivate: !!config.password
    };
    this.roomManager = config.roomManager;
    this.onEnd = config.onEnd;
    this.broadcastToPlayers = config.broadcastToPlayers;

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id, 
      capacity: config.capacity 
    }, 'Tournament created');
  }

  // methodes publiques

  join(player: { id: string; name: string; ws: any }): boolean {
    if (this.tournament.status !== 'WAITING') {
      bombPartyLogger.warn({ tournamentId: this.tournament.id, playerId: player.id }, 'Cannot join: tournament already started');
      return false;
    }

    if (this.tournament.players.length >= this.tournament.capacity) {
      bombPartyLogger.warn({ tournamentId: this.tournament.id, playerId: player.id }, 'Cannot join: tournament full');
      return false;
    }

    if (this.tournament.players.some(p => p.id === player.id)) {
      bombPartyLogger.warn({ tournamentId: this.tournament.id, playerId: player.id }, 'Player already in tournament');
      return false;
    }

    const tournamentPlayer: TournamentPlayer = {
      id: player.id,
      name: player.name,
      joinedAt: Date.now()
    };

    this.tournament.players.push(tournamentPlayer);

    const connection: TournamentPlayerConnection = {
      id: player.id,
      name: player.name,
      ws: player.ws,
      isConnected: true,
      allowReconnect: true
    };

    this.playerConnections.set(player.id, connection);

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id, 
      playerId: player.id,
      playerCount: this.tournament.players.length,
      capacity: this.tournament.capacity
    }, 'Player joined tournament');

    // broadcast a tous les joueurs du tournoi
    this.broadcastToAllPlayers('bp:tournament:player_joined', {
      tournamentId: this.tournament.id,
      player: tournamentPlayer,
      playerCount: this.tournament.players.length,
      capacity: this.tournament.capacity
    });

    this.broadcastUpdated();

    // demarrage auto si capacite atteinte
    if (this.tournament.players.length === this.tournament.capacity) {
      bombPartyLogger.info({ tournamentId: this.tournament.id }, 'Capacity reached, auto-starting tournament');
      setTimeout(() => this.startTournament(), 1000);
    }

    return true;
  }

  leave(playerId: string): boolean {
    if (this.tournament.status !== 'WAITING') {
      bombPartyLogger.warn({ tournamentId: this.tournament.id, playerId }, 'Cannot leave: tournament already started');
      return false;
    }

    const index = this.tournament.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      return false;
    }

    this.tournament.players.splice(index, 1);
    this.playerConnections.delete(playerId);

    bombPartyLogger.info({ tournamentId: this.tournament.id, playerId }, 'Player left tournament');

    this.broadcastToAllPlayers('bp:tournament:player_left', {
      tournamentId: this.tournament.id,
      playerId,
      playerCount: this.tournament.players.length
    });

    this.broadcastUpdated();

    // annule le tournoi si vide
    if (this.tournament.players.length === 0) {
      this.tournament.status = 'CANCELLED';
      this.onEnd();
    }

    return true;
  }

  startTournament(): void {
    if (this.tournament.status !== 'WAITING') {
      bombPartyLogger.warn({ tournamentId: this.tournament.id }, 'Tournament already started');
      return;
    }

    if (this.tournament.players.length !== this.tournament.capacity) {
      bombPartyLogger.warn({ 
        tournamentId: this.tournament.id,
        playerCount: this.tournament.players.length,
        capacity: this.tournament.capacity
      }, 'Cannot start: not enough players');
      return;
    }

    this.tournament.status = 'ROUND_IN_PROGRESS';
    this.tournament.startedAt = Date.now();

    this.buildBracket();

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      totalRounds: this.tournament.bracket?.totalRounds
    }, 'Tournament started');

    this.broadcastToAllPlayers('bp:tournament:started', {
      tournamentId: this.tournament.id,
      bracket: this.tournament.bracket
    });
    this.broadcastUpdated();

    // demarre le premier round
    this.startRound(1);
  }

  handleDisconnect(playerId: string): void {
    const connection = this.playerConnections.get(playerId);
    if (!connection) return;

    connection.isConnected = false;

    // si le tournoi n'a pas commence, on enleve juste le joueur
    if (this.tournament.status === 'WAITING') {
      this.leave(playerId);
      return;
    }

    // si le tournoi a commence, on donne 10s pour se reconnecter
    if (connection.allowReconnect) {
      connection.allowReconnect = false;
      
      bombPartyLogger.info({ 
        tournamentId: this.tournament.id, 
        playerId 
      }, 'Player disconnected, 10s to reconnect');

      connection.disconnectTimer = setTimeout(() => {
        this.handleForfeit(playerId);
      }, 10000);
    } else {
      this.handleForfeit(playerId);
    }
  }

  handleReconnect(playerId: string, ws: any): void {
    const connection = this.playerConnections.get(playerId);
    if (!connection) return;

    if (connection.disconnectTimer) {
      clearTimeout(connection.disconnectTimer);
      connection.disconnectTimer = undefined;
    }

    connection.isConnected = true;
    connection.ws = ws;
    connection.allowReconnect = true;

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id, 
      playerId 
    }, 'Player reconnected');

    // envoie l'etat actuel du tournoi
    this.sendToPlayer(playerId, 'bp:tournament:reconnected', {
      tournamentId: this.tournament.id,
      bracket: this.tournament.bracket
    });
  }

  getTournamentInfo(): Tournament {
    return { ...this.tournament };
  }

  getBracketStatus(): TournamentBracket | undefined {
    return this.tournament.bracket ? { ...this.tournament.bracket } : undefined;
  }

  isEmpty(): boolean {
    return this.tournament.players.length === 0;
  }

  // methodes privees

  private buildBracket(): void {
    const playerCount = this.tournament.players.length;
    const totalRounds = Math.ceil(Math.log2(playerCount));

    const rounds: TournamentRound[] = [];
    
    // construit le premier round avec tous les joueurs
    const firstRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < playerCount; i += 2) {
      const player1 = this.tournament.players[i];
      const player2 = this.tournament.players[i + 1];
      
      firstRoundMatches.push({
        matchId: uuidv4(),
        players: [player1, player2],
        status: 'PENDING',
        ready: {}
      });
    }

    rounds.push({
      roundNumber: 1,
      matches: firstRoundMatches,
      status: 'PENDING'
    });

    // construit les rounds suivants (vides pour l'instant)
    for (let r = 2; r <= totalRounds; r++) {
      const matchCount = Math.pow(2, totalRounds - r);
      const matches: TournamentMatch[] = [];
      
      for (let m = 0; m < matchCount; m++) {
        matches.push({
          matchId: uuidv4(),
          players: [],
          status: 'PENDING',
          ready: {}
        });
      }

      rounds.push({
        roundNumber: r,
        matches,
        status: 'PENDING'
      });
    }

    this.tournament.bracket = {
      rounds,
      currentRound: 1,
      totalRounds
    };

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      rounds: rounds.length,
      firstRoundMatches: firstRoundMatches.length
    }, 'Bracket built');
  }

  private startRound(roundNumber: number): void {
    if (!this.tournament.bracket) return;

    const round = this.tournament.bracket.rounds[roundNumber - 1];
    if (!round) return;

    round.status = 'IN_PROGRESS';

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      roundNumber,
      matchCount: round.matches.length
    }, 'Starting round');

    this.broadcastToAllPlayers('bp:tournament:round_started', {
      tournamentId: this.tournament.id,
      roundNumber,
      totalRounds: this.tournament.bracket.totalRounds,
      matches: round.matches
    });
    this.broadcastUpdated();

    // demarre tous les matchs en meme temps
    // NO AUTO-START: wait for both players to confirm readiness
    bombPartyLogger.info({ tournamentId: this.tournament.id, roundNumber }, 'Round waiting for player readiness');
  }

  private startMatch(match: TournamentMatch): void {
    match.status = 'IN_PROGRESS';
    match.startedAt = Date.now();

    // cree une room temporaire pour ce match
    const player1Connection = this.playerConnections.get(match.players[0].id);
    const player2Connection = this.playerConnections.get(match.players[1].id);

    if (!player1Connection || !player2Connection) {
      bombPartyLogger.error({ 
        tournamentId: this.tournament.id,
        matchId: match.matchId
      }, 'Missing player connection for match');
      return;
    }

    const roomName = `Tournament ${this.tournament.id} - Match ${match.matchId.substring(0, 8)}`;
    const createResult = this.roomManager.createRoom(
      match.players[0].id,
      roomName,
      true, // private
      undefined,
      2 // max 2 players
    );

    if (!createResult.success || !createResult.roomId) {
      bombPartyLogger.error({ 
        tournamentId: this.tournament.id,
        matchId: match.matchId,
        error: createResult.error
      }, 'Failed to create room for match');
      return;
    }

    match.roomId = createResult.roomId;
    this.matchRooms.set(match.matchId, createResult.roomId);

    // fait rejoindre le deuxieme joueur
    const joinResult = this.roomManager.joinRoom(match.players[1].id, createResult.roomId);
    
    if (!joinResult.success) {
      bombPartyLogger.error({ 
        tournamentId: this.tournament.id,
        matchId: match.matchId,
        error: joinResult.error
      }, 'Failed to join second player to match room');
      return;
    }

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      matchId: match.matchId,
      roomId: createResult.roomId
    }, 'Match started');

    // Notify players - envoyer d'abord l'événement match_started
    this.sendToPlayers([match.players[0].id, match.players[1].id], 'bp:tournament:match_started', {
      tournamentId: this.tournament.id,
      matchId: match.matchId,
      roomId: createResult.roomId,
      opponent: {
        [match.players[0].id]: match.players[1],
        [match.players[1].id]: match.players[0]
      }
    });
    
    // Mettre à jour le bracket pour inclure le roomId dans le match
    this.broadcastUpdated();
    // demarrage auto de la partie
    setTimeout(() => {
      const startResult = this.roomManager.startGame(match.players[0].id, createResult.roomId!);
      if (!startResult.success) {
        bombPartyLogger.error({ 
          tournamentId: this.tournament.id,
          matchId: match.matchId,
          error: startResult.error
        }, 'Failed to start match game');
      } else {
        // enregistre le callback pour quand la partie se termine
        this.roomManager.registerGameEndCallback(createResult.roomId!, (roomId, winnerId) => {
          bombPartyLogger.info({ 
            tournamentId: this.tournament.id,
            matchId: match.matchId,
            roomId,
            winnerId
          }, 'Match ended via callback');
          
          this.handleMatchEnd(match.matchId, winnerId, 'victory');
        });
      }
    }, 3000);
  }

  // Player toggles readiness for a match; when both ready, start match
  public setPlayerReady(matchId: string, playerId: string, ready: boolean): void {
    if (!this.tournament.bracket) return;
    for (const round of this.tournament.bracket.rounds) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (!match) continue;
      if (!match.players.some(p => p.id === playerId)) {
        bombPartyLogger.warn({ tournamentId: this.tournament.id, matchId, playerId }, 'Player not in match for readiness');
        return;
      }
      if (!match.ready) match.ready = {};
      match.ready[playerId] = ready;

      // broadcast readiness update
      this.broadcastToAllPlayers('bp:tournament:match_ready', {
        tournamentId: this.tournament.id,
        matchId: match.matchId,
        readyPlayers: Object.entries(match.ready).filter(([_, v]) => v).map(([pid]) => pid)
      });
      this.broadcastUpdated();

      // start if both players present & ready
      if (match.players.length === 2) {
        const allReady = match.players.every(p => match.ready![p.id]);
        if (allReady && match.status === 'PENDING') {
          bombPartyLogger.info({ tournamentId: this.tournament.id, matchId }, 'Both players ready; starting match');
          this.startMatch(match);
        }
      }
      return; // stop search after found
    }
    bombPartyLogger.warn({ tournamentId: this.tournament.id, matchId, playerId }, 'Match not found for readiness');
  }

  handleMatchEnd(matchId: string, winnerId?: string, reason: 'victory' | 'forfeit' | 'timeout' | 'error' = 'victory'): void {
    if (!this.tournament.bracket) return;

    let match: TournamentMatch | undefined;
    let round: TournamentRound | undefined;

    for (const r of this.tournament.bracket.rounds) {
      const m = r.matches.find(m => m.matchId === matchId);
      if (m) {
        match = m;
        round = r;
        break;
      }
    }

    if (!match || !round) {
      bombPartyLogger.warn({ tournamentId: this.tournament.id, matchId }, 'Match not found for end event');
      return;
    }

    match.status = reason === 'forfeit' || reason === 'timeout' || reason === 'error' ? 'FORFEIT' : 'FINISHED';
    match.endedAt = Date.now();
    match.winnerId = winnerId;
    match.loserId = match.players.find(p => p.id !== winnerId)?.id;

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      matchId,
      winnerId,
      reason
    }, 'Match ended');

    // cleanup de la room
    if (match.roomId) {
      for (const player of match.players) {
        this.roomManager.leaveRoom(player.id, match.roomId);
      }
      this.matchRooms.delete(matchId);
    }

    // notifie les joueurs
    this.broadcastToAllPlayers('bp:tournament:match_ended', {
      tournamentId: this.tournament.id,
      matchId,
      winnerId,
      loserId: match.loserId,
      reason
    });

    this.broadcastUpdated();

    // check si le round est termine
    const allMatchesFinished = round.matches.every(m => 
      m.status === 'FINISHED' || m.status === 'FORFEIT'
    );

    if (allMatchesFinished) {
      this.onRoundEnd(round.roundNumber);
    }
  }

  private onRoundEnd(roundNumber: number): void {
    if (!this.tournament.bracket) return;

    const round = this.tournament.bracket.rounds[roundNumber - 1];
    if (!round) return;

    round.status = 'FINISHED';

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      roundNumber
    }, 'Round ended');

    this.broadcastToAllPlayers('bp:tournament:round_ended', {
      tournamentId: this.tournament.id,
      roundNumber,
      winners: round.matches.map(m => m.winnerId).filter(Boolean),
      currentRound: this.tournament.bracket.currentRound,
      status: this.tournament.status,
      bracket: this.getBracketStatus()
    });
    this.broadcastUpdated();

    // check si le tournoi est termine
    if (roundNumber === this.tournament.bracket.totalRounds) {
      this.onTournamentEnd();
      return;
    }

    // prepare le round suivant
    const nextRound = this.tournament.bracket.rounds[roundNumber];
    if (!nextRound) return;

    // remplit le round suivant avec les gagnants
    const winners = round.matches
      .map(m => this.tournament.players.find(p => p.id === m.winnerId))
      .filter((p): p is TournamentPlayer => p !== undefined);

    for (let i = 0; i < nextRound.matches.length; i++) {
      const match = nextRound.matches[i];
      match.players = [
        winners[i * 2],
        winners[i * 2 + 1]
      ].filter((p): p is TournamentPlayer => p !== undefined);
    }

    // demarre le round suivant apres un delai
    setTimeout(() => {
      this.tournament.bracket!.currentRound = roundNumber + 1;
      this.startRound(roundNumber + 1);
    }, 5000);
  }

  private onTournamentEnd(): void {
    if (!this.tournament.bracket) return;

    const finalRound = this.tournament.bracket.rounds[this.tournament.bracket.totalRounds - 1];
    const finalMatch = finalRound?.matches[0];
    const winnerId = finalMatch?.winnerId;

    this.tournament.status = 'FINISHED';
    this.tournament.finishedAt = Date.now();
    this.tournament.winnerId = winnerId;

    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      winnerId
    }, 'Tournament finished');

    this.broadcastToAllPlayers('bp:tournament:finished', {
      tournamentId: this.tournament.id,
      winnerId,
      bracket: this.tournament.bracket,
      status: this.tournament.status
    });
    this.broadcastUpdated();

    // cleanup des timers de deconnexion
    for (const conn of this.playerConnections.values()) {
      if (conn.disconnectTimer) {
        clearTimeout(conn.disconnectTimer);
        conn.disconnectTimer = undefined;
      }
    }

    // cleanup apres un delai
    setTimeout(() => {
      this.onEnd();
    }, 30000);
  }

  private handleForfeit(playerId: string): void {
    // trouve le match dans lequel le joueur est actuellement
    if (!this.tournament.bracket) return;

    const currentRound = this.tournament.bracket.rounds[this.tournament.bracket.currentRound - 1];
    if (!currentRound) return;

    const match = currentRound.matches.find(m => 
      m.status === 'IN_PROGRESS' && 
      m.players.some(p => p.id === playerId)
    );

    if (!match) return;

    const opponent = match.players.find(p => p.id !== playerId);
    
    bombPartyLogger.info({ 
      tournamentId: this.tournament.id,
      matchId: match.matchId,
      playerId,
      opponentId: opponent?.id
    }, 'Player forfeited match');

    // broadcast le forfait specifique avant de terminer le match
    this.broadcastToAllPlayers('bp:tournament:player_forfeit', {
      tournamentId: this.tournament.id,
      matchId: match.matchId,
      playerId,
      opponentId: opponent?.id
    });

    this.handleMatchEnd(match.matchId, opponent?.id, 'forfeit');
  }

  private broadcastToAllPlayers(event: string, payload: any): void {
    const playerIds = this.tournament.players.map(p => p.id);
    this.broadcastToPlayers(playerIds, event, payload);
  }

  private sendToPlayers(playerIds: string[], event: string, payload: any): void {
    this.broadcastToPlayers(playerIds, event, payload);
  }

  private sendToPlayer(playerId: string, event: string, payload: any): void {
    this.broadcastToPlayers([playerId], event, payload);
  }
}
