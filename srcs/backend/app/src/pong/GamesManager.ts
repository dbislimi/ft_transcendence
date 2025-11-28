import Game from "./Game.ts";
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
			timer: NodeJS.Timeout | null;
			remaining: number;
		}
	> = new WeakMap();
	private invitManager: InvitManager;
	private savedGames: WeakSet<Game> = new WeakSet();
	private static readonly COUNTDOWN_SECONDS = 3;
	private static readonly READY_PHASE_SECONDS = 30;
	private fastify: any;
	private onAbort: (() => void) | undefined;

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
			console.warn(
				"Fastify instance not available for saving game result"
			);
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
				this.startInvitedGame(
					inv.sent,
					inv.receiv,
					inv.id,
					inv.options
				);
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
				break;
			}
		}
	}

	createTournament(
		client: Client,
		id: string,
		size: number,
		passwd: string,
		options?: {
			bonusNb?: number;
			bonusTypes?: string[];
			playerSpeed?: number;
		}
	): boolean {
		if (this.tournaments[id]) {
			client.socket?.send(
				JSON.stringify({
					event: "error",
					to: "pong",
					msg: "tournamentId",
				})
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
				this.startWithReadyPhase(game, clients, "tournament"),
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
			setRoom: (client, game) => this.setRoom(client, game),
			fastify: this.fastify,
			options,
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
		this.invitManager.removeForClient(client);
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
	async trainBot(ws: any, bot: difficulty, games: number) {
		const controller = new AbortController();
		const { signal } = controller;
		this.onAbort = () => controller.abort();
		ws.on("close", this.onAbort);
		const trainingClient: Client = { id: -1, name: "trainer", socket: ws };
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
				if (signal.aborted)
					console.log("Training aborted during game ", i);
				break;
			}
		}
		if (game.board.botController[0] !== undefined)
			plotRewards(
				"rewards",
				game.board.botController[0].rewards,
				game.board.botController[0].type
			);
		console.log("Training loop ended.");
		const totalSeconds = Math.floor(game.elaspedTime);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		console.log(`Training time: ${hours}h${minutes}min${seconds}sec`);
	}
	startTraining(ws: any, bot: difficulty) {
		this.trainBot(ws, bot, 100);
		console.log("debug");
		return { playerId: "train" };
	}
	startOffline(
		client: Client,
		diff: difficulty | null,
		options?: {
			bonusNb?: number;
			bonusTypes?: string[];
			playerSpeed?: number;
		}
	): boolean {
		const game = new Game({
			p1: client,
			botDiff: diff,
			onEnd: (c: Client, didWin: boolean, scores: number[]) => {
				if (!c.quit) {
					c.socket?.send(
						JSON.stringify({
							event: "result",
							to: "pong",
							body: {
								is: "offline",
								didWin,
								scores,
							},
						})
					);
				}
				if (diff !== null && !this.savedGames.has(game)) {
					const winnerId = didWin ? c.id : -1;
					console.log(
						`Saving bot match: ${
							c.name
						} vs Bot (${diff}), Winner: ${
							didWin ? c.name : `Bot (${diff})`
						}`
					);
					this.saveGameResult(
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
			},
			options,
		});
		this.setRoom(client, game);
		game.start();
		return diff === null;
	}

	invite(
		client: Client,
		friend: Client,
		options?: {
			bonusNb?: number;
			bonusTypes?: string[];
			playerSpeed?: number;
		}
	) {
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
		this.invitManager.create(client, friend, options);
	}

	doInvitationAction(
		action: "accept" | "decline" | "cancel",
		client: Client,
		invitationId: string
	) {
		this.invitManager.do(action, client, invitationId);
	}

	private startInvitedGame(
		sent: Client,
		receiv: Client,
		invitationId?: string,
		options?: {
			bonusNb?: number;
			bonusTypes?: string[];
			playerSpeed?: number;
		}
	) {
		const onEnd = (c: Client, didWin: boolean, scores: number[]) => {
			const winner = didWin ? c : (c === sent ? receiv : sent);

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
			this.saveGameResult( sent, receiv, winner, scores, undefined, "quick");
			this.removeRoom(c);
		};
		this.invitManager.removeForClient(sent);
		this.invitManager.removeForClient(receiv);
		const game = new Game({ p1: sent, p2: receiv, onEnd, options });
		this.setRoom(sent, game);
		this.setRoom(receiv, game);
		this.wsSend(sent, {
			event: "invitation_game_found",
			to: "invitation_events",
			body: { opponent: receiv.name, invitationId },
		});
		this.wsSend(receiv, {
			event: "invitation_game_found",
			to: "invitation_events",
			body: { opponent: sent.name },
		});
		this.startWithReadyPhase(game, [sent, receiv], "invite");
	}
	startOnline(client: Client) {
		this.invitManager.removeForClient(client);
		if (this.waitingClient && this.waitingClient !== client) {
			const opponent = this.waitingClient;
			this.waitingClient = null;
			this.invitManager.removeForClient(opponent);
			const onEnd = (c: Client, didWin: boolean, scores: number[]) => {
				const winner = didWin ? c : c === opponent ? client : opponent;
				console.log(
					`OnEnd called: ${c.name} (didWin: ${didWin}), Winner: ${winner.name}`
				);

				if (!c.quit) {
					c.socket?.send(
						JSON.stringify({
							event: "result",
							to: "pong",
							body: {
								is: "quick",
								didWin,
								scores,
								opponent:
									this.getRoom(c)?.getOpp(c)?.name ?? null,
							},
						})
					);
				}
				this.saveGameResult(
					opponent,
					client,
					winner,
					scores,
					undefined,
					"quick"
				);
				this.removeRoom(c);
			};
			const game = new Game({
				p1: opponent,
				p2: client,
				onEnd,
			});
			this.setRoom(opponent, game);
			this.setRoom(client, game);
			this.startWithReadyPhase(game, [opponent, client], "quick");
			return;
		}
		client.socket?.send(JSON.stringify({ event: "searching", to: "pong" }));
		this.waitingClient = client;
	}
	removeFromQueue(client: Client) {
		if (this.waitingClient && client === this.waitingClient) {
			console.log("waiting client removed");
			this.waitingClient = null;
		}
	}
	private broadcastPlayersInfo(
		game: Game,
		clients: (Client | undefined)[],
		sessionType: string
	) {
		const anyClient = clients.find((c) => !!c);
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
			const opponentPaddleColor =
				game.getOpp(client)?.cosmetics?.paddleColor ?? "#ffffff";
			client.socket.send(
				JSON.stringify({
					event: "game_session_ready",
					to: "game_session",
					body: {
						sessionId: `${game.clients[0]?.id ?? ""}:${
							game.clients[1]?.id ?? ""
						}`,
						sessionType,
						opponentPaddleColor,
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
			const opponentClient = clients[1 - client.inGameId];
			client.socket.send(
				JSON.stringify({
					event: "ready_phase",
					to: "pong",
					body: {
						remaining,
						selfReady,
						opponentReady,
						opponentName: opponentClient?.name || "Opponent",
					},
				})
			);
		}
	}

	private async startWithReadyPhase(
		game: Game,
		clients: (Client | undefined)[],
		sessionType: string
	) {
		const readyState = {
			p1Ready: false,
			p2Ready: false,
			cancelled: false,
			timer: null as NodeJS.Timeout | null,
			remaining: GamesManager.READY_PHASE_SECONDS,
		};
		this.readyPhases.set(game, readyState);
		this.broadcastPlayersInfo(game, clients, sessionType);
		const checkInterval = 1000;
		const checkReady = async () => {
			while (readyState.remaining > 0) {
				if (readyState.cancelled) {
					this.readyPhases.delete(game);
					return;
				}
				if (readyState.p1Ready && readyState.p2Ready) {
					this.readyPhases.delete(game);
					await this.startWithCountdown(game, clients);
					return;
				}
				this.broadcastReadyPhase(
					game,
					clients,
					readyState.remaining,
					readyState.p1Ready,
					readyState.p2Ready
				);

				await new Promise((resolve) =>
					setTimeout(resolve, checkInterval)
				);
				readyState.remaining -= 1;
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
			readyState.remaining,
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
		for (let remaining = seconds; remaining > 0; remaining--) {
			if (entry.cancelled) {
				this.countdowns.delete(game);
				return;
			}
			this.broadcastCountdown(clients, remaining);
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		if (entry.cancelled) {
			this.countdowns.delete(game);
			return;
		}
		this.broadcastCountdown(clients, 0);
		this.countdowns.delete(game);
		game.start();
	}
	private broadcastCountdown(
		clients: (Client | undefined)[],
		remaining: number
	) {
		const payload = JSON.stringify({
			event: "countdown",
			to: "pong",
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
			this.removeRoom(client);
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
		if (!client.tournament) return;
		const t = this.tournaments[client.tournament.tournamentId];
		if (!t) return;
		if (this.getRoom(client)) return;
		t.playerReady(client);
	}

	handleRejoin(client: Client) {
		if (!client.tournament) return;
		const t = this.tournaments[client.tournament.tournamentId];
		if (!t) return;
		client.quit = false;
		t.reconnect(client);
	}
}
