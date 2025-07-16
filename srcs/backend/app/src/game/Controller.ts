import Board from "./Board.ts";
import Player from "./Player.ts";
import np from "./MyNumpy/MyNumpy.ts";
import * as fs from "fs";
import {CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement} from 'chart.js';
import {Canvas} from '@napi-rs/canvas';
import { brotliCompress } from "zlib";
Chart.register([
		CategoryScale,
		LineController,
		LineElement,
		LinearScale,
		PointElement
		]);

export default interface BotController {
	update(player: Player, board: Board): void;
}
// alpha = learning_rate
// gamma = discount_factor
// epsilon = explo
export class EasyController implements BotController {
	private training: boolean;
	private learning_rate: number;
	private discount_factor: number;
	private epsilon: number;
	private epsilon_decay: number;
	private epsilon_min: number;
	private qTable: number[][] = [[]];
	private rewards: number[] = [];
	private lastState: number | null = null;
	private lastAction: number | null = null;

	constructor(
		learning_rate = 0.1,
		discount_factor = 0.9,
		epsilon = 1,
		epsilon_decay = 0.00001,
		epsilon_min = 0.01,
		training = false
	) {
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
		fs.writeFileSync(`qtable_easy_episode_${episode}.json`, JSON.stringify(this.qTable, null, 2));
	}
	private load() {
		const raw = fs.readFileSync("qtable_easy.json", "utf-8");
		this.qTable = JSON.parse(raw);
	}

	
	update(player: Player, board: Board): void {
		const state = board.getState(player.id);
		if (this.lastState !== null && this.lastAction !== null){
			const reward = board.getReward(player.id);
			this.rewards.push(reward);
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
			case 2:
				player.moveUp(false);
				player.moveDown(true);
				break;
			default:
				break;
		}

	}
}

