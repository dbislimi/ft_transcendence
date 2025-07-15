import Board from "./Board.ts";
import Player from "./Player.ts";
import np from "./MyNumpy/MyNumpy.ts";
import * as fs from "fs";

const TRAINING: boolean = true;

export default interface BotController {
	update(player: Player, board: Board): void;
}
// alpha = learning_rate
// gamma = discount_factor
// epsilon = explo
export class EasyController implements BotController {
	private learning_rate: number;
	private discount_factor: number;
	private epsilon: number;
	private epsilon_decay: number;
	private epsilon_min: number;
	private qTable: number[][] = [[]];

	constructor(
		learning_rate = 0.1,
		discount_factor = 0.9,
		epsilon = 1,
		epsilon_decay = 0.00001,
		epsilon_min = 0.01
	) {
		this.learning_rate = learning_rate;
		this.discount_factor = discount_factor;
		this.epsilon = epsilon;
		this.epsilon_min = epsilon_min;
		this.epsilon_decay = epsilon_decay;
	}

	private epsilonGreedy() {
		this.epsilon = Math.max(
			this.epsilon_min,
			this.epsilon * (1 - this.epsilon_decay)
		);
	}
	private chooseAction(state: number) {
		if (!(state in this.qTable))
			this.qTable[state] = np.zeros(3) as number[];
		if (TRAINING && Math.random() < this.epsilon)
			return Math.floor(Math.random() * 3);
		return np.argmax(this.qTable[state]);
	}

	private updateQtable(state, action, reward, nextState) {
		if (!(nextState in this.qTable))
			this.qTable[nextState] = np.zeros(3) as number[];
		const maxFuturQ = np.max(this.qTable[nextState]);
		const currentQ = this.qTable[state][action];
		this.qTable[state][action] =
			currentQ +
			this.learning_rate *
				(reward + this.discount_factor * maxFuturQ - currentQ);
	}

	private save(episodes){
		fs.writeFileSync("qtable_easy.json", JSON.stringify(this.qTable, null, 2));
	}
	private load() {
		const raw = fs.readFileSync("qtable_easy.json", "utf-8");
		this.qTable = JSON.parse(raw);
	}
	update(player: Player, board: Board): void {}
}

//function initQtable(stateSize: number, actionSize: number) {
//	const [];
//}
