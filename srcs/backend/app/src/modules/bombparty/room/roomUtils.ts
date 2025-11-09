import type { Room, PlayerConnection, BPServerMessage } from './roomTypes.ts';

export function broadcastToRoom(
  room: Room | undefined,
  message: BPServerMessage,
  excludePlayerIds: string[] = []
): void {
  if (!room) return;

  const messageStr = JSON.stringify(message);
  
  for (const [playerId, playerData] of room.players) {
    if (!excludePlayerIds.includes(playerId)) {
      try {
        playerData.ws.send(messageStr);
      } catch (error) {
        console.error('[BombParty] Erreur envoi message:', error);
      }
    }
  }
}

export function getPlayersList(room: Room): Array<{ id: string; name: string }> {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name
  }));
}

export function validateRoomJoin(
  player: PlayerConnection | undefined,
  room: Room | undefined,
  password?: string
): { valid: boolean; error?: string } {
  if (!player) {
    return { valid: false, error: 'Joueur non trouvé' };
  }

  if (!room) {
    return { valid: false, error: 'Salle non trouvée' };
  }

  if (player.roomId) {
    return { valid: false, error: 'Déjà dans une salle' };
  }

  if (room.players.size >= room.maxPlayers) {
    return { valid: false, error: 'Salle pleine' };
  }

  if (room.isPrivate && room.password !== password) {
    return { valid: false, error: 'Mot de passe incorrect' };
  }

  return { valid: true };
}

export function validateRoomCreation(
  creator: PlayerConnection | undefined,
  maxPlayers?: number
): { valid: boolean; error?: string; validMaxPlayers?: number } {
  if (!creator) {
    return { valid: false, error: 'Joueur non trouvé' };
  }

  if (creator.roomId) {
    return { valid: false, error: 'Déjà dans une salle' };
  }

  const validMaxPlayers = Math.max(2, Math.min(12, maxPlayers || 4));
  return { valid: true, validMaxPlayers };
}

export function validateGameStart(room: Room, hasEngine: boolean): { valid: boolean; error?: string } {
  if (room.players.size < 2) {
    return { valid: false, error: 'Minimum 2 joueurs requis' };
  }

  if (hasEngine) {
    return { valid: false, error: 'Partie déjà en cours' };
  }

  return { valid: true };
}

export function cleanupEmptyRoom(
  room: Room,
  roomId: string,
  rooms: Map<string, Room>,
  roomEngines: Map<string, any>
): void {
  if (room.players.size === 0) {
    // Nettoyer le roomEngine pour éviter les fuites mémoire
    if (roomEngines.has(roomId)) {
      roomEngines.delete(roomId);
    }
    // Nettoyer l'état précédent
    room.lastGameState = undefined;
    // Supprimer la room
    rooms.delete(roomId);
    // Réinitialiser startedAt si défini
    room.startedAt = undefined;
  }
}
