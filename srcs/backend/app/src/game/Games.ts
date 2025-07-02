import { v4 as uuidv4 } from "uuid";
import Game from "./Game";

export class Games {
	private solo: Record<string, Game> = {};
	private online: Record<string, Game | null> = {};
	private isSearching: boolean = false;
	private wsWaiting: WebSocket[] = [];

	startOnline() {
		if (this.isSearching === false) {
			const uid = uuidv4();
			this.online[uid] = null;
			this.isSearching = true;
		}
		else {
			const room = Object.keys(this.online).find(key => this.online[key] === null);
			if (room) this.online[room] = new Game();
		}
	}
}
