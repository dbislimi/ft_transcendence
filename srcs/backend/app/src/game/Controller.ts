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
export default abstract class BotController {
	protected training: boolean;
	protected learning_rate: number;
	protected discount_factor: number;
	protected epsilon: number;
	protected epsilon_decay: number;
	protected epsilon_min: number;
	protected qTable: { [state: number]: number[] } = {};
	reward: number = 0;
	rewards: number[] = [];
	protected lastState: number | null = null;
	protected lastAction: number | null = null;
	protected start: number;
	aiLag: number = 0;
	protected scores: [number, number] = [0, 0];
	abstract nbOfActions: number;

	constructor(
		options: {
			learning_rate?: number;
			discount_factor?: number;
			epsilon?: number;
			epsilon_decay?: number;
			epsilon_min?: number;
			training?: boolean;
		} = {}
	) {
		const {
			learning_rate = 0.1,
			discount_factor = 0.9,
			epsilon = 1,
			epsilon_decay = 0.00001,
			epsilon_min = 0.01,
			training = false,
		} = options;
		this.start = Date.now();
		this.training = training;
		this.learning_rate = learning_rate;
		this.discount_factor = discount_factor;
		this.epsilon = epsilon;
		this.epsilon_min = epsilon_min;
		this.epsilon_decay = epsilon_decay;
		if (training === false) this.load();
	}

	private epsilonGreedy() {
		this.epsilon = Math.max(
			this.epsilon_min,
			this.epsilon * (1 - this.epsilon_decay)
		);
	}
	protected chooseAction(state: number) {
		if (!(state in this.qTable))
			this.qTable[state] = Array(this.nbOfActions).fill(0);
		if (this.training && Math.random() < this.epsilon) {
			this.epsilonGreedy();
			return Math.floor(Math.random() * this.nbOfActions);
		}
		return np.argmax(this.qTable[state]);
	}

	protected updateQtable(
		state: number,
		action: number,
		reward: number,
		nextState: number
	) {
		if (!(nextState in this.qTable))
			this.qTable[nextState] = Array(this.nbOfActions).fill(0);
		const maxFuturQ = np.max(this.qTable[nextState]);
		const currentQ = this.qTable[state][action];
		this.qTable[state][action] =
			currentQ +
			this.learning_rate *
				(reward + this.discount_factor * maxFuturQ - currentQ);
	}

	public save(episode: number) {
		fs.writeFileSync(
			`../AI/qtable_saves/qtable_easy_episode_${episode}.json`,
			JSON.stringify(this.qTable, null, 2),
			"utf-8"
		);
	}

	private load() {
		try {
			const raw = fs.readFileSync("qtable_easy.json", "utf-8");
			this.qTable = JSON.parse(raw);
		} catch (error) {
			console.log(error);
		}
	}
	newEpisode() {
		this.rewards.push(this.reward);
		this.reward = 0;
		this.scores = [0, 0];
	}
	abstract takeDecision(player: Player, board: Board): void;
	abstract update(player: Player, dt: number): void;
	abstract rewardsPolicy(board: Board, id: number): number;
}

export class EasyBot extends BotController {
	action!: number;
	timeAction: number = 0;
	nbOfActions: number = 5;
	readAction(n: number) {
		if (n === 0) {
			this.action = 0;
			this.timeAction = 0.5;
		} else if (n === 1) {
			this.action = 0;
			this.timeAction = 0.2;
		} else if (n === 2) {
			this.action = 1;
			this.timeAction = 0;
		} else if (n === 3) {
			this.action = 2;
			this.timeAction = 0.2;
		} else if (n === 4) {
			this.action = 2;
			this.timeAction = 0.5;
		}
	}
	update(player: Player, dt: number) {
		if (this.timeAction >= 0) this.timeAction -= dt;
		if (this.timeAction <= 0 && this.action != 1) this.action = 1;
		switch (this.action) {
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
	}
	rewardsPolicy(board: Board, id: number): number {
		const ops = (id + 1) % 2;
		const diffOps = this.scores[ops] < board.scores[ops] ? -1 : 0;
		const diffMe = this.scores[id] < board.scores[id] ? 1 : 0;
		let reward = diffMe + diffOps;
		const ball = board.ball;
		const player = board.players[id];
		if (ball.y >= player.y && ball.y <= player.y + player.size)
			reward += 0.5;
		else reward -= 0.1;
		return reward;
	}
	takeDecision(player: Player, board: Board) {
		let reward = 0;
		const timestamp = Date.now();
		//console.log("time: ", timestamp - this.start);
		const state = board.getState(player.id);
		if (
			this.training &&
			this.lastState !== null &&
			this.lastAction !== null
		) {
			reward = this.rewardsPolicy(board, player.id);
			//console.log(`reward: ${reward}`);
			this.updateQtable(this.lastState, this.lastAction, reward, state);
		}
		const chosen = this.chooseAction(state);
		console.log(`[BOT] state: ${state}, action: ${chosen}, reward: ${reward}`); // Ajout du log
		this.readAction(chosen);
		this.lastAction = this.action;
		this.lastState = state;
		this.reward += reward;
		this.scores = [...board.scores];
	}
}
