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
				`../AI/qtable_saves/${this.type}/qtable_${this.type}_episode_${this.qtable_nb}.json`,
				"utf-8"
			);
			this.qTable = JSON.parse(raw);
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
		//console.log("time: ", timestamp - this.start);
		const state = this.getState(board, player);
		if (
			this.training &&
			this.lastState !== null &&
			this.lastAction !== null
		) {
			reward = this.rewardsPolicy(board, player.id);
			//console.log(`reward: ${reward}`);
			this.updateQtable(this.lastState, this.lastAction, reward, state);
		}
		this.action = this.chooseAction(state);
		//console.log(`[BOT] state: ${state}, action: ${chosen}, reward: ${reward}`); // Ajout du log
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
	nbOfActions: number = 5; // 5 zones cibles
	type = "medium";
	qtable_nb = 0;
	action!: number;
	timeAction: number = 0;
	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	update(player: Player, board: Board, dt: number) {
		if (this.targetZone === null) return;
		const nbZones = 5;
		const zoneHeight = board.H / nbZones;
		const targetY =
			this.targetZone * zoneHeight + zoneHeight / 2 - player.size / 2;
		if (player.y < targetY - 2) {
			player.moveUp(true);
			player.moveDown(false);
		} else if (player.y > targetY + 2) {
			player.moveUp(false);
			player.moveDown(true);
		} else {
			player.moveUp(false);
			player.moveDown(false);
		}
	}
	rewardsPolicy(board: Board, id: number): number {
		let reward = 0;
		const ball = board.ball;
		const player = board.players[id];
		// Dense reward : se placer devant la balle
		if (ball.y >= player.y && ball.y <= player.y + player.size)
			reward += 0.5;
		else reward -= 0.1;
		// Sparse reward : but marqué ou encaissé
		const prevMyScore = this.scores[id];
		const prevOppScore = this.scores[(id + 1) % 2];
		const myScore = board.scores[id];
		const oppScore = board.scores[(id + 1) % 2];
		if (myScore > prevMyScore) reward += 1.0; // but marqué
		if (oppScore > prevOppScore) reward -= 1.0; // but encaissé
		return reward;
	}
	getState(board: Board, player: Player): string {
		const nbZones = 5;
		const playerZone = Math.floor(
			(player.y / (board.H - player.size)) * nbZones
		);
		let { nextY: predictedY, nextX: predictedX } = board.ball.getNextXY(1);
		const isBehind =
			(player.id === 0 && predictedX < player.x + player.width) ||
			(player.id === 1 && predictedX > player.x);
		if (isBehind) predictedY = board.ball.y;
		const ballZone = Math.floor((predictedY / board.H) * nbZones);
		// Discrétisation plus fine de vy
		const vy = board.ball.dy;
		let vyZone = 3; // 0: très négatif, 1: négatif, 2: légèrement négatif, 3: proche de 0, 4: légèrement positif, 5: positif, 6: très positif
		if (vy < -80) vyZone = 0;
		else if (vy < -50) vyZone = 1;
		else if (vy < -20) vyZone = 2;
		else if (vy < 20) vyZone = 3;
		else if (vy < 50) vyZone = 4;
		else if (vy < 80) vyZone = 5;
		else vyZone = 6;
		return `${playerZone}_${ballZone}_${vyZone}`;
	}
}

export class EasyBot extends BotController {
	nbOfActions: number = 10; // nombre de zones verticales
	type = "easy";
	qtable_nb = 300;
	timeAction: number = 0;

	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	update(player: Player, board: Board, dt: number) {
		if (this.action === null) return;
		const nbZones = this.nbOfActions;
		const zoneHeight = board.H / nbZones;
		const targetY =
		this.action * zoneHeight + zoneHeight / 2;
		const playerCenter = player.y + player.size / 2;
		//console.log(`action: ${this.action}, target: ${targetY}, player: ${playerCenter}`);
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
		const nbZones = this.nbOfActions;
		let { nextY: predictedY, nextX: predictedX } = board.ball.getNextXY(1);
		const isBehind =
			(player.id === 0 && predictedX < player.x + player.width) ||
			(player.id === 1 && predictedX > player.x);
		if (isBehind) predictedY = board.ball.getNextXY(0.4).nextY;
		while (predictedY < 0 || predictedY > board.H){
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H) predictedY = board.H - (predictedY - board.H)
		}
		const ballZone = Math.floor((predictedY / board.H) * nbZones);
		return `${ballZone}`;
	}
}
