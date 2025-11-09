import { BombPartyTournament } from './BombPartyTournament.ts';
import type { 
  Tournament,
  TournamentBracket 
} from './BombPartyTournament.ts';
import { bombPartyLogger } from '../log.ts';
import type { BombPartyRoomManager } from '../RoomManager.ts';

interface CreateTournamentResult {
  success: boolean;
  tournamentId?: string;
  error?: string;
}

interface JoinTournamentResult {
  success: boolean;
  tournament?: Tournament;
  error?: string;
}

interface LeaveTournamentResult {
  success: boolean;
  error?: string;
}

interface StartTournamentResult {
  success: boolean;
  error?: string;
}

interface TournamentStatusResult {
  success: boolean;
  tournament?: Tournament;
  bracket?: TournamentBracket;
  error?: string;
}

interface TournamentListResult {
  success: boolean;
  tournaments?: Array<{
    id: string;
    capacity: number;
    playerCount: number;
    isPrivate: boolean;
    status: string;
    createdAt: number;
  }>;
}

export class BombPartyTournamentManager {
  private tournaments = new Map<string, BombPartyTournament>();
  private playerToTournament = new Map<string, string>(); // playerId -> tournamentId
  private roomManager: BombPartyRoomManager;
  private broadcastToPlayers: (playerIds: string[], event: string, payload: any) => void;

  // capacites valides pour les tournois (doit etre pair et >= 4)
  private static readonly VALID_CAPACITIES = [4, 6, 8, 10, 12, 16, 32];

  constructor(
    roomManager: BombPartyRoomManager,
    broadcastToPlayers: (playerIds: string[], event: string, payload: any) => void
  ) {
    this.roomManager = roomManager;
    this.broadcastToPlayers = broadcastToPlayers;
    bombPartyLogger.info('BombPartyTournamentManager initialized');
  }

  // cree un nouveau tournoi
  createTournament(
    creatorId: string,
    tournamentId: string,
    capacity: number,
    password?: string
  ): CreateTournamentResult {
    // valide la capacite
    if (!BombPartyTournamentManager.VALID_CAPACITIES.includes(capacity)) {
      return {
        success: false,
        error: `Invalid capacity. Must be one of: ${BombPartyTournamentManager.VALID_CAPACITIES.join(', ')}`
      };
    }

    // check si l'id du tournoi existe deja
    if (this.tournaments.has(tournamentId)) {
      return {
        success: false,
        error: 'Tournament ID already exists'
      };
    }

    // check si le createur est deja dans un autre tournoi
    if (this.playerToTournament.has(creatorId)) {
      return {
        success: false,
        error: 'You are already in a tournament'
      };
    }

    // cree le tournoi
    const tournament = new BombPartyTournament({
      id: tournamentId,
      capacity,
      password,
      roomManager: this.roomManager,
      onEnd: () => this.cleanupTournament(tournamentId),
      broadcastToPlayers: this.broadcastToPlayers
    });

    this.tournaments.set(tournamentId, tournament);

    bombPartyLogger.info({ 
      tournamentId, 
      creatorId, 
      capacity 
    }, 'Tournament created');

    return {
      success: true,
      tournamentId
    };
  }

  // rejoint un tournoi existant
  joinTournament(
    playerId: string,
    playerName: string,
    ws: any,
    tournamentId: string,
    password?: string
  ): JoinTournamentResult {
    // check si le tournoi existe
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return {
        success: false,
        error: 'Tournament not found'
      };
    }

    // check le mot de passe
    const tournamentInfo = tournament.getTournamentInfo();
    if (tournamentInfo.password && tournamentInfo.password !== password) {
      return {
        success: false,
        error: 'Invalid password'
      };
    }

    // Check if player is already in another tournament
    const currentTournament = this.playerToTournament.get(playerId);
    if (currentTournament && currentTournament !== tournamentId) {
      return {
        success: false,
        error: 'You are already in another tournament'
      };
    }

    // si le joueur est dans un lobby, auto-leave pour garantir l'exclusivite
    try {
      const playerInfo = this.roomManager.getPlayerInfo(playerId);
      if (playerInfo?.roomId) {
        this.roomManager.leaveRoom(playerId, playerInfo.roomId);
        bombPartyLogger.info({ playerId, roomId: playerInfo.roomId, tournamentId }, 'Auto-leave lobby before joining tournament');
        // notifie le socket du joueur que le lobby a ete quitte automatiquement
        try {
          if (playerInfo.ws && playerInfo.ws.readyState === 1) {
            playerInfo.ws.send(JSON.stringify({
              event: 'bp:lobby:auto_left',
              payload: { roomId: playerInfo.roomId, reason: 'join_tournament', tournamentId }
            }));
          }
        } catch (e) {
          bombPartyLogger.warn({ playerId, error: e instanceof Error ? e.message : String(e) }, 'Failed to send auto_left message');
        }
      }
    } catch (e) {
      bombPartyLogger.warn({ playerId, tournamentId, error: e instanceof Error ? e.message : String(e) }, 'Error during auto-leave lobby before tournament join');
    }

    // essaie de rejoindre
    const joined = tournament.join({ id: playerId, name: playerName, ws });
    if (!joined) {
      return {
        success: false,
        error: 'Failed to join tournament (may be full or already started)'
      };
    }

    this.playerToTournament.set(playerId, tournamentId);

    return {
      success: true,
      tournament: tournament.getTournamentInfo()
    };
  }

  // quitte un tournoi
  leaveTournament(playerId: string, tournamentId: string): LeaveTournamentResult {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return {
        success: false,
        error: 'Tournament not found'
      };
    }

    const left = tournament.leave(playerId);
    if (!left) {
      return {
        success: false,
        error: 'Failed to leave tournament (may have already started)'
      };
    }

    this.playerToTournament.delete(playerId);

    return {
      success: true
    };
  }

  // demarre un tournoi (seulement si la capacite est atteinte)
  startTournament(playerId: string, tournamentId: string): StartTournamentResult {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return {
        success: false,
        error: 'Tournament not found'
      };
    }

    const info = tournament.getTournamentInfo();
    
    // check si le joueur est dans ce tournoi
    if (!info.players.some(p => p.id === playerId)) {
      return {
        success: false,
        error: 'You are not in this tournament'
      };
    }

    // check si la capacite est atteinte
    if (info.players.length !== info.capacity) {
      return {
        success: false,
        error: `Tournament not ready to start (${info.players.length}/${info.capacity} players)`
      };
    }

    tournament.startTournament();

    return {
      success: true
    };
  }

  // recupere le statut d'un tournoi
  getTournamentStatus(tournamentId: string): TournamentStatusResult {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return {
        success: false,
        error: 'Tournament not found'
      };
    }

    return {
      success: true,
      tournament: tournament.getTournamentInfo(),
      bracket: tournament.getBracketStatus()
    };
  }

  // liste tous les tournois disponibles (seulement ceux en attente)
  listTournaments(): TournamentListResult {
    const tournaments = Array.from(this.tournaments.values())
      .map(t => {
        const info = t.getTournamentInfo();
        return {
          id: info.id,
          capacity: info.capacity,
          playerCount: info.players.length,
          isPrivate: info.isPrivate,
          status: info.status,
          createdAt: info.createdAt
        };
      })
      .filter(t => t.status === 'WAITING') // montre seulement les tournois en attente
      .sort((a, b) => b.createdAt - a.createdAt); // plus recent en premier

    return {
      success: true,
      tournaments
    };
  }

  // gere la deconnexion d'un joueur
  handlePlayerDisconnect(playerId: string): void {
    const tournamentId = this.playerToTournament.get(playerId);
    if (!tournamentId) return;

    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      this.playerToTournament.delete(playerId);
      return;
    }

    tournament.handleDisconnect(playerId);
  }

  // gere la reconnexion d'un joueur
  handlePlayerReconnect(playerId: string, ws: any): void {
    const tournamentId = this.playerToTournament.get(playerId);
    if (!tournamentId) return;

    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.handleReconnect(playerId, ws);
  }

  // gere la fin d'un match (appele depuis le game engine ou externe)
  handleMatchEnd(tournamentId: string, matchId: string, winnerId?: string): void {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.handleMatchEnd(matchId, winnerId);
  }

  // recupere le tournoi par player id
  getTournamentByPlayerId(playerId: string): BombPartyTournament | undefined {
    const tournamentId = this.playerToTournament.get(playerId);
    if (!tournamentId) return undefined;
    return this.tournaments.get(tournamentId);
  }

  // cleanup d'un tournoi termine ou annule
  private cleanupTournament(tournamentId: string): void {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const info = tournament.getTournamentInfo();
    
    // enleve les mappings des joueurs
    for (const player of info.players) {
      this.playerToTournament.delete(player.id);
    }

    // enleve le tournoi
    this.tournaments.delete(tournamentId);

    bombPartyLogger.info({ tournamentId }, 'Tournament cleaned up');
  }

  // recupere tous les tournois (pour debug/admin)
  getAllTournaments(): Tournament[] {
    return Array.from(this.tournaments.values()).map(t => t.getTournamentInfo());
  }

  // check si un joueur est dans un tournoi
  isPlayerInTournament(playerId: string): boolean {
    return this.playerToTournament.has(playerId);
  }
}
