import Board from "./Board.ts";
import Player from "./Player.ts";
import np from "./MyNumpy/MyNumpy.ts";
import * as fs from "fs";

//export default interface BotController {
//	update(player: Player, board: Board): void;
//}
//// alpha = learning_rate
// gamma = discount_factor
// epsilon = explo
export default class BotController {
	private training: boolean;
	private learning_rate: number;
	private discount_factor: number;
	private epsilon: number;
	private epsilon_decay: number;
	private epsilon_min: number;
	private qTable: number[][] = [[]];
	rewards: number[] = [];
	private lastState: number | null = null;
	private lastAction: number | null = null;
	private start: number;

	constructor( options: {
		learning_rate?: number,
		discount_factor?: number,
		epsilon?: number,
		epsilon_decay?: number,
		epsilon_min?: number,
		training?: boolean
	} = {} ) {
		const {
			learning_rate = 0.1,
			discount_factor = 0.9,
			epsilon = 1,
			epsilon_decay = 0.00001,
			epsilon_min = 0.01,
			training = false
			} = options;
		this.start = Date.now();
		this.training = training;
		this.learning_rate = learning_rate;
		this.discount_factor = discount_factor;
		this.epsilon = epsilon;
		this.epsilon_min = epsilon_min;
		this.epsilon_decay = epsilon_decay;
		if (training === false)
			this.load();
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
		if (this.training && Math.random() < this.epsilon){
			this.epsilonGreedy();
			return Math.floor(Math.random() * 3);
		}
		return np.argmax(this.qTable[state]);
	}

	private updateQtable(state: number, action: number, reward: number, nextState: number) {
		if (!(nextState in this.qTable))
			this.qTable[nextState] = np.zeros(3) as number[];
		const maxFuturQ = np.max(this.qTable[nextState]);
		const currentQ = this.qTable[state][action];
		this.qTable[state][action] =
			currentQ +
			this.learning_rate *
				(reward + this.discount_factor * maxFuturQ - currentQ);
	}

	public save(episode: number){
		fs.writeFileSync(`../qtable_saves/qtable_easy_episode_${episode}.json`, JSON.stringify(this.qTable, null, 2), 'utf-8');
	}

	private load() {
		const raw = fs.readFileSync("qtable_easy.json", "utf-8");
		this.qTable = JSON.parse(raw);
	}

	update(player: Player, board: Board): number {
		let reward = 0;
		const timestamp = Date.now();
		//console.log("time: ", timestamp - this.start);
		const state = board.getState(player.id);
		if (this.training && this.lastState !== null && this.lastAction !== null){
			reward = board.getReward(player.id);
			this.updateQtable(this.lastState, this.lastAction, reward, state);
		}
		const action = this.chooseAction(state);
		this.lastAction = action;
		this.lastState = state;
		switch (action){
			case 0:
				player.moveUp(true);
				player.moveDown(false);
				break;
			case 1:
				player.moveUp(false);
				player.moveDown(false);
				break;
			case 2:
				player.moveUp(false);
				player.moveDown(true);
				break;
		}
		return (reward);
	}
}

