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

	constructor(N: { p?: Player; left?: Node; right?: Node }) {
		if (N === undefined) return;
		if (N.p) this.winner = N.p;
		if (N.left) this.left = N.left;
		if (N.right) this.right = N.right;
	}

	// isLeaf() {
	// 	return !this.left && !this.right;
	// }
}

export default class Tournament {
	id?: string | null;
	started: boolean = false;
	bracket: number;
	players: WebSocket[] = [];
	root: Node | null = null;
	rooms: Map<WebSocket, Game> = new Map();
	password: string | undefined;

	constructor({
		id,
		bracket,
		password,
	}: {
		id: string;
		bracket: number;
		password?: string;
	}) {
		this.password = password;
		this.id = id;
		this.bracket = bracket;
	}

	join(player: WebSocket) {
		if (!this.players.includes(player)) this.players.push(player);
	}

	quit(player: WebSocket) {
		this.players = this.players.filter((ws) => ws != player);
	}

	buildBracket() {
		if (this.players.length === 0) {
			this.root = null;
			return;
		}

		let nodes: Node[] = this.players.map((p) => new Node({ p: p }));
		while (nodes.length > 1) {
			let nextRound: Node[] = [];
			for (let i = 0; i < nodes.length; i += 2) {
				const right = nodes[i];
				const left = nodes[i + 1];
				const parent = new Node({ right: right, left: left });
				left.parent = parent;
				right.parent = parent;
				nextRound.push(parent);
			}
			nodes = nextRound;
		}
		this.root = nodes[0];
	}

	update(node: Node | undefined) {
		if (!node) return;
		this.update(node?.right);
		this.update(node?.left);
		if (!node?.parent || !node?.winner) return;
		node.game = undefined;
		if (node.parent.game) node.parent.game.connectPlayer(node.winner);
		else
			node.parent.game = new Game({ p1: node.winner, botDiff: "medium" });
		this.rooms.set(node.winner, node.parent.game);
	}

	startTournament() {
		this.started = true;
		this.update(this.root!);
	}
	getId() {}
}
