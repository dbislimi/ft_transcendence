import Game from "./Game";
import WebSocket from "ws";

export class Games {
	//private solo: Record<string, Game> = {};
	private rooms: Record<number, Game> = {};
	private wsWaiting: WebSocket[] = [];
	private nb: number = 0;

	startOnline(ws: WebSocket): {playerId: 0 | 1, gameId: number} {
		ws.send(JSON.stringify({event: 'searching'}));
		const gameId: number = this.nb;
		if (this.wsWaiting.length === 0) {
			this.wsWaiting.push(ws);
			return {playerId: 0, gameId: gameId};
		}
		else if (this.wsWaiting.length){
			const player: WebSocket | undefined = this.wsWaiting.shift();
			if (player)
				this.rooms[this.nb++] = new Game(player, ws);
		}
		return {playerId: 1, gameId: gameId};
	}

	getRoom(id: number){
		return this.rooms[id];
	}
	removeRoom(id: number){
		delete this.rooms[id];
	}
}
