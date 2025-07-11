import Board from "./Board.ts";
import Player from "./Player.ts";

export default interface BotController {
	update(player: Player, board: Board): void;
}

export class EasyController implements BotController {
	update(player: Player, board: Board): void {

	}
}



function initQtable(stateSize: number, actionSize: number){
	const []
}