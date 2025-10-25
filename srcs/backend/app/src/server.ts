import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import gameController from "./plugins/gameController.ts";
import bombPartyWSHandlers from "./modules/bombparty/wsHandlers.ts";
import bombPartyStatsRoutes from "./modules/bombparty/statsRoutes.ts";
import path from "path";
import { fileURLToPath } from "url";

import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

const fastify = Fastify({
	logger: {
		transport: {
			target: "pino-pretty",
		},
	},
});

fastify.register(websocket);
fastify.register(gameController);
fastify.register(bombPartyWSHandlers);

const JWT_SECRET = "super_secret_key";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = (await import(path.join(__dirname, "..", "index.js"))).default;


await fastify.register(cors, {
	origin: "http://localhost:5173",
});

console.log('[Stats] Enregistrement des routes de statistiques...');
await fastify.register(bombPartyStatsRoutes);
console.log('[Stats] Statistics routes registered');

fastify.get("/", async () => {
	return { hello: "from docker" };
});

fastify.post("/register", async (request, reply) => {
	const { name, email, password } = request.body as {
		name: string;
		email: string;
		password: string;
	};

	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email)) {
		return reply.code(400).send({ error: "Email invalide" });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);

		db.run(
			"INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
			[name, email, hashedPassword],
			function (this: any, err: any) {
				if (err) {
				return reply
					.code(500)
					.send({ error: "User registration error" });
				}
				return reply.send({ success: true, id: this.lastID });
			}
		);
	} catch {
		return reply.code(500).send({ error: "Server error" });
	}
});

fastify.post("/login", async (request, reply) => {
	const { email, password } = request.body as {
		email: string;
		password: string;
	};

	db.get(
		"SELECT * FROM users WHERE email = ?",
	[email],
	async (err: any, user: any) => {
		if (err) {
			return reply.code(500).send({ error: "Server error" });
		}

		if (!user) {
			return reply
				.code(401)
				.send({ error: "User not found" });
		}			const isPasswordValid = await bcrypt.compare(
				password,
				user.password
			);
			if (!isPasswordValid) {
				return reply.code(401).send({ error: "Mot de passe invalide" });
			}

			const token = jwt.sign(
				{ id: user.id, name: user.name },
				JWT_SECRET,
				{ expiresIn: "2h" }
			);

			return reply.send({ success: true, token, name: user.name });
		}
	);
});

fastify.get("/profile", async (request, reply) => {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({ error: "Token manquant" });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: number;
			name: string;
		};

		return reply.send({ message: `Hello ${decoded.name}` });
	} catch {
		return reply.code(401).send({ error: "Invalid or expired token" });
	}
});

fastify.get("/me", async (request, reply) => {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({ error: "Token manquant" });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

		db.get(
			"SELECT id, name, email, twoFAEnabled FROM users WHERE id = ?",
			[decoded.id],
			(err: any, user: any) => {
				if (err || !user) {
					return reply
						.code(404)
						.send({ error: "Utilisateur introuvable" });
				}

				return reply.send(user);
			}
		);
	} catch {
		return reply.code(401).send({ error: "Invalid or expired token" });
	}
});

/*  ===============================================================================
    OLD WEBSOCKET HANDLER (COMMENTED OUT)
    Now handled by wsHandlers.ts (modular plugin with RoomManager + GameEngine)
    =============================================================================== */
/*
// Route WebSocket simple pour Bomb Party
fastify.get('/bombparty/ws', { websocket: true }, (connection, req) => {
	console.log('[BombParty] Nouvelle connexion WebSocket depuis:', req.headers['user-agent']);
	
	// Stocker les informations de la connexion
	let playerId: string | null = null;
	let playerName: string | null = null;
	
	connection.on('message', (message) => {
		try {
			const data = JSON.parse(message.toString());
			console.log('[BombParty] Message received:', data);
			
			// Gestion basique des messages
			switch (data.event) {
				case 'bp:auth':
					// Authentification simple
					playerId = 'player_' + Math.random().toString(36).substr(2, 9);
					playerName = data.payload?.playerName || 'Player';
					console.log('[BombParty] Authentification pour:', playerName);
					connection.send(JSON.stringify({
						event: 'bp:auth:success',
						payload: {
							playerId,
							playerName
						}
					}));
					break;

				case 'bp:lobby:start':
					console.log(`[BombParty] START <- {roomId:${data.payload?.roomId}, playerId:${playerId}}`);

					if (!playerId) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'NOT_AUTH', message: 'You must be authenticated' }
						}));
						break;
					}

					const startRoomId = data.payload?.roomId;
					if (!startRoomId) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'ROOM_NOT_FOUND', message: 'Room ID missing' }
						}));
						break;
					}

					const startLobby = lobbies.get(startRoomId);
					if (!startLobby) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' }
						}));
						break;
					}

					const hostPlayer = startLobby.players[0];
					const isHost = hostPlayer && hostPlayer.id === playerId;
					if (!isHost) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'NOT_HOST', message: "Only host can start the game" }
						}));
						break;
					}

					if (!Array.isArray(startLobby.players) || startLobby.players.length < 2) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'NOT_ENOUGH_PLAYERS', message: 'Not enough players to start' }
						}));
						break;
					}

					startLobby.isStarted = true;

					broadcastToRoom(startRoomId, 'bp:game:countdown', {
						roomId: startRoomId,
						countdown: 3,
						startTime: Date.now(),
						countdownDuration: 3000
					});

					setTimeout(() => {
						const liveLobby = lobbies.get(startRoomId);
						if (!liveLobby) return;

						broadcastToRoom(startRoomId, 'bp:game:start', {
							roomId: startRoomId,
							players: liveLobby.players,
							maxPlayers: liveLobby.maxPlayers
						});

						broadcastToRoom(startRoomId, 'bp:game:state', {
							roomId: startRoomId,
							gameState: {
								phase: 'TURN_ACTIVE',
								players: liveLobby.players.map((p: any) => ({ id: p.id, name: p.name })),
								currentPlayerId: liveLobby.players[0]?.id || null,
								turnDurationMs: 15000,
								turnStartedAt: Date.now(),
								baseTurnSeconds: 15
							}
						});
					}, 3000);

					break;
					
				case 'bp:lobby:list':
					// Retourner la liste des lobbies
					console.log('[BombParty] Demande de liste des lobbies');
					const roomsList = Array.from(lobbies.values()).map(l => ({
						id: l.id,
						name: l.name,
						players: l.players.length,
						maxPlayers: l.maxPlayers,
						isPrivate: l.isPrivate,
						isStarted: l.isStarted,
						createdAt: l.createdAt
					}));
					
					connection.send(JSON.stringify({
						event: 'bp:lobby:list',
						payload: { rooms: roomsList }
					}));
					break;
					
				case 'bp:lobby:create':
					console.log(`[BombParty] CREATE <- {name:${data.payload?.name}, playerId:${playerId}}`);
					const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
					const lobbyName = data.payload?.name || 'Lobby';
					const isPrivate = data.payload?.isPrivate || false;
					const maxPlayers = data.payload?.maxPlayers || 4;
					
					const lobby: Lobby = {
						id: roomId,
						name: lobbyName,
						isPrivate,
						password: data.payload?.password,
						maxPlayers,
						players: [],
						createdAt: Date.now(),
						isStarted: false
					};
					
					lobbies.set(roomId, lobby);
					const creatorPlayer: LobbyPlayer = {
						id: playerId || 'temp_player',
						name: playerName || 'Player',
						isHost: true
					};
					
				lobby.players.push(creatorPlayer);
				
				subscribeToRoom(connection, roomId);					broadcastToRoom(roomId, 'bp:room:state', {
						roomId,
						players: lobby.players,
						maxPlayers: lobby.maxPlayers,
						status: 'waiting'
					});
					
					connection.send(JSON.stringify({
						event: 'bp:lobby:created',
						payload: {
							roomId,
							playerId: creatorPlayer.id,
							maxPlayers,
							players: lobby.players
						}
					}));
					
					broadcastToAll({
						event: 'bp:lobby:list_updated',
						payload: {
							rooms: Array.from(lobbies.values()).map(l => ({
								id: l.id,
								name: l.name,
								players: l.players.length,
								maxPlayers: l.maxPlayers,
								isPrivate: l.isPrivate,
								isStarted: l.isStarted,
								createdAt: l.createdAt
							}))
						}
					});
					
					console.log(`[BombParty] LOBBIES upsert -> id=${roomId}, players=${lobby.players.length}/${lobby.maxPlayers}`);
					break;
					
				case 'bp:lobby:join':
					console.log(`[BombParty] JOIN <- {roomId:${data.payload?.roomId}, playerId:${playerId}}`);
					
					if (!playerId) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'NOT_AUTH', message: 'You must be authenticated' }
						}));
						break;
					}
					
					const joinRoomId = data.payload?.roomId;
					const password = data.payload?.password;
					
					if (!joinRoomId) {
						connection.send(JSON.stringify({
							event: 'bp:error',
							payload: { code: 'ROOM_NOT_FOUND', message: 'Room ID missing' }
						}));
						break;
					}
					
				const joinLobby = lobbies.get(joinRoomId);
				if (!joinLobby) {
					connection.send(JSON.stringify({
						event: 'bp:error',
						payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' }
					}));
					break;
				}
				if (joinLobby.players.length >= joinLobby.maxPlayers) {
					connection.send(JSON.stringify({
						event: 'bp:error',
						payload: { code: 'ROOM_FULL', message: 'This room is full' }
					}));
					break;
				}
				if (joinLobby.isPrivate && joinLobby.password !== password) {
					connection.send(JSON.stringify({
						event: 'bp:error',
						payload: { code: 'BAD_PASSWORD', message: 'Incorrect password' }
					}));
					break;
				}
				const newPlayer: LobbyPlayer = {
					id: playerId,
					name: playerName || 'Player',
					isHost: false
				};
				
				joinLobby.players.push(newPlayer);
				console.log(`[BombParty] ADD_PLAYER -> count=${joinLobby.players.length}`);
				
				subscribeToRoom(connection, joinRoomId);
				
				broadcastToRoom(joinRoomId, 'bp:room:state', {
					roomId: joinRoomId,
					players: joinLobby.players,
					maxPlayers: joinLobby.maxPlayers,
					status: 'waiting'
				});
				
				connection.send(JSON.stringify({
					event: 'bp:lobby:joined',
					payload: {
						roomId: joinRoomId,
						players: joinLobby.players,
						maxPlayers: joinLobby.maxPlayers,
						isHost: false
					}
				}));
				
				broadcastToAll({
					event: 'bp:lobby:list_updated',
					payload: {
						rooms: Array.from(lobbies.values()).map(l => ({
							id: l.id,
							name: l.name,
							players: l.players.length,
							maxPlayers: l.maxPlayers,
							isPrivate: l.isPrivate,
							isStarted: l.isStarted,
							createdAt: l.createdAt
						}))
					}
				});					console.log(`[BombParty] LOBBIES upsert -> id=${joinRoomId}, players=${joinLobby.players.length}/${joinLobby.maxPlayers}`);
					break;
					
				case 'bp:room:subscribe':
					const subscribeRoomId = data.payload?.roomId;
					if (subscribeRoomId && playerId) {
						subscribeToRoom(connection, subscribeRoomId);
					}
					break;
					
				case 'bp:room:unsubscribe':
					const unsubscribeRoomId = data.payload?.roomId;
					if (unsubscribeRoomId) {
						unsubscribeFromRoom(connection, unsubscribeRoomId);
					}
					break;
					
				case 'bp:ping':
					connection.send(JSON.stringify({
						event: 'bp:pong'
					}));
					break;
					
				default:
			}
		} catch (error) {
			console.error('[BombParty] Message parsing error:', error);
		}
	});
	
	connection.on('close', (code, reason) => {
		console.log(`[BombParty] CONNECTION_CLOSED <- {playerId:${playerId}, code:${code}}`);
		
		// Nettoyer les abonnements
		cleanupConnection(connection);
		
		if (playerId) {
			for (const [roomId, lobby] of lobbies.entries()) {
				const hostPlayer = lobby.players.find((p: LobbyPlayer) => p.isHost);
				if (hostPlayer && hostPlayer.id === playerId) {
					console.log(`[BombParty] DESTROY_ROOM -> id=${roomId} (host disconnected)`);
					
					broadcastToRoom(roomId, 'bp:room:closed', { roomId });
					
					lobbies.delete(roomId);
					roomSubscriptions.delete(roomId);
					
					broadcastToAll({
						event: 'bp:lobby:removed',
						payload: { roomId }
					});
					
					console.log(`[BombParty] LOBBIES remove -> id=${roomId}`);
					break;
				}
			}
		}
	});
	
	connection.on('error', (error) => {
		console.error('[BombParty] WebSocket error:', error);
	});
	setTimeout(() => {
		connection.send(JSON.stringify({
			event: 'bp:welcome',
			payload: {
				message: 'Bomb Party connection established',
				version: '1.0.0'
			}
		}));
	}, 100);
});

// Lobby system now managed by RoomManager in wsHandlers.ts
type LobbyPlayer = { id: string; name: string; isHost: boolean };
type Lobby = {
	id: string;
	name: string;
	isPrivate: boolean;
	password?: string;
	maxPlayers: number;
	players: LobbyPlayer[];
	createdAt: number;
	isStarted: boolean;
};

const lobbies: Map<string, Lobby> = new Map();
const roomSubscriptions: Map<string, Set<any>> = new Map();

function broadcastToAll(message: any) {
	console.log('[BombParty] Broadcast:', message);
}

function broadcastToRoom(roomId: string, event: string, payload: any) {
	const subscribers = roomSubscriptions.get(roomId);
	if (subscribers) {
		console.log(`[BombParty] BROADCAST room:${event} -> receivers=${subscribers.size}`);
		const message = JSON.stringify({ event, payload });
		for (const connection of subscribers) {
			try {
				connection.send(message);
			} catch (error) {
				console.error('[BombParty] Error sending room broadcast:', error);
			}
		}
	}
}

function subscribeToRoom(connection: any, roomId: string) {
	if (!roomSubscriptions.has(roomId)) {
		roomSubscriptions.set(roomId, new Set());
	}
	roomSubscriptions.get(roomId)!.add(connection);
	console.log(`[BombParty] SUBSCRIBE room:${roomId} -> total=${roomSubscriptions.get(roomId)!.size}`);
}

function unsubscribeFromRoom(connection: any, roomId: string) {
	const subscribers = roomSubscriptions.get(roomId);
	if (subscribers) {
		subscribers.delete(connection);
		if (subscribers.size === 0) {
			roomSubscriptions.delete(roomId);
		}
		console.log(`[BombParty] UNSUBSCRIBE room:${roomId} -> total=${subscribers.size}`);
	}
}

function cleanupConnection(connection: any) {
	for (const [roomId, subscribers] of roomSubscriptions.entries()) {
		subscribers.delete(connection);
		if (subscribers.size === 0) {
			roomSubscriptions.delete(roomId);
		}
	}
}
*/

fastify.listen({ port: 3001, host: "0.0.0.0" });
