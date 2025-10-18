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
	protected action: number | null = null;
	protected lastState: string | null = null;
	protected lastAction: number | null = null;
	protected start: number;
	aiLag: number = 0;
	protected scores: [number, number] = [0, 0];
	abstract nbOfActions: number;
	abstract type: string;
	abstract qtable_nb: number;
	protected maxDecisions: number;
	protected decisionsMade: number = 0;

	constructor(
		options: {
			learning_rate?: number;
			discount_factor?: number;
			epsilon?: number;
			epsilon_decay?: number;
			epsilon_min?: number;
			training?: boolean;
			maxDecisions?: number;
		} = {}
	) {
		const {
			learning_rate = 0.1,
			discount_factor = 0.9,
			epsilon = 1,
			epsilon_decay = 0.00001,
			epsilon_min = 0.01,
			training = false,
			maxDecisions = 100,
		} = options;
		this.start = Date.now();
		this.training = training;
		this.learning_rate = learning_rate;
		this.discount_factor = discount_factor;
		this.epsilon = epsilon;
		this.epsilon_min = epsilon_min;
		this.epsilon_decay = epsilon_decay;
		this.maxDecisions = maxDecisions;
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
		let action: number;
		if (this.training && Math.random() < this.epsilon)
			action = Math.floor(Math.random() * this.nbOfActions);
		else action = np.argmax(this.qTable[state]);
		if (this.training) this.epsilonGreedy();
		return action;
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
			console.log(
				`Loaded: ${this.type}/qtable_${this.type}_episode_${this.qtable_nb}.json`
			);
		} catch (error) {
			console.log(error);
		}
	}
	newEpisode() {
		console.log(`decisionsMade: ${this.decisionsMade}`);
		this.epislons.push(this.epsilon);
		this.rewards.push(this.reward);
		this.reward = 0;
		this.scores = [0, 0];
		this.decisionsMade = 0;
	}
	reachedDecisionLimit(): boolean {
		return this.decisionsMade >= this.maxDecisions;
	}
	takeDecision(board: Board, player: Player) {
		let reward = 0;
		if (this.training) ++this.decisionsMade;
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
		//console.log(
		//	`[${this.type}] state: ${state}, action: ${this.action}, reward: ${reward}`
		//);
		this.lastAction = this.action;
		this.lastState = state;
		this.reward += reward;
		this.scores = [...board.scores];
	}
	abstract getState(board: Board, player: Player): string;
	abstract update(player: Player, board: Board, dt: number): void;
	abstract rewardsPolicy(board: Board, id: number): number;
}

export class HardBot extends BotController {
	targetZone: number | null = null;
	nbOfActions: number = 10;
	type = "hard";
	qtable_nb = 300;
	private lastBonusCollected: number = 0;
	private predictedY: number = 0;
	private lastDir: 0 | 1 = 0;
	private oppZone: number | null = null;

	constructor(options = {}) {
		super({ ...options, maxDecisions: 300 });
		if (this.training === false) this.load();
	}

	private predictY(board: Board, player: Player): number {
		const xp = player.id === 0 ? player.x + player.width : player.x;
		const { x: x0, y: y0, dx, dy } = board.ball;
		if (dx === 0) return y0;
		let predictedY = y0 + ((xp - x0) / dx) * dy;
		while (predictedY < 0 || predictedY > board.H) {
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H) predictedY = 2 * board.H - predictedY;
		}
		return predictedY;
	}

	update(player: Player, board: Board, dt: number) {
		if (this.action === null) return;
		const segmentSize = player.size / this.nbOfActions;
		let desiredY: number;
		if (this.lastDir === 1) {
			const targetCenter = this.predictedY;
			desiredY =
				targetCenter - (this.action * segmentSize + segmentSize / 2);
		} else {
			const zoneHeight = board.H / this.nbOfActions;
			const zoneCenter = this.action * zoneHeight + zoneHeight / 2;
			desiredY = zoneCenter - player.size / 2;
		}
		desiredY = Math.max(0, Math.min(board.H - player.size, desiredY));
		const stopMargin = Math.max(1, player.speed * dt * 0.5);
		if (player.y > desiredY + stopMargin) {
			player.moveDown(false);
			player.moveUp(true);
		} else if (player.y < desiredY - stopMargin) {
			player.moveDown(true);
			player.moveUp(false);
		} else {
			player.moveDown(false);
			player.moveUp(false);
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		let rScore = 0;
		let rBonus = 0;
		let rPark = 0;
		let rMove = 0;
		let rAim = 0;

		const prevMyScore = this.scores[id];
		const prevOppScore = this.scores[(id + 1) % 2];
		const myScore = board.scores[id];
		const oppScore = board.scores[(id + 1) % 2];
		if (myScore > prevMyScore) rScore += 1.5;
		if (oppScore > prevOppScore) rScore -= 1;

		const ballComingToMe =
			(id === 0 && board.ball.dx < 0) || (id === 1 && board.ball.dx > 0);
		const opponent = board.players[(id + 1) % 2];
		if (!ballComingToMe && this.oppZone !== null && this.lastDir === 0) {
			const y = this.predictY(board, opponent);
			const yZone = Math.floor((y / board.H) * 2);
			console.log(`AIM: y${yZone}, opp${this.oppZone}`);
			if (yZone !== this.oppZone) rAim += 0.5;
			this.oppZone = null;
		}

		const collected = board.players[id].bonusCollectedTotal;
		if (collected > this.lastBonusCollected) {
			const diff = collected - this.lastBonusCollected;
			rBonus = 0.5 * diff;
			this.lastBonusCollected = collected;
		}

		if (this.lastDir === 0) {
			const player = board.players[id];
			if (this.lastAction !== null) {
				const zoneHeight = board.H / this.nbOfActions;
				const zoneCenter =
					this.lastAction * zoneHeight + zoneHeight / 2;
				const playerCenter = player.y + player.size / 2;
				const dist = Math.abs(playerCenter - zoneCenter);
				const norm = Math.max(0, 1 - dist / (board.H / 2));
				rPark = 0.02 * norm;
			}
			if (player.up || player.down) rMove = -0.005;
		}

		const reward = rScore + rBonus + rPark + rMove + rAim;
		console.log(
			`step=${this.decisionsMade} total=${reward.toFixed(
				3
			)} score=${rScore.toFixed(2)} bonus=${rBonus.toFixed(
				2
			)} park=${rPark.toFixed(3)} move=${rMove.toFixed(
				3
			)} aim=${rAim.toFixed(3)} eps=${this.epsilon.toFixed(3)}`
		);
		return reward;
	}
	getState(board: Board, player: Player): string {
		const dir =
			(player.id === 0 && board.ball.dx > 0) ||
			(player.id === 1 && board.ball.dx < 0)
				? 0
				: 1;
		this.lastDir = dir;
		const firstBonusY = board.bonus[0]?.y;
		const bonusZone =
			firstBonusY === undefined
				? -1
				: Math.floor((firstBonusY / board.H) * this.nbOfActions);
		const opponent = board.players[(player.id + 1) % 2];
		if (dir === 1) {
			this.predictedY = this.predictY(board, player);
			const ballZone = Math.floor(
				(this.predictedY / board.H) * this.nbOfActions
			);
			if (bonusZone !== -1) return `${ballZone}_${bonusZone}`;
			const oppCenter = opponent.y + opponent.size / 2;
			this.oppZone = Math.floor((oppCenter / board.H) * 2);
			return `${ballZone}_${this.oppZone - 2}`;
		}
		this.predictedY = this.predictY(board, opponent);
		const ballZone = Math.floor(
			(this.predictedY / board.H) * this.nbOfActions
		);
		return `${ballZone}`;
	}
}

export class MediumBot extends BotController {
	targetZone: number | null = null;
	nbOfActions: number = 10;
	type = "medium2";
	qtable_nb = 400;
	private predictedY: number = 0;

	private predictY(board: Board, player: Player): number {
		const xp = player.id === 0 ? player.x + player.width : player.x;
		const { x: x0, y: y0, dx, dy } = board.ball;
		if (dx === 0) return y0;
		let predictedY = y0 + ((xp - x0) / dx) * dy;
		while (predictedY < 0 || predictedY > board.H) {
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H) predictedY = 2 * board.H - predictedY;
		}
		return predictedY;
	}

	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	update(player: Player, board: Board, dt: number) {
		if (this.action === null) return;
		const zoneHeight = board.H / this.nbOfActions;
		const targetY = this.action * zoneHeight + zoneHeight / 2;
		const playerCenter = player.y + player.size / 2;
		const stopMargin = Math.max(1, player.speed * dt * 0.5);
		const startMargin = stopMargin * 1.2;
		const diff = targetY - playerCenter;
		const moving = player.up || player.down;
		if (moving) {
			if (Math.abs(diff) <= stopMargin) {
				player.moveUp(false);
				player.moveDown(false);
			} else if (diff > 0) {
				player.moveUp(false);
				player.moveDown(true);
			} else {
				player.moveUp(true);
				player.moveDown(false);
			}
		} else {
			if (Math.abs(diff) >= startMargin) {
				if (diff > 0) {
					player.moveUp(false);
					player.moveDown(true);
				} else {
					player.moveUp(true);
					player.moveDown(false);
				}
			} else {
				player.moveUp(false);
				player.moveDown(false);
			}
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		let reward = 0;
		let rTouch = 0;
		let rTrack = 0;
		let rScore = 0;
		if ((id === 0 && board.ball.dx > 0) || (id === 1 && board.ball.dx < 0))
			rTouch += Math.abs(board.normHitpoint);
		board.normHitpoint = 0;

		const ballComingToMe =
			(id === 0 && board.ball.dx < 0) || (id === 1 && board.ball.dx > 0);
		if (ballComingToMe && board.ball.dx !== 0) {
			const player = board.players[id];
			const top = player.y;
			const bottom = top + player.size;
			let dist = 0;
			if (this.predictedY < top) dist = top - this.predictedY;
			else if (this.predictedY > bottom) dist = this.predictedY - bottom;
			const norm = 1 - dist / player.size;
			rTrack = 0.05 * norm;
		}

		const prevMyScore = this.scores[id];
		const prevOppScore = this.scores[(id + 1) % 2];
		const myScore = board.scores[id];
		const oppScore = board.scores[(id + 1) % 2];
		if (myScore > prevMyScore) rScore += 1.5;
		if (oppScore > prevOppScore) rScore -= 1.0;

		reward = rScore + rTouch + rTrack;
		console.log(
			`[medium][reward] step=${this.decisionsMade} total=${reward.toFixed(
				3
			)} track=${rTrack.toFixed(3)}, touch=${rTouch.toFixed(
				3
			)}, score=${rScore}`
		);
		return reward;
	}
	getState(board: Board, player: Player): string {
		const dir =
			(player.id === 0 && board.ball.dx > 0) ||
			(player.id === 1 && board.ball.dx < 0)
				? 0
				: 1;
		this.predictedY = this.predictY(board, player);
		const ballZone = Math.floor(
			(this.predictedY / board.H) * this.nbOfActions
		);
		return `${dir}_${ballZone}`;
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
		const targetY = this.action * zoneHeight + zoneHeight / 2;
		const playerCenter = player.y + player.size / 2;
		const stopMargin = Math.max(1, player.speed * dt * 0.5);
		const startMargin = stopMargin * 1.2;
		const diff = targetY - playerCenter;
		const moving = player.up || player.down;
		if (moving) {
			if (Math.abs(diff) <= stopMargin) {
				player.moveUp(false);
				player.moveDown(false);
			} else if (diff > 0) {
				player.moveUp(false);
				player.moveDown(true);
			} else {
				player.moveUp(true);
				player.moveDown(false);
			}
		} else {
			if (Math.abs(diff) >= startMargin) {
				if (diff > 0) {
					player.moveUp(false);
					player.moveDown(true);
				} else {
					player.moveUp(true);
					player.moveDown(false);
				}
			} else {
				player.moveUp(false);
				player.moveDown(false);
			}
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
		while (predictedY < 0 || predictedY > board.H) {
			if (predictedY < 0) predictedY = -predictedY;
			if (predictedY > board.H)
				predictedY = board.H - (predictedY - board.H);
		}
		const ballZone = Math.floor((predictedY / board.H) * this.nbOfActions);
		console.log(`ballzone: ${ballZone}`);
		return `${ballZone}`;
	}
}
