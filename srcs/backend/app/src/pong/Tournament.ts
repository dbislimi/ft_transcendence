import Game from "./Game.ts";
import type { Client } from "../plugins/gameController.ts";

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

	isLeaf() {
		return !this.left && !this.right;
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
	setRoom: (client: Client, game: Game) => void;
	password: string | undefined;
	nodeId: number = 0;
	onEnd: () => void;
	initialDepth?: number;
	private startCountdown: (
		game: Game,
		clients: (Client | undefined)[]
	) => void;

	constructor({
		rooms,
		id,
		capacity,
		password,
		onEnd,
		startCountdown,
		setRoom,
	}: {
		rooms: WeakMap<Client, Game>;
		id: string;
		capacity: number;
		password: string;
		onEnd: () => void;
		startCountdown: (game: Game, clients: (Client | undefined)[]) => void;
		setRoom: (client: Client, game: Game) => void;
	}) {
		this.rooms = rooms;
		this.password = password;
		this.id = id;
		this.capacity = capacity;
		this.onEnd = onEnd;
		this.startCountdown = startCountdown;
		this.setRoom = setRoom;
	}

	join(player: Client) {
		if (!this.players.includes(player)) this.players.push(player);
		player.socket?.send(JSON.stringify({ event: "searching" }));
		console.log("Joined tournament: ", this.id);
		console.log(`Nb of players: ${this.players.length}`);
		if (this.players.length === this.capacity) this.startTournament();
	}

	quitQueue(player: Client) {
		this.players = this.players.filter((p) => p !== player);
	}

	buildBracket() {
		if (this.players.length === 0) {
			this.root = null;
			return;
		}
		console.log("building nodes");
		let depth = Math.ceil(Math.log2(this.players.length));
		this.initialDepth = depth;
		let nodes: Node[] = this.players.map((p) => new Node({ p: p }));
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
			player.socket?.send(JSON.stringify({ event: "tournament_win" }));
			return;
		}
		if (parent.loser) {
			console.log("bye");
			parent.winner = player;
			this.joinMatch(parent);
			return;
		}
		console.log("start");
		if (parent.waiting) {
			parent.game = new Game({
				p1: parent.waiting,
				p2: player,
				onEnd: (client, didWin) => {
					console.log("game onEnd");
					this.rooms.delete(client);
					client.socket?.send(
						JSON.stringify({
							event: "result",
							body: { is: "tournament", didWin },
						})
					);
					if (didWin === true) {
						parent.winner = client;
						this.joinMatch(parent!);
					} else parent.loser = client;
				},
			});
			this.setRoom(player, parent.game);
			this.setRoom(parent.waiting, parent.game);
			this.startCountdown(parent.game, parent.game.clients);
			parent.waiting = undefined;
		} else {
			parent.waiting = player;
			if (
				parent.depth &&
				this.initialDepth &&
				parent.depth !== this.initialDepth
			)
				player.socket?.send(JSON.stringify({ event: "searching" }));
		}
	}
	init() {
		console.log(`leafs: ${this.leafs.length}`);
		for (const leaf of this.leafs) this.joinMatch(leaf);
	}

	startTournament() {
		this.buildBracket();
		this.started = true;
		this.init();
	}

	reconnect(client: Client) {
		const room: Game | undefined = this.rooms.get(client);
		if (!room) return;
		if (room.clients[0].socket && room.clients[1]?.socket) room.start();
	}
	disconnect(client: Client) {
		if (this.started === false) this.quitQueue(client);
		else {
			const game = this.rooms.get(client);
			if (!game) return;
			if (client.tournament?.allowReconnect) {
				client.tournament.allowReconnect = false;
				game.pause();
				const opp = game.getOpp(client);
				opp?.socket?.send(JSON.stringify({ event: "waiting" }));
			} else {
				game.disconnectPlayer(client);
				client.tournament = undefined;
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
}
