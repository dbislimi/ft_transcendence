import Player from "./Player.ts";
import Ball from "./Ball.ts";
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts

========
import BotController, { EasyBot, MediumBot, HardBot } from "./Bot.ts";
import Bonus from "./Bonus.ts";
import { Bigger, Smaller, Faster } from "./Bonus.ts";
import plotRewards from "./chart.ts";
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
interface PlayerData {
	size: number;
	y: number;
	score: number;
}

type bounceParam = [player: null] | [player: Player, hitpoint: number];

export default class Board {
	private readonly height: number;
	private readonly width: number;
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
	private playerSpeed: number = 100;
	players: Player[];
	private ball: Ball;
	private score: number[] = [0, 0];
========
	players: [Player, Player];
	ball: Ball;
	private elapsedTime: number = 0;
	bonus: Bonus[] = [];
	private bonusTypes = [Bigger, Smaller, Faster];
	private bonusNb: number = 1;
	private bonusSpawnInterval: number = 1;
	private bonusSpawnTimer: number = 0;
	private bonusRadius: number = 8;
	private training: boolean = false;
	botController: BotController[];
	private score: [number, number] = [0, 0];
	private maxScore: number;
	private gamesNb: number = 1;
	normHitpoint: number = 0;
	private onWin: (id: 0 | 1) => void;
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts

	constructor(options: {
		onWin: (id: number) => void;
		maxScore?: number;
		bonusNb?: number;
		bonusTypes?: string[];
		playerSpeed?: number;
	}) {
		const {
			onWin,
			maxScore = 2,
			bonusNb = 1,
			bonusTypes = ["Bigger", "Smaller", "Faster"],
			playerSpeed,
		} = options;
		this.onWin = onWin;
		this.maxScore = maxScore;
		this.height = 100;
		this.width = 200;
		this.bonusNb = bonusNb;
		this.bonusTypes = bonusTypes.map((name) => {
			switch (name) {
				case "Bigger":
					return Bigger;
				case "Smaller":
					return Smaller;
				case "Faster":
					return Faster;
				default:
					return Bigger;
			}
		});
		this.ball = new Ball(this);
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
		this.players = [new Player(this, 0), new Player(this, 1)];
========
		this.players = [
			new Player(this, 0, playerSpeed),
			new Player(this, 1, playerSpeed),
		];
		this.botController = [];
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
	}
	setBallPos(x: number = this.width / 2, y: number = this.height / 2) {
		this.ball.x = x;
		this.ball.y = y;
	}
	bounceBallX(reset?: boolean) {
		if (reset) {
			this.ball.dx = this.ball.dx < 0 ? -30 : 30;
			this.ball.dy = Math.random() * 120 - 60;
		}
		this.ball.dx *= -1;
		if (this.ball.dx <= 30) this.ball.dx *= 1.5;
	}
	bounceBallY(...arg: bounceParam) {
		const [player, hitpoint] = arg;

		if (player === null) this.ball.dy *= -1;
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
		else
			this.ball.dy =
				((2 * hitpoint) / player.size - 1) * Math.abs(this.ball.dx);
========
		else {
			const clamped = Math.max(0, Math.min(hitpoint, player.size));
			this.normHitpoint = (2 * clamped) / player.size - 1;
			const angle = this.normHitpoint * (Math.PI / 4);
			const dir = this.ball.dx < 0 ? -1 : 1;
			this.ball.dx = Math.cos(angle) * this.ball.speed * dir;
			this.ball.dy = Math.sin(angle) * this.ball.speed;
		}
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
	}
	private addScore(player: 0 | 1) {
		this.score[player]++;
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
========
		this.bonus = [];
		for (const p of this.players) p.reset();
		this.bonusSpawnTimer = 0;
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
		this.setBallPos();
		this.bounceBallX(true);
		if (this.score[player] === this.maxScore) this.onWin(player);
	}
	getBallSpeed(): number {
		const pxlSecond = Math.hypot(this.ball.dx, this.ball.dy);
		const pxlMeter = 50;
		return pxlSecond / pxlMeter;
	}
	getBallData(): { radius: number; x: number; y: number } {
		return { radius: this.ballRadius, ...this.ball.getXY() };
	}
	getPlayersData(): { p1: PlayerData; p2: PlayerData } {
		return {
			p1: { ...this.players[0].getData(), score: this.score[0] },
			p2: { ...this.players[1].getData(), score: this.score[1] },
		};
	}
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
========
	getBonusData() {
		return this.bonus.map((b) => ({
			name: b.name,
			y: b.y,
			radius: b.radius,
		}));
	}
	checkBonusCollision() {
		const player: 0 | 1 = this.ball.dx > 0 ? 0 : 1;

		if (
			this.ball.x >= this.width / 2 - this.bonusRadius &&
			this.ball.x <= this.width / 2 + this.bonusRadius
		)
			this.bonus = this.bonus.filter((bonus) => {
				if (
					(this.ball.x - this.width / 2) *
						(this.ball.x - this.width / 2) +
						(this.ball.y - bonus.y) * (this.ball.y - bonus.y) <=
					(this.ball.radius + bonus.radius) *
						(this.ball.radius + bonus.radius)
				) {
					this.players[player].bonusCollectedTotal++;
					if (bonus.is === "bonus") {
						if (bonus.apply(this.players[player]))
							this.players[player].ActiveBonus.push(bonus);
					} else {
						const opp = this.players[(player + 1) % 2];
						if (opp && bonus.apply(opp))
							opp.ActiveBonus.push(bonus);
					}

					return false;
				}
				return true;
			});
	}

>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
	updateBallPosition(dt: number): void {
		const { x, y } = this.ball.getXY();
		let { nextX, nextY } = this.ball.getNextXY(dt);
		const radius = this.ballRadius;
		const pWidth = this.players[0].width;
		const s1 = this.players[0].size;
		const s2 = this.players[1].size;
		const { y1, y2 } = { y1: this.players[0].y, y2: this.players[1].y };
		const face1 = this.players[0].x + pWidth;
		const face2 = this.players[1].x;
		const prevLeftEdge = x - radius;
		const nextLeftEdge = nextX - radius;
		const prevRightEdge = x + radius;
		const nextRightEdge = nextX + radius;
		if (nextY - radius <= 0 || nextY + radius >= this.height) {
			this.bounceBallY(null);
			nextY = Math.max(radius, Math.min(nextY, this.height - radius));
		}
		if (prevLeftEdge > face1 && nextLeftEdge <= face1) {
			const t = (face1 - prevLeftEdge) / (nextLeftEdge - prevLeftEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross + radius >= y1 - 1 && yCross - radius <= y1 + s1 + 1) {
				nextX = face1 + radius;
				this.bounceBallX();
				this.bounceBallY(this.players[0], yCross - y1);
			}
		} else if (prevRightEdge < face2 && nextRightEdge >= face2) {
			const t = (face2 - prevRightEdge) / (nextRightEdge - prevRightEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross + radius >= y2 - 1 && yCross - radius <= y2 + s2 + 1) {
				nextX = face2 - radius;
				this.bounceBallX();
				this.bounceBallY(this.players[1], yCross - y2);
			}
		}
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
		this.ball.x = nextX;
		this.ball.y = nextY;
		if (nextX + radius >= this.width) this.addScore(0);
		else if (nextX - radius <= 0) this.addScore(1);
	}
	updatePlayersPosition(dt: number) {
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p2.bot) {
			if (this.ball.y + this.ball.radius < p2.y) {
				p2.moveUp(true);
				p2.moveDown(false);
			} else if (this.ball.y - this.ball.radius > p2.y + p2.size) {
				p2.moveUp(false);
				p2.moveDown(true);
			}
		}
		if (p1.up && p1.down) return;
		if (p1.up && p1.y > 0) {
			if (p1.y - this.playerSpeed * dt < 0) p1.y = 0;
			else p1.y -= this.playerSpeed * dt;
		} else if (p1.down && p1.y + p1.size < this.height) {
			if (p1.y + this.playerSpeed * dt > this.height - p1.size)
				p1.y = this.height - p1.size;
			else p1.y += this.playerSpeed * dt;
		}
		if (p2.up && p2.y > 0) {
			if (p2.y - this.playerSpeed * dt < 0) p2.y = 0;
			else p2.y -= this.playerSpeed * dt;
		} else if (p2.down && p2.y + p1.size < this.height) {
			if (p2.y + this.playerSpeed * dt > this.height - p2.size)
				p2.y = this.height - p2.size;
			else p2.y += this.playerSpeed * dt;
========
		nextX = Math.max(radius, Math.min(nextX, this.width - radius));
		nextY = Math.max(radius, Math.min(nextY, this.height - radius));
		this.ball.x = nextX;
		this.ball.y = nextY;
		this.ball.clampSpeed();

		if (nextX - radius <= 0) {
			this.addScore(1);
		} else if (nextX + radius >= this.width) {
			this.addScore(0);
		}
	}
	updatePlayersPosition(dt: number) {
		this.move(this.players[0], dt);
		this.move(this.players[1], dt);
	}
	move(p: Player, dt: number) {
		if (!(p.up && p.down)) {
			if (p.up && p.y > 0) {
				if (p.y - p.speed * dt < 0) p.y = 0;
				else p.y -= p.speed * dt;
			} else if (p.down && p.y + p.size < this.height) {
				if (p.y + p.speed * dt > this.height - p.size)
					p.y = this.height - p.size;
				else p.y += p.speed * dt;
			}
		}
	}

	updateBonus(dt: number) {
		this.bonusSpawnTimer += dt;
		if (this.bonusSpawnTimer >= this.bonusSpawnInterval) {
			this.bonusSpawnTimer -= this.bonusSpawnInterval;
			if (this.bonus.length < this.bonusNb) {
				let retries = 2;

				let y = Math.floor(
					Math.random() * (this.height - this.bonusRadius * 2) +
						this.bonusRadius
				);
				for (let i = 0; i < this.bonus.length && retries; ) {
					const bonusi = this.bonus[i];
					if (
						bonusi &&
						Math.abs(bonusi.y - y) < this.bonusRadius * 3
					) {
						y = Math.floor(
							Math.random() *
								(this.height - 2 * this.bonusRadius) +
								this.bonusRadius
						);
						i = 0;
						--retries;
						continue;
					}
					++i;
				}
				if (retries) {
					const bonus =
						this.bonusTypes[
							Math.floor(Math.random() * this.bonusTypes.length)
						]!;
					const newBonus = new bonus(y, this.bonusRadius);
					this.bonus.push(newBonus);
				}
			}
		}
		for (const player of this.players) {
			if (player.ActiveBonus.length === 0) continue;
			player.ActiveBonus = player.ActiveBonus.filter((bonus) => {
				bonus.duration -= dt;
				if (bonus.duration <= 0) {
					bonus.remove(player);
					return false;
				}
				return true;
			});
		}
	}
	updateBot(dt: number) {
		for (const [index, bot] of this.botController.entries()) {
			if (!bot) continue;
			bot.aiLag += dt;
			if (this.training || bot.aiLag >= 1) {
				bot.takeDecision(this, this.players[index]!);
				bot.aiLag -= 1;
			}
			if (bot.reachedDecisionLimit()) {
				console.log("Decision limit reached");
				this.onWin(0);
				return false;
			}
			bot.update(this.players[index]!, this, dt);
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
		}
		return true;
	}
	update(dt: number) {
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
		this.updatePlayersPosition(dt);
		this.updateBallPosition(dt);
	}
========
		this.elapsedTime += dt;
		if (this.elapsedTime % 10 === 0) {
			console.log("game running");
		}
		this.updateBonus(dt);
		if (!this.updateBot(dt)) return;
		this.updatePlayersPosition(dt);
		this.updateBallPosition(dt);
	}
	getPlayerInput(id: 0 | 1): { up: boolean; down: boolean } {
		return { up: this.players[id].up, down: this.players[id].down };
	}
	disconnectBot() {
		this.botController.length = 0;
	}
	connectBot(id: 0 | 1, diff: difficulty, training: boolean = false) {
		this.players[id].bot = diff;
		switch (diff) {
			case "easy":
				this.botController[id] = new EasyBot({
					learning_rate: 0.1,
					discount_factor: 0.1,
					epsilon: 1,
					epsilon_decay: 0.00023,
					epsilon_min: 0.01,
					training: training,
				});
				break;
			case "medium":
				this.botController[id] = new MediumBot({
					learning_rate: 0.1,
					discount_factor: 0.9,
					epsilon: 1,
					epsilon_decay: 0.0001,
					epsilon_min: 0.01,
					training: training,
				});
				break;
			case "hard":
				this.botController[id] = new HardBot({
					learning_rate: 0.2,
					discount_factor: 0.98,
					epsilon: 1,
					epsilon_decay: 0.0001,
					epsilon_min: 0.2,
					training: training,
				});
				break;
		}
	}

	reset() {
		this.score = [0, 0];
		this.ball.reset(this, this.training);
		for (const player of this.players) player.reset();
		this.bonus.length = 0;
		this.elapsedTime = 0;
		if (this.training && this.botController[0] !== undefined) {
			if (this.gamesNb % 50 === 0)
				this.botController[0].save(this.gamesNb + 400);
			if (this.gamesNb % 100 === 0) {
				plotRewards(
					"rewards",
					this.botController[0].rewards,
					this.botController[0].type,
					this.gamesNb
				);
				plotRewards(
					"epsilons",
					this.botController[0].epislons,
					this.botController[0].type,
					this.gamesNb
				);
			}
			this.botController[0].newEpisode();
		}
		++this.gamesNb;
	}
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
	get H(): number {
		return this.height;
	}
	get W(): number {
		return this.width;
	}
	get ballRadius() {
		return this.ball.radius;
	}
	getPlayerInput(id: 0 | 1): { up: boolean; down: boolean } {
		return { up: this.players[id].up, down: this.players[id].down };
	}
<<<<<<<< HEAD:srcs/backend/app/src/game/Board.ts
	connect() {
		this.players[0].bot = false;
========
	set Training(flag: boolean) {
		this.training = flag;
	}
	get Rewards() {
		return this.botController[0]!.rewards;
>>>>>>>> game-back:srcs/backend/app/src/pong/Board.ts
	}
}
