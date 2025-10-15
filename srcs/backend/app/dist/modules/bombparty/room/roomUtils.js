export function broadcastToRoom(room, message, excludePlayerIds = []) {
    if (!room)
        return;
    const messageStr = JSON.stringify(message);
    for (const [playerId, playerData] of room.players) {
        if (!excludePlayerIds.includes(playerId)) {
            try {
                playerData.ws.send(messageStr);
            }
            catch (error) {
                console.error('[BombParty] Erreur envoi message:', error);
            }
        }
    }
}
export function getPlayersList(room) {
    return Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name
    }));
}
export function validateRoomJoin(player, room, password) {
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
export function validateRoomCreation(creator, maxPlayers) {
    if (!creator) {
        return { valid: false, error: 'Joueur non trouvé' };
    }
    if (creator.roomId) {
        return { valid: false, error: 'Déjà dans une salle' };
    }
    const validMaxPlayers = Math.max(2, Math.min(12, maxPlayers || 4));
    return { valid: true, validMaxPlayers };
}
export function validateGameStart(room, hasEngine) {
    if (room.players.size < 2) {
        return { valid: false, error: 'Minimum 2 joueurs requis' };
    }
    if (hasEngine) {
        return { valid: false, error: 'Partie déjà en cours' };
    }
    return { valid: true };
}
export function cleanupEmptyRoom(room, roomId, rooms, roomEngines) {
    if (room.players.size === 0) {
        rooms.delete(roomId);
        if (roomEngines.has(roomId)) {
            roomEngines.delete(roomId);
        }
    }
}
