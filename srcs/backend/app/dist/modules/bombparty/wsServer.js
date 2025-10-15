export class BombPartyWSServer {
    connections = new Map();
    PING_INTERVAL = 15000;
    PONG_TIMEOUT = 7000;
    constructor() {
        this.startHeartbeatInterval();
    }
    startHeartbeatInterval() {
        setInterval(() => {
            this.sendPingToAll();
        }, this.PING_INTERVAL);
    }
    sendPingToAll() {
        const now = Date.now();
        for (const [socket, connection] of this.connections) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.ping();
                    connection.lastPong = now;
                }
                catch (error) {
                    console.error('[BombParty] Erreur ping:', error);
                    this.closeConnection(socket, 'PING_ERROR');
                }
            }
        }
        setTimeout(() => {
            this.checkPongTimeouts();
        }, this.PONG_TIMEOUT);
    }
    checkPongTimeouts() {
        const now = Date.now();
        for (const [socket, connection] of this.connections) {
            if (socket.readyState === WebSocket.OPEN) {
                if (now - connection.lastPong > this.PONG_TIMEOUT) {
                    this.closeConnection(socket, 'PONG_TIMEOUT');
                }
            }
        }
    }
    registerConnection(socket, playerId, roomId) {
        const connection = {
            socket,
            playerId,
            roomId,
            lastPong: Date.now()
        };
        this.connections.set(socket, connection);
        socket.on('pong', () => {
            const conn = this.connections.get(socket);
            if (conn) {
                conn.lastPong = Date.now();
            }
        });
        socket.on('close', () => {
            this.connections.delete(socket);
        });
        socket.on('error', (error) => {
            console.error('[BombParty] Erreur WebSocket:', error);
            this.connections.delete(socket);
        });
    }
    updateConnection(socket, playerId, roomId) {
        const connection = this.connections.get(socket);
        if (connection) {
            connection.playerId = playerId;
            connection.roomId = roomId;
        }
    }
    closeConnection(socket, reason) {
        const connection = this.connections.get(socket);
        if (connection) {
            console.log(`[BombParty] Fermeture connexion: ${reason}`);
            this.connections.delete(socket);
            if (connection.heartbeatInterval) {
                clearInterval(connection.heartbeatInterval);
            }
            if (socket.readyState === WebSocket.OPEN) {
                socket.close(1000, reason);
            }
        }
    }
    sendError(socket, error, code = ErrorCode.STATE_ERROR) {
        const message = {
            t: 'error',
            code,
            msg: error
        };
        try {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        }
        catch (err) {
            console.error('[BombParty] Erreur envoi message:', err);
        }
    }
    sendMessage(socket, message) {
        try {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        }
        catch (err) {
            console.error('[BombParty] Erreur envoi message:', err);
        }
    }
    getConnection(socket) {
        return this.connections.get(socket);
    }
    cleanup() {
        for (const [socket] of this.connections) {
            this.closeConnection(socket, 'SERVER_SHUTDOWN');
        }
        this.connections.clear();
    }
}
