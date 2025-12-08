import Board from './Board.js';
import Player from './Player.js';
import np from './MyNumpy/MyNumpy.js';
import * as fs from "fs";

function simulateYAtX(
	startX: number,
	startY: number,
	dx: number,
	dy: number,
	targetX: number,
	height: number,
	maxBounces: number = 10
): number {
	if (dx === 0 || (targetX - startX) / dx <= 0) return startY;

	let simX = startX;
	let simY = startY;
	let simDx = dx;
	let simDy = dy;
	let bounces = 0;

	while (Math.abs(simX - targetX) > 0.1 && bounces < maxBounces) {
		const dt = (targetX - simX) / simDx;
		const nextY = simY + simDy * dt;
		if (nextY < 0) {
			const timeToWall = -simY / simDy;
			simX += simDx * timeToWall;
			simY = 0;
			simDy = -simDy;
			bounces++;
		} else if (nextY > height) {
			const timeToWall = (height - simY) / simDy;
			simX += simDx * timeToWall;
			simY = height;
			simDy = -simDy;
			bounces++;
		} else {
			return nextY;
		}
	}
	return Math.max(0, Math.min(height, simY));
}

// alpha = learning_rate
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
		if (this.training && Math.random() < this.epsilon) {
			this.epsilonGreedy();
			return Math.floor(Math.random() * this.nbOfActions);
		}
		return np.argmax(this.qTable[state]!);
	}

	protected updateQtable(
		state: string,
		action: number,
		reward: number,
		nextState: string
	) {
		if (!(nextState in this.qTable))
			this.qTable[nextState] = Array(this.nbOfActions).fill(0);
		const maxFuturQ = np.max(this.qTable[nextState]!);
		const currentQ = this.qTable[state]![action]!;
		this.qTable[state]![action] =
			currentQ +
			this.learning_rate *
				(reward + this.discount_factor * maxFuturQ - currentQ);
	}

	public save(episode: number): void {
		try {
			const dirPath = `../AI/qtable_saves/${this.type}`;
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}
			fs.writeFileSync(
				`${dirPath}/qtable_${this.type}_episode_${episode}.json`,
				JSON.stringify(this.qTable, null, 2),
				"utf-8"
			);
			console.log(
				`[SAVED] ${this.type} episode ${episode} (${
					Object.keys(this.qTable).length
				} states)`
			);
		} catch (error) {
			console.error(
				`[ERROR] Failed to save ${this.type} Q-table:`,
				error
			);
		}
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
		const state = this.getState(board, player);
		if (
			this.training &&
			this.lastState !== null &&
			this.lastAction !== null
		) {
			const actionReward = this.rewardsPolicy(board, player.id);
			this.updateQtable(
				this.lastState,
				this.lastAction,
				actionReward,
				state
			);
			this.reward += actionReward;
		}
		this.action = this.chooseAction(state);
		this.lastAction = this.action;
		this.lastState = state;
		this.scores = [...board.scores];
	}

	abstract getState(board: Board, player: Player): string;
	abstract update(player: Player, board: Board, dt: number): void;
	abstract rewardsPolicy(board: Board, id: number): number;
}

export class MediumBot extends BotController {
	targetZone: number | null = null;
	nbOfActions: number = 10;
	type = "medium2";
	qtable_nb = 600;
	private predictedY: number = 0;

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

		const prevMyScore = this.scores[id]!;
		const prevOppScore = this.scores[(id + 1) % 2]!;
		const myScore = board.scores[id]!;
		const oppScore = board.scores[(id + 1) % 2]!;
		if (myScore > prevMyScore) rScore += 1.5;
		if (oppScore > prevOppScore) rScore -= 1.0;

		reward = rScore + rTouch + rTrack;
		return reward;
	}
	getState(board: Board, player: Player): string {
		const dir =
			(player.id === 0 && board.ball.dx > 0) ||
			(player.id === 1 && board.ball.dx < 0)
				? 0
				: 1;
		const xp = player.id === 0 ? player.x + player.width : player.x;
		this.predictedY = simulateYAtX(
			board.ball.x,
			board.ball.y,
			board.ball.dx,
			board.ball.dy,
			xp,
			board.H
		);
		const ballZone = Math.floor(
			(this.predictedY / board.H) * this.nbOfActions
		);
		return `${dir}_${ballZone}`;
	}
}

export class EasyBot extends BotController {
	nbOfActions: number = 10;
	type = "easy1";
	qtable_nb = 300;

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

		if (playerCenter > targetY + stopMargin) {
			player.moveUp(true);
			player.moveDown(false);
		} else if (playerCenter < targetY - stopMargin) {
			player.moveUp(false);
			player.moveDown(true);
		} else {
			player.moveUp(false);
			player.moveDown(false);
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		const ball = board.ball;
		const player = board.players[id]!;
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

export class HardBot extends BotController {
	nbOfActions: number = 13;
	type = "hard_advanced1";
	qtable_nb = 600;

	private trainingPhase: number = 1;
	private predictedY: number = 0;
	private lastBonusCollected: number = 0;
	private deferredPrecision: number = 0;
	private deferredOpponentLanding: number = 0;

	constructor(options = {}) {
		super({ ...options });
		if (this.training === false) this.load();
	}

	getState(board: Board, player: Player): string {
		const xp = player.id === 0 ? player.x + player.width : player.x;
		this.predictedY = simulateYAtX(
			board.ball.x,
			board.ball.y,
			board.ball.dx,
			board.ball.dy,
			xp,
			board.H
		);
		const bonusY = board.bonus.length > 0 ? board.bonus[0]!.y : null;
		const bonusCut = 17;
		const halfCut = (bonusCut - 1) / 2;

		const wallCut = 5;
		const wallZone = Math.floor((this.predictedY / board.H) * wallCut);
		const clampedWallZone = Math.max(0, Math.min(wallCut - 1, wallZone));

		if (bonusY !== null) {
			const relativeBonusY = (bonusY - this.predictedY) / (board.H / 2);
			const bonusBin =
				Math.floor(
					Math.max(
						-halfCut,
						Math.min(halfCut, relativeBonusY * halfCut)
					)
				) + halfCut;
			return `b${bonusBin}_w${clampedWallZone}`;
		}

		const cut = 9;
		const opponent = board.players[(player.id + 1) % 2]!;
		const oppCenter = opponent.y + opponent.size / 2;
		const oppZone = Math.floor((oppCenter / board.H) * cut);
		const ballZone = Math.floor((this.predictedY / board.H) * cut);

		return `o${oppZone}_b${ballZone}`;
	}

	update(player: Player, board: Board, dt: number): void {
		if (this.action === null) return;

		const step = player.size / (this.nbOfActions - 1);
		const targetOffset = step * this.action;
		const targetY = this.predictedY - targetOffset;
		const stopMargin = Math.max(1, player.speed * dt * 0.5);

		if (player.y > targetY + stopMargin) {
			player.moveDown(false);
			player.moveUp(true);
		} else if (player.y < targetY - stopMargin) {
			player.moveDown(true);
			player.moveUp(false);
		} else {
			player.moveDown(false);
			player.moveUp(false);
		}
	}

	rewardsPolicy(board: Board, id: number): number {
		let reward = 0;
		let rScore = 0;
		let rBonus = 0;
		let rPrecision = 0;
		let rOpponentLanding = 0;

		if (this.trainingPhase === 4) {
			rOpponentLanding += this.deferredOpponentLanding;
			this.deferredOpponentLanding = 0;
		} else {
			const collected = board.players[id]!.bonusCollectedTotal;
			if (collected > this.lastBonusCollected) {
				rBonus = 1;
				this.lastBonusCollected = collected;
			}
			rPrecision += this.deferredPrecision;
			this.deferredPrecision = 0;
		}
		reward = rScore + rBonus + rPrecision + rOpponentLanding;
		return reward;
	}

	onPaddleBounce(board: Board, player: Player): void {
		if (this.trainingPhase === 4) {
			const opponent = board.players[(player.id + 1) % 2]!;
			const faceX =
				opponent.id === 0 ? opponent.x + opponent.width : opponent.x;
			const landingY = simulateYAtX(
				board.ball.x,
				board.ball.y,
				board.ball.dx,
				board.ball.dy,
				faceX,
				board.H
			);
			const oppCenter = opponent.y + opponent.size / 2;
			const dist = Math.abs(landingY - oppCenter);
			const normalizedDist = dist / 50;
			const rOpponentLanding = normalizedDist * 0.5;
			this.deferredOpponentLanding += rOpponentLanding;
		} else {
			const bonusY = board.bonus.length > 0 ? board.bonus[0]!.y : null;
			if (bonusY === null) return;
			const landingY = simulateYAtX(
				board.ball.x,
				board.ball.y,
				board.ball.dx,
				board.ball.dy,
				board.W / 2,
				board.H
			);
			const dist = Math.abs(landingY - bonusY);
			const normalizedDist = Math.min(1, dist / 50);
			const rPrecision = (1 - 2 * normalizedDist) * 2;
			this.deferredPrecision += rPrecision;
		}
	}
}
