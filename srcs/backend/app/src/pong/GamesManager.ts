import Game from "./Game.ts";
import { DEFAULT_COUNTDOWN_SECONDS } from "./config.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";
import plotRewards from "./chart.ts";
import Tournament from "./Tournament.ts";
import type { Client } from "../plugins/websockets.ts";
import InvitManager from "./InvitManager.ts";
import type { Invitation } from "./InvitManager.ts";

export default class GamesManager {
	private tournaments: Record<string, Tournament> = {};
	private rooms: WeakMap<Client, Game> = new WeakMap();
	private waitingClient: Client | null = null;
	private countdowns: WeakMap<Game, { cancelled: boolean }> = new WeakMap();
	private readyPhases: WeakMap<
		Game,
		{
			p1Ready: boolean;
			p2Ready: boolean;
			cancelled: boolean;
			timer: ReturnType<typeof setTimeout> | null;
		}
	> = new WeakMap();
	private invitManager: InvitManager;
	private savedGames: WeakSet<Game> = new WeakSet();
	private static readonly COUNTDOWN_SECONDS = DEFAULT_COUNTDOWN_SECONDS;
	private static readonly READY_PHASE_SECONDS = 30;
	private fastify: any;

	constructor() {
		this.invitManager = new InvitManager({
			ttlSeconds: 30,
			onStateChange: (inv) => this.handleInvitationStateChange(inv),
		});
	}

	setFastifyInstance(fastify: any) {
		this.fastify = fastify;
	}

	private async saveGameResult(
		player1: Client,
		player2: Client | null,
		winner: Client,
		scores: number[],
		botDifficulty?: string,
		matchType: string = "quick"
	) {
		if (!this.fastify) {
			console.warn("Fastify instance not available for saving game result");
			return;
		}

		try {
			const player1Id = player1.id;
			const player2Id = player2?.id || null;
			const winnerId = winner.id;

			await this.fastify.saveMatch(
				player1Id,
				player2Id,
				winnerId,
				scores,
				botDifficulty,
				matchType
			);

			console.log(
				`Game result processed: P1=${player1.name}, P2=${
					player2?.name || "Bot"
				}, Winner=${winner.name}, Type=${matchType}`
			);
		} catch (error) {
			console.error("Error saving game result:", error);
		}
	}

	private wsSend(client: Client, payload: any) {
		client.socket?.send(JSON.stringify(payload));
	}

	private handleInvitationStateChange(inv: Invitation) {
		const remainingMs = inv.expiresAt - Date.now();
		const remaining = Math.max(0, Math.round(remainingMs / 1000));
		switch (inv.state) {
			case "pending": {
				this.wsSend(inv.receiv, {
					event: "invitation",
					to: "invitation_events",
					body: {
						from: inv.sent.name,
						expiresIn: remaining,
						invitationId: inv.id,
					},
				});
				this.wsSend(inv.sent, {
					event: "invitation_waiting",
					to: "invitation_events",
					body: { to: inv.receiv.name, invitationId: inv.id },
				});
				break;
			}
			case "accepted": {
				this.wsSend(inv.sent, {
					event: "invitation_accepted",
					to: "invitation_events",
					body: { by: inv.receiv.name, invitationId: inv.id },
				});
				this.wsSend(inv.receiv, {
					event: "invitation_accepted",
					to: "invitation_events",
					body: { inviter: inv.sent.name, invitationId: inv.id },
				});
				this.startInvitedGame(inv.sent, inv.receiv);
				break;
			}
			case "declined": {
				this.wsSend(inv.sent, {
					event: "invitation_declined",
					to: "invitation_events",
					body: { by: inv.receiv.name, invitationId: inv.id },
				});
				this.wsSend(inv.receiv, {
					event: "invitation_declined_self",
					to: "invitation_events",
					body: { invitationId: inv.id },
				});
				break;
			}
			case "cancelled": {
				this.wsSend(inv.receiv, {
					event: "invitation_cancelled",
					to: "invitation_events",
					body: { by: inv.sent.name, invitationId: inv.id },
				});
				this.wsSend(inv.sent, {
					event: "invitation_cancelled_self",
					to: "invitation_events",
					body: { invitationId: inv.id },
				});
				break;
			}
			case "expired": {
				this.wsSend(inv.sent, {
					event: "invitation_expired",
					to: "invitation_events",
					body: { to: inv.receiv.name, invitationId: inv.id },
				});
				this.wsSend(inv.receiv, {
					event: "invitation_expired",
					to: "invitation_events",
					body: { from: inv.sent.name, invitationId: inv.id },
				});
				break;
			}
		}
	}

	createTournament(
		client: Client,
		id: string,
		size: number,
		passwd: string
	): boolean {
		if (this.tournaments[id]) {
			client.socket?.send(
				JSON.stringify({ event: "error", msg: "tournamentId" })
			);
			return false;
		}
		this.tournaments[id] = new Tournament({
			rooms: this.rooms,
			id,
			password: passwd,
			capacity: size,
			onEnd: () => {
				delete this.tournaments[id];
				console.log("onEnd tour called");
			},
			startCountdown: (game, clients) =>
				this.startWithReadyPhase(game, clients),
			setRoom: (client, game) => this.setRoom(client, game),
			cancelCountdown: (game) => {
				const entry = this.countdowns.get(game);
				if (entry) {
					entry.cancelled = true;
					this.countdowns.delete(game);
				}
				const readyPhase = this.readyPhases.get(game);
				if (readyPhase) {
					readyPhase.cancelled = true;
					if (readyPhase.timer) {
						clearTimeout(readyPhase.timer);
					}
					this.readyPhases.delete(game);
				}
			},
			fastify: this.fastify,
		});
		this.joinTournament(client, id, passwd);
		return true;
	}

	joinTournament(client: Client, id: string, passwd?: string) {
		const tournament: Tournament | undefined = this.tournaments[id];
		if (!tournament || tournament.started) return;
		if (tournament.password && (!passwd || passwd !== tournament.password))
			return;
		tournament.join(client);
	}

	listTournaments() {
		return Object.values(this.tournaments)
			.map((t) => ({
				id: t.id,
				players: t.players.length,
				capacity: t.capacity,
				private: !!t.password,
				started: t.started,
			}))
			.filter((t) => !t.started);
	}

	async trainBot(ws: WebSocket, bot: difficulty, games: number) {
		const controller = new AbortController();
		const { signal } = controller;

		ws.on("close", () => controller.abort());
		const trainingClient: Client = {
			id: -1,
			name: "trainer",
			socket: ws,
		} as Client;
		const game = new Game({
			p1: trainingClient,
			botDiff: bot,
			train: true,
			onEnd: null,
		});
		for (let i = 0; i < games; ++i) {
			if (signal.aborted) break;
			console.log(`game ${i + 1}`);
			try {
				await game.startAsync(signal);
			} catch (e) {
				console.log("test");
				if (signal.aborted) console.log("Training aborted during game ", i);
				break;
			}
		}
		const controllerBot = game.board.botController[0];
		if (controllerBot) plotRewards("rewards", controllerBot.rewards, bot);
		console.log("Training loop ended.");
	}

	startTraining(ws: WebSocket, bot: difficulty) {
		this.trainBot(ws, bot, 100);
		console.log("debug");
		return { playerId: "train" };
	}

	startOffline(
		client: Client,
		diff: difficulty | null,
		skipCountdown?: boolean
	): boolean {
		const game = new Game({
			p1: client,
			botDiff: diff,
			onEnd: async (c: Client, didWin: boolean, scores: number[]) => {
				if (diff !== null && !this.savedGames.has(game)) {
					const winnerId = didWin ? c.id : -1;
					console.log(
						`Saving bot match: ${c.name} vs Bot (${diff}), Winner: ${
							didWin ? c.name : `Bot (${diff})`
						}`
					);
					await this.saveGameResult(
						c,
						null,
						{
							id: winnerId,
							name: didWin ? c.name : `Bot (${diff})`,
						} as Client,
						scores,
						diff,
						"offline"
					);
					this.savedGames.add(game);
				} else if (diff !== null) {
					console.log(
						`Bot match already saved for ${c.name} vs Bot (${diff})`
					);
				}

				this.removeRoom(c);
				if (!c.quit) {
					c.socket?.send(
						JSON.stringify({
							event: "result",
							body: { is: "offline", didWin, scores },
						})
					);
				}
			},
		});
		this.setRoom(client, game);
		if (skipCountdown) game.start();
		else this.startWithCountdown(game, game.clients);
		return diff === null;
	}

	invite(client: Client, friend: Client, flag: boolean = false) {
		if (this.getRoom(client) || this.getRoom(friend)) {
			client.socket?.send(
				JSON.stringify({
					event: "invitation_error",
					to: "invitation_events",
					body: { reason: "in_game" },
				})
			);
			return;
		}
		if (client.id === friend.id) {
			client.socket?.send(
				JSON.stringify({
					event: "invitation_error",
					to: "invitation_events",
					body: { reason: "self" },
				})
			);
			return;
		}
		if (this.waitingClient === client || this.waitingClient === friend) {
			client.socket?.send(
				JSON.stringify({
					event: "invitation_error",
					to: "invitation_events",
					body: { reason: "searching" },
				})
			);
			return;
		}
		this.invitManager.create(client, friend);
	}

	doInvitationAction(
		action: "accept" | "decline" | "cancel",
		client: Client,
		invitationId: string
	) {
		this.invitManager.do(action, client, invitationId);
	}

	private startInvitedGame(sent: Client, receiv: Client) {
		const onEnd = async (c: Client, didWin: boolean, scores: number[]) => {
			const winner = didWin ? c : c === sent ? receiv : sent;
			console.log(
				`Invited game ended: ${c.name} (didWin: ${didWin}), Winner: ${winner.name}`
			);

			this.removeRoom(c);
			if (!c.quit) {
				c.socket?.send(
					JSON.stringify({
						event: "result",
						to: "pong",
						body: {
							is: "invite",
							didWin,
							scores,
							opponent: this.getRoom(c)?.getOpp(c)?.name ?? null,
						},
					})
				);
			}

			// Save result only once (when one player ends it?)
			// Version B logic: `this.saveGameResult(sent, receiv, winner, scores, undefined, 'quick');` called in onEnd.
			// This runs for BOTH players in onEnd?
			// onEnd is called for each player in Game.ts?
			// Game.ts (Version A): calls onEnd for both clients.
			// We should save only once.
			// Version B `startInvitedGame` `onEnd` seems to save it. If called twice, it saves twice?
			// Version B `startOnline` has check `if (this.waitingClient ...)` to set up `onEnd`...
			// Actually, let's use `savedGames` set to prevent double save.
			if (!this.savedGames.has(game)) {
				this.saveGameResult(
					sent,
					receiv,
					winner,
					scores,
					undefined,
					"quick"
				);
				this.savedGames.add(game);
			}
		};
		const game = new Game({ p1: sent, p2: receiv, onEnd });
		this.setRoom(sent, game);
		this.setRoom(receiv, game);
		sent.socket?.send(
			JSON.stringify({
				event: "game_session_ready",
				to: "game_session",
				body: {
					sessionId: `${sent.id}:${receiv.id}`,
					sessionType: "invite",
					opponent: receiv.name,
					self: sent.name,
					side: sent.inGameId ?? null,
					labels: {
						self: `${sent.name} (You)`,
						opponent: receiv.name,
					},
				},
			})
		);
		receiv.socket?.send(
			JSON.stringify({
				event: "game_session_ready",
				to: "game_session",
				body: {
					sessionId: `${sent.id}:${receiv.id}`,
					sessionType: "invite",
					opponent: sent.name,
					self: receiv.name,
					side: receiv.inGameId ?? null,
					labels: {
						self: `${receiv.name} (You)`,
						opponent: sent.name,
					},
				},
			})
		);
		this.startWithReadyPhase(game, [sent, receiv]);
	}

	startOnline(client: Client) {
		this.invitManager.removeForClient(client);
		if (this.waitingClient && this.waitingClient !== client) {
			const opponent = this.waitingClient;
			this.waitingClient = null;
			console.log(
				`[Matchmaking] Pairing ${opponent.name} vs ${client.name}`
			);
			const onEnd = async (c: Client, didWin: boolean, scores: number[]) => {
				const winner = didWin ? c : c === opponent ? client : opponent;
				
				if (!this.savedGames.has(game)) {
					console.log(
						`OnEnd called: ${c.name} (didWin: ${didWin}), Winner: ${winner.name}`
					);
					await this.saveGameResult(
						opponent,
						client,
						winner,
						scores,
						undefined,
						"quick"
					);
					this.savedGames.add(game);
				}

				this.removeRoom(c);
				if (!c.quit) {
					c.socket?.send(
						JSON.stringify({
							event: "result",
							body: { is: "quick", didWin, scores },
						})
					);
				}
			};
			const game = new Game({ p1: opponent, p2: client, onEnd });
			this.setRoom(opponent, game);
			this.setRoom(client, game);
			this.startWithReadyPhase(game, [opponent, client]);
			return;
		}
		console.log(`[Matchmaking] ${client.name} queued for quick match`);
		client.socket?.send(JSON.stringify({ event: "searching" }));
		this.waitingClient = client;
	}

	removeFromQueue(client: Client) {
		if (this.waitingClient && client === this.waitingClient) {
			console.log("waiting client removed");
			this.waitingClient = null;
		}
	}

	private broadcastPlayersInfo(game: Game, clients: (Client | undefined)[]) {
		const anyClient = clients.find((c) => !!c);
		const sessionType: "tournament" | "quick" = anyClient?.tournament
			? "tournament"
			: "quick";
		let tournamentDepth: number | undefined = undefined;
		if (sessionType === "tournament" && anyClient?.tournament) {
			const t = this.tournaments[anyClient.tournament.tournamentId];
			if (t) {
				const ctx = t.getRoundContextForGame(game);
				if (ctx) tournamentDepth = ctx.depth;
			}
		}
		for (const client of clients) {
			if (!client?.socket) continue;
			const opponent = game.getOpp(client)?.name ?? "Opponent";
			client.socket.send(
				JSON.stringify({
					event: "game_session_ready",
					to: "game_session",
					body: {
						sessionId: `${game.clients[0]?.id ?? ""}:${
							game.clients[1]?.id ?? ""
						}`,
						sessionType,
						opponent,
						self: client.name,
						side: client.inGameId ?? null,
						labels: { self: `${client.name} (You)`, opponent },
						...(tournamentDepth !== undefined
							? { tournamentDepth }
							: {}),
						countdownStart: GamesManager.COUNTDOWN_SECONDS,
					},
				})
			);
		}
	}

	private broadcastReadyPhase(
		game: Game,
		clients: (Client | undefined)[],
		remaining: number,
		p1Ready: boolean,
		p2Ready: boolean
	) {
		for (const client of clients) {
			if (!client?.socket) continue;
			const selfReady = client.inGameId === 0 ? p1Ready : p2Ready;
			const opponentReady = client.inGameId === 0 ? p2Ready : p1Ready;
			client.socket.send(
				JSON.stringify({
					event: "ready_phase",
					to: "pong",
					body: { remaining, selfReady, opponentReady },
				})
			);
		}
	}

	private async startWithReadyPhase(
		game: Game,
		clients: (Client | undefined)[]
	) {
		const readyState = {
			p1Ready: false,
			p2Ready: false,
			cancelled: false,
			timer: null as ReturnType<typeof setTimeout> | null,
		};
		this.readyPhases.set(game, readyState);

		this.broadcastPlayersInfo(game, clients);

		let elapsed = 0;
		const checkInterval = 100;

		const checkReady = async () => {
			while (elapsed < GamesManager.READY_PHASE_SECONDS * 1000) {
				if (readyState.cancelled) {
					this.readyPhases.delete(game);
					return;
				}

				if (readyState.p1Ready && readyState.p2Ready) {
					this.readyPhases.delete(game);
					await this.startWithCountdown(game, clients);
					return;
				}

				if (elapsed % 1000 === 0) {
					const remainingSeconds = Math.ceil(
						(GamesManager.READY_PHASE_SECONDS * 1000 - elapsed) /
							1000
					);
					this.broadcastReadyPhase(
						game,
						clients,
						remainingSeconds,
						readyState.p1Ready,
						readyState.p2Ready
					);
				}

				await new Promise((resolve) =>
					setTimeout(resolve, checkInterval)
				);
				elapsed += checkInterval;
			}

			if (!readyState.cancelled) {
				this.readyPhases.delete(game);
				await this.startWithCountdown(game, clients);
			}
		};

		checkReady();
	}

	markPlayerReady(client: Client) {
		const room = this.getRoom(client);
		if (!room) return;

		const readyState = this.readyPhases.get(room);
		if (!readyState) return;

		if (client.inGameId === 0) {
			readyState.p1Ready = true;
		} else if (client.inGameId === 1) {
			readyState.p2Ready = true;
		}

		this.broadcastReadyPhase(
			room,
			room.clients,
			GamesManager.READY_PHASE_SECONDS,
			readyState.p1Ready,
			readyState.p2Ready
		);
	}

	private async startWithCountdown(
		game: Game,
		clients: (Client | undefined)[],
		seconds: number = GamesManager.COUNTDOWN_SECONDS
	) {
		const entry = { cancelled: false };
		this.countdowns.set(game, entry);
		// broadcastPlayersInfo was already called in readyPhase, or prior.
		console.log(`[Countdown] init for game with ${seconds}s`);

		let started = false;
		const failsafeId = setTimeout(() => {
			if (!entry.cancelled && !started) {
				console.log(`[Countdown] failsafe start triggered`);
				this.countdowns.delete(game);
				game.start();
			}
		}, (seconds + 2) * 1000);

		for (let remaining = seconds; remaining > 0; remaining--) {
			if (entry.cancelled) {
				console.log(
					`[Countdown] cancelled during countdown at ${remaining}`
				);
				clearTimeout(failsafeId);
				this.countdowns.delete(game);
				return;
			}
			// console.log(`[Countdown] remaining=${remaining}`);
			try {
				this.broadcastCountdown(clients, remaining);
			} catch (err) {
				console.error(
					`[Countdown] broadcast error at ${remaining}:`,
					err
				);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		if (entry.cancelled) {
			console.log(`[Countdown] cancelled after loop`);
			clearTimeout(failsafeId);
			this.countdowns.delete(game);
			return;
		}
		try {
			this.broadcastCountdown(clients, 0);
		} catch (err) {
			console.error(`[Countdown] broadcast error at 0:`, err);
		}
		this.countdowns.delete(game);
		started = true;
		clearTimeout(failsafeId);
		console.log(`[Countdown] starting game now`);
		game.start();
	}

	private broadcastCountdown(
		clients: (Client | undefined)[],
		remaining: number
	) {
		const payload = JSON.stringify({
			event: "countdown",
			body: { remaining },
		});
		for (const client of clients) client?.socket?.send(payload);
	}

	setRoom(client: Client, game: Game) {
		const room = this.rooms.get(client);
		if (room) {
			if (room.clients[0] && room.clients[1])
				room.disconnectPlayer(client);
			else {
				room.pause();
				this.removeRoom(client);
			}
		}
		client.quit = false;
		this.rooms.set(client, game);
	}

	getRoom(client: Client) {
		return this.rooms.get(client);
	}

	removeRoom(client: Client) {
		console.log(`removed: ${client.name}`);
		const game = this.rooms.get(client);
		if (!game) return;
		try {
			game.pause();
		} catch {}
		this.rooms.delete(client);
		const countdown = this.countdowns.get(game);
		if (countdown) {
			countdown.cancelled = true;
			this.countdowns.delete(game);
		}
		const readyPhase = this.readyPhases.get(game);
		if (readyPhase) {
			readyPhase.cancelled = true;
			if (readyPhase.timer) {
				clearTimeout(readyPhase.timer);
			}
			this.readyPhases.delete(game);
		}
	}

	stop_offline(client: Client) {
		client.quit = true;
		this.removeRoom(client);
	}

	stop_online(client: Client) {
		client.quit = true;
		if (client.tournament) {
			const tournament = this.tournaments[client.tournament.tournamentId];
			if (!tournament) return;
			tournament.disconnect(client);
		} else {
			this.removeFromQueue(client);
			const room = this.getRoom(client);
			if (room) {
				const cd = this.countdowns.get(room);
				if (cd) {
					cd.cancelled = true;
					this.countdowns.delete(room);
				}
				const readyPhase = this.readyPhases.get(room);
				if (readyPhase) {
					readyPhase.cancelled = true;
					if (readyPhase.timer) {
						clearTimeout(readyPhase.timer);
					}
					this.readyPhases.delete(room);
				}
				room.disconnectPlayer(client);
			}
		}
	}

	playerReady(client: Client) {
		// Handle tournament ready
		if (client.tournament) {
			const t = this.tournaments[client.tournament.tournamentId];
			if (t) {
				if (this.getRoom(client)) return;
				t.playerReady(client);
			}
		}
		// Handle game ready phase
		this.markPlayerReady(client);
	}

	handleRejoin(client: Client) {
		if (!client.tournament) return;
		const t = this.tournaments[client.tournament.tournamentId];
		if (!t) return;
		client.quit = false;
		t.reconnect(client);
	}
}
