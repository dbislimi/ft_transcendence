import Game from "./Game";

class Node {
	id: number;
	parent?: Node;

	left?: Node;
	right?: Node;

	game?: Game;
	winner?: Node;

	constructor(id: number){
		this.id = id;
	}

	isLeaf() {
		return !this.left && !this.right;
	}
}

export default class Tournament {
	id: number;
	bracket: number;
	players: WebSocket[] = [];
	matches: Game[] = [];
	winners: Record<number, WebSocket> = {};
	root: Node | null = null;

	constructor(id: number, bracket: number) {
		this.id = id;
		this.bracket = bracket;
	}

	join(player: WebSocket){
		if (!this.players.includes(player))
			this.players.push(player);
	}

	quit(player: WebSocket){
		this.players = this.players.filter(ws => ws != player);
	}

	buildBracket(){
		if (this.players.length === 0){
			this.root = null;
			return ;
		}
		

	}

	startTournament(){

	}

}