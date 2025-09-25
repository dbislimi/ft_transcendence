import Game from "./Game.ts";
import WebSocket from "ws";

type Player = WebSocket;

class Node {
	game?: Game;
	gameId?: number;
	parent?: Node;
	right?: Node;
	left?: Node;
	winner?: Player;

	depth?: number;
	bracketId?: number;

	constructor(N: {
		p?: Player;
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

	// isLeaf() {
	// 	return !this.left && !this.right;
	// }
}

export default class Tournament {
	id: string;
	started: boolean = false;
	bracket: number;
	players: WebSocket[] = [];
	root: Node | null = null;
	rooms: WeakMap<WebSocket, Game>;
	password: string | undefined;
	depth: number = 0;
	constructor({
		rooms,
		id,
		bracket,
		password,
	}: {
		rooms: WeakMap<WebSocket, Game>;
		id: string;
		bracket: number;
		password: string;
	}) {
		this.rooms = rooms;
		this.password = password;
		this.id = id;
		this.bracket = bracket;
	}

	join(player: WebSocket) {
		if (!this.players.includes(player)) this.players.push(player);
		console.log("Joined tournament: ", this.id);
		console.log(`Nb of players: ${this.players.length}`);
		if (this.players.length === this.bracket) {
			this.buildBracket();
			this.init(this.root!);
		}
	}

	quitQueue(player: WebSocket) {
		this.players = this.players.filter((ws) => ws !== player);
	}

	buildBracket() {
		if (this.players.length === 0) {
			this.root = null;
			return;
		}
		console.log("building nodes");
		let nodes: Node[] = this.players.map((p) => new Node({ p: p }));
		while (nodes.length > 1) {
			let nextRound: Node[] = [];
			for (let i = 0; i < nodes.length; i += 2) {
				const right = nodes[i];
				const left = nodes[i + 1];
				const parent = new Node({
					right: right,
					left: left,
					depth: this.bracket,
					id: i / 2,
				});
				left.parent = parent;
				right.parent = parent;
				nextRound.push(parent);
			}
			nodes = nextRound;
			--this.bracket;
		}
		this.root = nodes[0];
		this.printTree();
	}

	joinMatch(node: Node) {
		if (!node?.parent || !node?.winner) return;
		this.rooms.delete(node.winner);
		if (node.parent.game) node.parent.game.connectPlayer(node.winner);
		else {
			node.parent.game = new Game({
				p1: node.winner,
				botDiff: "medium",
				onEnd: (ws) => {
					node.parent!.winner = ws;
					this.joinMatch(node.parent!);
				},
			});
			node.parent.game.start();
		}
		this.rooms.set(node.winner, node.parent.game);
	}
	init(node: Node | undefined) {
		if (!node) return;
		this.init(node?.right);
		this.init(node?.left);
		this.joinMatch(node);
	}

	startTournament() {
		this.started = true;
		this.init(this.root!);
	}

	// Affiche l'arbre binaire de façon visuelle dans la console
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
