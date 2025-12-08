import type { Room, PlayerConnection, BPServerMessage } from './roomTypes.js';

export function broadcastToRoom(
  room: Room | undefined,
  message: BPServerMessage,
  excludePlayerIds: string[] = []
): void {
  if (!room) return;

  const messageStr = JSON.stringify(message);

  for (const [playerId, playerData] of room.players) {
    if (!excludePlayerIds.includes(playerId)) {
      const socketsToSend = playerData.sockets ? Array.from(playerData.sockets) : [playerData.ws];

      for (const ws of socketsToSend) {
        try {
          if (ws.readyState === 1) {
            ws.send(messageStr);
          }
        } catch (error) {
          console.error('[BombParty] Erreur envoi message:', error);
        }
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
    return { valid: false, error: 'Joueur non trouve' };
  }

  if (!room) {
    return { valid: false, error: 'Salle non trouvee' };
  }

  if (player.roomId && player.roomId !== room.id) {
    return { valid: false, error: 'Dejà dans une autre salle' };
  }

  if (room.players.size >= room.maxPlayers) {
    return { valid: false, error: 'Salle pleine' };
  }

  if (room.isPrivate) {
    if (!password || password.trim().length === 0) {
      return { valid: false, error: 'Mot de passe requis pour ce lobby' };
    }
    if (room.password !== password) {
      return { valid: false, error: 'Mot de passe incorrect' };
    }
  }

  return { valid: true };
}

export function validateRoomCreation(
  creator: PlayerConnection | undefined,
  maxPlayers?: number,
  roomName?: string,
  password?: string
): { valid: boolean; error?: string; validMaxPlayers?: number } {
  if (!creator) {
    return { valid: false, error: 'Joueur non trouve' };
  }

  if (creator.roomId) {
    return { valid: false, error: 'Dejà dans une salle' };
  }

  if (roomName !== undefined) {
    const trimmedName = roomName.trim();
    if (trimmedName.length === 0) {
      return { valid: false, error: 'Le nom du lobby ne peut pas etre vide' };
    }
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Le nom du lobby ne peut pas depasser 50 caracteres' };
    }
    if (!/^[a-zA-Z0-9\s\-_àáâãäåeeêëìíîïòóôõöùúûüýÿçÀÁÂÃÄÅeeÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇ]+$/.test(trimmedName)) {
      return { valid: false, error: 'Le nom du lobby contient des caracteres invalides' };
    }
  }

  if (password !== undefined && password !== null && password !== '') {
    if (password.length < 3) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins 3 caracteres' };
    }
    if (password.length > 20) {
      return { valid: false, error: 'Le mot de passe ne peut pas depasser 20 caracteres' };
    }
  }

  const validMaxPlayers = Math.max(2, Math.min(12, maxPlayers || 4));
  return { valid: true, validMaxPlayers };
}

export function validateGameStart(room: Room, hasEngine: boolean): { valid: boolean; error?: string } {
  if (room.players.size < 2) {
    return { valid: false, error: 'Minimum 2 joueurs requis' };
  }

  if (hasEngine) {
    return { valid: false, error: 'Partie dejà en cours' };
  }

  return { valid: true };
}

export function cleanupEmptyRoom(
  room: Room,
  roomId: string,
  rooms: Map<string, Room>,
  roomEngines: Map<string, any>,
  gracePeriodMs: number = 0
): void {
  if (room.players.size === 0) {
    const hasGameInProgress = roomEngines.has(roomId);

    if (hasGameInProgress && gracePeriodMs > 0) {
      console.log(`[RoomUtils] Room vide avec partie en cours - grace period de ${gracePeriodMs}ms avant suppression`, { roomId });

      if (!(room as any).emptyRoomTimeout) {
        (room as any).emptyRoomTimeout = setTimeout(() => {
          if (room.players.size === 0) {
            console.log(`[RoomUtils] Grace period expire - suppression de la room vide`, { roomId });
            if (roomEngines.has(roomId)) {
              roomEngines.delete(roomId);
            }
            room.lastGameState = undefined;
            rooms.delete(roomId);
            room.startedAt = undefined;
          } else {
            console.log(`[RoomUtils] Room n'est plus vide - annulation de la suppression`, { roomId, playerCount: room.players.size });
          }
          (room as any).emptyRoomTimeout = undefined;
        }, gracePeriodMs);
      }
      return;
    }

    console.log(`[RoomUtils] Suppression immediate de la room vide`, { roomId, hasGame: hasGameInProgress });

    if (roomEngines.has(roomId)) {
      roomEngines.delete(roomId);
    }
    room.lastGameState = undefined;
    rooms.delete(roomId);
    room.startedAt = undefined;
  } else {
    if ((room as any).emptyRoomTimeout) {
      console.log(`[RoomUtils] Room n'est plus vide - annulation du timeout de suppression`, { roomId, playerCount: room.players.size });
      clearTimeout((room as any).emptyRoomTimeout);
      (room as any).emptyRoomTimeout = undefined;
    }
  }
}

export function incrementRoomState(room: Room): void {
  if (!room.sequenceNumber) room.sequenceNumber = 0;
  room.sequenceNumber++;
  if (!room.stateVersion) room.stateVersion = 0;
  room.stateVersion++;
}
