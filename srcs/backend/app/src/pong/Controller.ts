import Board from "./Board.ts";
import Player from "./Player.ts";
import np from "./MyNumpy/MyNumpy.ts";
import * as fs from "fs";

export default abstract class BotController {
	protected training: boolean;
	protected learning_rate: number;
	protected discount_factor: number;
	protected epsilon: number;
	protected epsilon_decay: number;
	protected epsilon_min: number;
	epislons: number[] = [];
	protected qTable: { [state: string]: number[] } = {};
	reward: number = 0;
	rewards: number[] = [];
	protected action: number | null = null
	protected lastState: string | null = null;
	protected lastAction: number | null = null;
	protected start: number;
	aiLag: number = 0;
	protected scores: [number, number] = [0, 0];
	abstract nbOfActions: number;
	abstract type: string;
	abstract qtable_nb: number;

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
	}

	private epsilonGreedy() {
		this.epsilon = Math.max(
			this.epsilon_min,
			this.epsilon * (1 - this.epsilon_decay)
		);
	}
	protected chooseAction(state: string) {
		if (!(state in this.qTable))
			this.qTable[state] = Array(this.nbOfActions).fill(0);
		if (this.training && Math.random() < this.epsilon) {
			this.epsilonGreedy();
			return Math.floor(Math.random() * this.nbOfActions);
		}
		return np.argmax(this.qTable[state]);
	}

	protected updateQtable(
		state: string,
		action: number,
		reward: number,
		nextState: string
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

	public save(episode: number): void {
		fs.writeFileSync(
			`../AI/qtable_saves/${this.type}/qtable_${this.type}_episode_${episode}.json`,
			JSON.stringify(this.qTable, null, 2),
			"utf-8"
		);
	}

	protected load() {
		try {
			const raw = fs.readFileSync(
				`/Users/benelgorch/Desktop/GitHub/ft_transcendence/AI/qtable_saves/${this.type}/qtable_${this.type}_episode_${this.qtable_nb}.json`,
				"utf-8"
			);
			this.qTable = JSON.parse(raw);
			console.log(`Loaded: ${this.type}/qtable_${this.type}_episode_${this.qtable_nb}.json`);
		} catch (error) {
			console.log(error);
		}
	}
	newEpisode() {
		this.epislons.push(this.epsilon);
		this.rewards.push(this.reward);
		this.reward = 0;
		this.scores = [0, 0];
	}
	takeDecision(board: Board, player: Player) {
		let reward = 0;
		const timestamp = Date.now();
		const state = this.getState(board, player);
		if (
			this.training &&
			this.lastState !== null &&
			this.lastAction !== null
		) {
			reward = this.rewardsPolicy(board, player.id);
			this.updateQtable(this.lastState, this.lastAction, reward, state);
		}
		this.action = this.chooseAction(state);
		if (this.type === "easy")
			console.log(`[${this.type}] state: ${state}, action: ${this.action}, reward: ${reward}`);
		this.lastAction = this.action;
		this.lastState = state;
		this.reward += reward;
		this.scores = [...board.scores];
	}
	abstract getState(board: Board, player: Player): string;
	abstract update(player: Player, board: Board, dt: number): void;
	abstract rewardsPolicy(board: Board, id: number): number;
}


export class MediumBot extends BotController {
	targetZone: number | null = null;
	nbOfActions: number = 10;
	type = "medium";
	qtable_nb = 200;

	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	update(player: Player, board: Board, dt: number) {
		if (this.action === null) return;
		const zoneHeight = board.H / this.nbOfActions;
		const targetY =
		this.action * zoneHeight + zoneHeight / 2;
		const playerCenter = player.y + player.size / 2;
		if (playerCenter > targetY + 2) {
			player.moveUp(true);
			player.moveDown(false);
		} else if (playerCenter < targetY - 2) {
			player.moveUp(false);
			player.moveDown(true);
		} else {
			player.moveUp(false);
			player.moveDown(false);
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		let reward = 0
		if ((id === 0 && board.ball.dx > 0) || (id === 1 && board.ball.dx < 0))
			reward += Math.abs(board.normHitpoint);
		board.normHitpoint = 0;
		const prevOppScore = this.scores[(id + 1) % 2];
		const oppScore = board.scores[(id + 1) % 2];
		if (oppScore > prevOppScore) reward -= 1.0;
		console.log(`reward: ${reward}`);
		return reward;
	}
	getState(board: Board, player: Player): string {
		if ((player.id === 0 && board.ball.dx > 0) || (player.id === 1 && board.ball.dx < 0))
			return (`-1`);
		const dx = board.ball.dx;
		const dy = board.ball.dy;
		const xp = player.id === 0 ? player.x + player.width : player.x;
		const x0 = board.ball.x;
		const y0 = board.ball.y;
		let predictedY =  y0 + ((xp - x0) / dx) * dy;
		while (predictedY < 0 || predictedY > board.H){
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H) predictedY = 2 * board.H - predictedY;
		}
		const ballZone = Math.floor((predictedY / board.H) * this.nbOfActions)
		return `${ballZone}`;
	}
}

export class EasyBot extends BotController {
	nbOfActions: number = 10;
	type = "easy";
	qtable_nb = 300;
	timeAction: number = 0;

	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	update(player: Player, board: Board, dt: number) {
		if (this.action === null) return;
		const zoneHeight = board.H / this.nbOfActions;
		const targetY =
		this.action * zoneHeight + zoneHeight / 2;
		const playerCenter = player.y + player.size / 2;
		if (playerCenter > targetY + 2) {
			player.moveUp(true);
			player.moveDown(false);
		} else if (playerCenter < targetY - 2) {
			player.moveUp(false);
			player.moveDown(true);
		} else {
			player.moveUp(false);
			player.moveDown(false);
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		const ball = board.ball;
		const player = board.players[id];
		const playerCenter = player.y + player.size / 2;
		const dist = Math.abs(ball.y - playerCenter);
		const maxDist = player.size / 2;
		if (dist <= maxDist) {
			return 1 - dist / maxDist;
		} else {
			return -(dist - maxDist) / maxDist;
		}
	}

	getState(board: Board, player: Player): string {
		let { nextY: predictedY, nextX: predictedX } = board.ball.getNextXY(1);
		const isBehind =
			(player.id === 0 && predictedX < player.x + player.width) ||
			(player.id === 1 && predictedX > player.x);
		if (isBehind) predictedY = board.ball.getNextXY(0.6).nextY;
		while (predictedY < 0 || predictedY > board.H){
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H) predictedY = board.H - (predictedY - board.H)
		}
		const ballZone = Math.floor((predictedY / board.H) * this.nbOfActions);
		console.log(`ballzone: ${ballZone}`);
		return `${ballZone}`;
	}
}
