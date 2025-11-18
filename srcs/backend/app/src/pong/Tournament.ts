import Game from "./Game.ts";
import type { Client } from "../plugins/websockets.ts";

class Node {
	game?: Game;
	gameId?: number;
	parent?: Node;
	right?: Node;
	left?: Node;
	waiting?: Client;
	winner?: Client;
	loser?: Client;

	depth?: number;
	bracketId?: number;

	constructor(N: {
		p?: Client;
		left?: Node;
		right?: Node;
		depth?: number;
		id?: number;
	}) {
		if (N === undefined) return;
		this.winner = N.p;
		this.left = N.left;
		this.right = N.right;
		this.depth = N.depth;
		this.bracketId = N.id;
	}
}

export default class Tournament {
	id: string;
	started: boolean = false;
	capacity: number;
	players: Client[] = [];
	leafs: Node[] = [];
	root: Node | null = null;
	rooms: WeakMap<Client, Game>;
	private gameNode: WeakMap<Game, Node> = new WeakMap();
	private clientNode: WeakMap<Client, Node> = new WeakMap();
	setRoom: (client: Client, game: Game) => void;
	password: string | undefined;
	nodeId: number = 0;
	onEnd: () => void;
	initialDepth?: number;
	private startCountdown: (
		game: Game,
		clients: (Client | undefined)[]
	) => void;

	private cancelCountdown: (game: Game) => void;
	private fastify: any;

	constructor({
		rooms,
		id,
		capacity,
		password,
		onEnd,
		startCountdown,
		cancelCountdown,
		setRoom,
		fastify,
	}: {
		rooms: WeakMap<Client, Game>;
		id: string;
		capacity: number;
		password: string;
		onEnd: () => void;
		startCountdown: (game: Game, clients: (Client | undefined)[]) => void;
		cancelCountdown: (game: Game) => void;
		setRoom: (client: Client, game: Game) => void;
		fastify?: any;
	}) {
		this.rooms = rooms;
		this.password = password;
		this.id = id;
		this.capacity = capacity;
		this.onEnd = onEnd;
		this.startCountdown = startCountdown;
		this.cancelCountdown = cancelCountdown;
		this.setRoom = setRoom;
		this.fastify = fastify;
	}

	private sendRejoinPrompt(client: Client, timeout: number = 10) {
		client.socket?.send(
			JSON.stringify({
				event: "tournament_rejoin_prompt",
				to: "tournament_rejoin_prompt",
				body: { tournamentId: this.id, timeout },
			})
		);
	}

	private scheduleRejoinTimeout(
		client: Client,
		durationMs: number,
		onTimeout: () => void
	) {
		if (client.rejoinTimer) clearTimeout(client.rejoinTimer);
		client.rejoinTimer = setTimeout(() => {
			client.rejoinTimer = undefined;
			onTimeout();
		}, durationMs);
	}

	private forfeit(parent: Node | undefined, quitter: Client) {
		if (!parent) return;
		if (parent.winner) return;
		if (parent.waiting && parent.waiting !== quitter) {
			const winner = parent.waiting;
			parent.loser = quitter;
			parent.winner = winner;
			parent.waiting = undefined;
			this.notifyRoundWinAndAdvance(winner, parent);
		} else {
			if (!parent.loser) {
				parent.loser = quitter;
				return;
			}
			if (parent.loser !== quitter) {
				parent.winner = quitter;
				parent.waiting = undefined;
				this.notifyRoundWinAndAdvance(quitter, parent);
			}
		}
	}

	private notifyRoundWinAndAdvance(
		winner: Client,
		parent: Node,
		scores: number[] = [0, 0]
	) {
		const game = this.rooms.get(winner);
		if (game && game.clients[1] === undefined)
			game.disconnectPlayer(winner);
		const depth = parent.depth;
		const loserName = parent.loser?.name;
		this.clientNode.set(winner, parent);
		winner.socket?.send(
			JSON.stringify({
				event: "result",
				to: "pong",
				body: {
					is: "tournament",
					didWin: true,
					scores,
					...(loserName ? { opponent: loserName } : {}),
					...(depth !== undefined ? { tournamentDepth: depth } : {}),
				},
			})
		);
		const delay = depth !== undefined && depth === 1 ? 0 : 15000;
		if (winner.winnerTimer) clearTimeout(winner.winnerTimer);
		winner.winnerTimer = setTimeout(() => {
			if (parent.winner === winner) {
				winner.winnerTimer = undefined;
				this.joinMatch(parent);
			}
		}, delay);
	}

	join(player: Client) {
		if (!this.players.includes(player)) this.players.push(player);
		player.socket?.send(JSON.stringify({ event: "searching", to: "pong" }));
		console.log("Joined tournament: ", this.id);
		console.log(`Nb of players: ${this.players.length}`);
		if (this.players.length === this.capacity) this.startTournament();
	}

	private removePlayer(player: Client) {
		player.tournament = undefined;
		this.players = this.players.filter((p) => p !== player);
		console.log(`nb of players: ${this.players.length}`);
		if (this.players.length === 0) this.onEnd();
	}

	buildBracket() {
		if (this.players.length === 0) {
			this.root = null;
			return;
		}
		console.log("building nodes");
		let depth = Math.ceil(Math.log2(this.players.length));
		this.initialDepth = depth;
		let nodes: Node[] = this.players.map((p, idx) => {
			const n = new Node({ p: p });
			this.clientNode.set(p, n);
			return n;
		});
		this.leafs = nodes;
		while (nodes.length > 1) {
			let nextRound: Node[] = [];
			for (let i = 0; i < nodes.length; i += 2) {
				const right = nodes[i]!;
				const left = nodes[i + 1]!;
				const parent = new Node({
					right: right,
					left: left,
					depth: depth,
					id: this.nodeId++,
				});
				left.parent = parent;
				right.parent = parent;
				nextRound.push(parent);
			}
			nodes = nextRound;
			--depth;
		}
		this.root = nodes[0] ?? null;
		this.printTree();
	}

	joinMatch(node: Node) {
		const parent = node.parent;
		const player = node.winner;
		console.log("joinMatch called");
		console.log(
			`depth: ${node.depth}, id: ${node.bracketId} TO depth: ${parent?.depth}, id: ${parent?.bracketId}`
		);
		if (!player) return;

		if (!parent) {
			console.log("tournament winner");

			if (this.fastify && player) {
				this.fastify
					.incrementTournamentsWon(player.id)
					.catch((error: any) => {
						console.error(
							"Erreur lors de l'incrémentation des tournois gagnés:",
							error
						);
					});
			}

			if (player) this.removePlayer(player);
			return;
		}
		if (parent.loser) {
			console.log(player.name, " passing by bye");
			if (!parent.winner) {
				parent.winner = player;
				this.notifyRoundWinAndAdvance(player, parent);
			}
			return;
		}
		console.log("start");
		if (parent.waiting) {
			const waitingPlayer = parent.waiting;
			const currentPlayer = player;
			const parentNode = parent;

			parent.game = new Game({
				p1: waitingPlayer,
				p2: currentPlayer,
				onEnd: async (client, didWin, scores) => {
					console.log("game onEnd");

					const opponent =
						client === waitingPlayer
							? currentPlayer
							: waitingPlayer;
					const winner = didWin ? client : opponent;
					const finalScores = scores || [0, 0];

					if (!client.quit) {
						const depth = parentNode.depth;
						const opponentName =
							parentNode.game?.getOpp(client)?.name;
						client.socket?.send(
							JSON.stringify({
								event: "result",
								to: "pong",
								body: {
									is: "tournament",
									didWin,
									scores: finalScores,
									...(opponentName
										? { opponent: opponentName }
										: {}),
									...(depth !== undefined
										? { tournamentDepth: depth }
										: {}),
								},
							})
						);
					}
					// AJOUT: Sauvegarde du match de tournoi
					try {
						await this.saveTournamentMatch(
							waitingPlayer,
							currentPlayer,
							winner,
							finalScores
						);
					} catch (error) {
						console.error("Error saving tournament match:", error);
					}

					this.rooms.delete(client);
					if (didWin === true) {
						parentNode.winner = client;
						const depth = parentNode.depth;
						const delay =
							depth !== undefined && depth === 1 ? 0 : 15000;
						if (client.winnerTimer)
							clearTimeout(client.winnerTimer);
						client.winnerTimer = setTimeout(() => {
							if (parentNode.winner === client) {
								client.winnerTimer = undefined;
								this.joinMatch(parentNode!);
							}
						}, delay);
					} else {
						parentNode.loser = client;
						this.removePlayer(client);
					}
				},
			});
			this.gameNode.set(parent.game, parent);
			this.clientNode.set(waitingPlayer!, parent);
			this.clientNode.set(currentPlayer, parent);
			this.setRoom(currentPlayer, parent.game);
			this.setRoom(waitingPlayer, parent.game);
			this.startCountdown(parent.game, parent.game.clients);
			parent.waiting = undefined;
		} else {
			parent.waiting = player;
			if (
				parent.depth &&
				this.initialDepth &&
				parent.depth !== this.initialDepth
			)
				player.socket?.send(
					JSON.stringify({
						event: "searching",
						to: "pong",
						body:
							parent.depth !== undefined
								? { tournamentDepth: parent.depth }
								: undefined,
					})
				);
		}
	}

	getRoundContextForGame(game: Game): { depth: number } | undefined {
		const node = this.gameNode.get(game);
		if (!node) return undefined;
		const depth = node.depth;
		if (depth !== undefined) return { depth };
		return undefined;
	}
	init() {
		console.log(`leafs: ${this.leafs.length}`);
		for (const leaf of this.leafs) this.joinMatch(leaf);
	}

	startTournament() {
		this.started = true;
		this.buildBracket();
		this.init();
	}

	reconnect(client: Client) {
		const room: Game | undefined = this.rooms.get(client);
		const node = this.clientNode.get(client);

		if (room) {
			if (room.clients[0].socket && room.clients[1]?.socket) {
				this.startCountdown(room, room.clients);
				client.socket?.send(JSON.stringify(room.getData()));
			}
			return;
		}
		if (node) this.joinMatch(node);
	}
	disconnect(client: Client) {
		if (this.started === false) this.removePlayer(client);
		else {
			const game = this.rooms.get(client);
			// quit while in game
			if (game) {
				this.cancelCountdown(game);
				if (client.tournament?.allowReconnect) {
					client.tournament.allowReconnect = false;
					this.sendRejoinPrompt(client);
					game.pause();
					const opp = game.getOpp(client);
					opp?.socket?.send(
						JSON.stringify({
							event: "waiting",
							to: "pong",
							who: client.name,
						})
					);
					this.scheduleRejoinTimeout(client, 10000, () => {
						game.disconnectPlayer(client);
						this.removePlayer(client);
					});
				} else {
					game.disconnectPlayer(client);
					this.removePlayer(client);
				}
				return;
			}

			// quit while between games
			const node = this.clientNode.get(client);
			const parent = node?.parent;
			if (parent && parent.waiting === client) parent.waiting = undefined;
			if (!parent) {
				this.removePlayer(client);
				console.log("Tournament cleaned up after final disconnect");
				return;
			}
			if (client.winnerTimer) {
				clearTimeout(client.winnerTimer);
				client.winnerTimer = undefined;
			}
			if (client.tournament?.allowReconnect) {
				client.tournament.allowReconnect = false;
				this.sendRejoinPrompt(client);
				this.scheduleRejoinTimeout(client, 10000, () => {
					this.forfeit(parent, client);
					this.removePlayer(client);
				});
			} else {
				this.forfeit(parent, client);
				this.removePlayer(client);
			}
		}
		console.log(`nb of players: ${this.players.length}`);
		if (this.players.length === 0) this.onEnd();
	}

	printTree(root: Node | null = this.root) {
		if (!root) {
			console.log("(arbre vide)");
			return;
		}
		const label = (n: Node) => {
			const type = !n.left && !n.right ? "P" : "N"; // P = feuille (player), N = noeud interne
			const id = n.bracketId !== undefined ? `#${n.bracketId}` : "";
			const depth = n.depth !== undefined ? ` d${n.depth}` : "";
			return `${type}${id}${depth}`;
		};
		const traverse = (
			n: Node | undefined,
			prefix: string,
			isLeft: boolean
		) => {
			if (!n) return;
			if (n.right)
				traverse(n.right, prefix + (isLeft ? "│   " : "    "), false);
			console.log(prefix + (isLeft ? "└── " : "┌── ") + label(n));
			if (n.left)
				traverse(n.left, prefix + (isLeft ? "    " : "│   "), true);
		};
		traverse(root, "", true);
	}
	isEmpty() {
		return this.players.length === 0;
	}

	playerReady(client: Client) {
		if (!this.root) return;
		const node = this.clientNode.get(client);
		if (node && node.parent?.waiting !== client) this.joinMatch(node);
	}

	private async saveTournamentMatch(
		player1: Client,
		player2: Client,
		winner: Client,
		scores: number[]
	) {
		if (!this.fastify) {
			console.log(
				"Warning: No fastify instance available for saving tournament match"
			);
			return;
		}

		try {
			console.log(
				`Saving tournament match: ${player1.name} (ID:${player1.id}) vs ${player2.name} (ID:${player2.id}), Winner: ${winner.name} (ID:${winner.id})`
			);

			await this.fastify.saveMatch(
				player1.id,
				player2.id,
				winner.id,
				scores,
				undefined,
				"tournament"
			);

			console.log(
				`Tournament match saved: ${player1.name} vs ${player2.name}, Winner: ${winner.name}`
			);
		} catch (error) {
			console.error("Error saving tournament match:", error);
		}
	}
}
