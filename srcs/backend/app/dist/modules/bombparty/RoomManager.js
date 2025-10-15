import { handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleStartGame, handleGameInput, handleActivateBonus, handlePlayerDisconnect, startTurnCheckInterval, cleanupInterval } from './room';
export class BombPartyRoomManager {
    rooms = new Map();
    players = new Map();
    roomEngines = new Map();
    turnCheckInterval = null;
    constructor() {
        this.turnCheckInterval = startTurnCheckInterval(this.roomEngines, this.rooms);
    }
    registerPlayer(ws, playerId, playerName) {
        const player = {
            id: playerId,
            name: playerName,
            ws,
            roomId: undefined
        };
        this.players.set(playerId, player);
        ws.on('close', () => {
            handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
        });
    }
    createRoom(creatorId, roomName, isPrivate, password, maxPlayers) {
        return handleCreateRoom(creatorId, roomName, isPrivate, password, maxPlayers, this.players, this.rooms);
    }
    joinRoom(playerId, roomId, password) {
        return handleJoinRoom(playerId, roomId, password, this.players, this.rooms);
    }
    leaveRoom(playerId, roomId) {
        return handleLeaveRoom(playerId, roomId, this.players, this.rooms, this.roomEngines);
    }
    startGame(playerId, roomId) {
        return handleStartGame(playerId, roomId, this.rooms, this.roomEngines);
    }
    handleGameInput(playerId, roomId, word, msTaken) {
        return handleGameInput(playerId, roomId, word, msTaken, this.roomEngines, this.rooms);
    }
    activateBonus(playerId, roomId, bonusKey) {
        return handleActivateBonus(playerId, roomId, bonusKey, this.roomEngines, this.rooms);
    }
    getRoomInfo(roomId) {
        return this.rooms.get(roomId);
    }
    getPlayerInfo(playerId) {
        return this.players.get(playerId);
    }
    getPublicRooms() {
        const publicRooms = [];
        for (const [roomId, room] of this.rooms) {
            if (!room.isPrivate) {
                publicRooms.push({
                    id: roomId,
                    name: room.name,
                    players: room.players.size,
                    maxPlayers: room.maxPlayers,
                    isStarted: this.roomEngines.has(roomId),
                    createdAt: room.createdAt
                });
            }
        }
        return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
    }
    getRoomDetails(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Salle non trouvée' };
        }
        return {
            success: true,
            room: {
                id: room.id,
                name: room.name,
                isPrivate: room.isPrivate,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name
                })),
                maxPlayers: room.maxPlayers,
                isStarted: this.roomEngines.has(roomId),
                createdAt: room.createdAt
            }
        };
    }
    getRoomEngines() {
        return this.roomEngines;
    }
    handlePlayerDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (player && player.roomId) {
            this.leaveRoom(playerId, player.roomId);
        }
        this.players.delete(playerId);
    }
    cleanup() {
        cleanupInterval(this.turnCheckInterval);
        this.turnCheckInterval = null;
        this.rooms.clear();
        this.players.clear();
        this.roomEngines.clear();
    }
}
