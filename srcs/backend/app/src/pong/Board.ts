import Player, { type difficulty } from "./Player.ts";
import Ball from "./Ball.ts";
import BotController, { MediumBot } from "./Controller.ts";
//import { EasyController } from "./Controller.ts";
import type { BonusBase } from "./Bonus.ts";
import { Bigger } from "./Bonus.ts";
import { EasyBot } from "./Controller.ts";
import plotRewards from "./chart.ts";
import {
	DEFAULT_MAX_SCORE,
	DEFAULT_BONUS_TIME,
	DEFAULT_BONUS_RADIUS,
} from "./config.ts";
interface PlayerData {
	size: number;
	y: number;
	score: number;
}

type bounceParam = [player: null] | [player: Player, hitpoint: number];

export default class Board {
	private readonly height: number;
	private readonly width: number;
	players: [Player, Player];
	ball: Ball;
	private elapsedTime: number = 0;
	bonus: BonusBase[] = [];
	private bonusNb: number = 0;
	private bonusTime: number = DEFAULT_BONUS_TIME;
	private bonusRadius: number = DEFAULT_BONUS_RADIUS;
	private training: boolean = false;
	botController: BotController[];
	private score: [number, number] = [0, 0];
	private maxScore: number;
	private gamesNb: number = 1;
	normHitpoint: number = 0;
	private onWin: (id: 0 | 1) => void;

	constructor(onWin: (id: 0 | 1) => void, maxScore: number = DEFAULT_MAX_SCORE, height: number = 100, width: number = 200) {
		this.onWin = onWin;
		this.maxScore = maxScore;
		this.height = height;
		this.width = width;
		this.ball = new Ball(this);
		this.players = [new Player(this, 0), new Player(this, 1)];
		this.botController = [];
	}

	setBallPos(x: number = this.width / 2, y: number = this.height / 2) {
		this.ball.x = x;
		this.ball.y = y;
	}
	bounceBallX(reset?: boolean) {
		if (reset) {
			this.ball.dx = this.ball.dx < 0 ? -30 : 30;
			this.ball.dy = Math.random() * 120 - 60;
			this.ball.speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
		}
		this.ball.dx *= -1;
		this.ball.speed *= 1.1;
		this.ball.clampSpeed();
		const angle = Math.atan2(this.ball.dy, this.ball.dx);
		this.ball.dx = Math.cos(angle) * this.ball.speed;
		this.ball.dy = Math.sin(angle) * this.ball.speed;
	}
	bounceBallY(...arg: bounceParam) {
		const [player, hitpoint] = arg;

		if (player === null) this.ball.dy *= -1;
		else {
			this.normHitpoint = (2 * hitpoint) / player.size - 1;
			const angle = this.normHitpoint * (Math.PI / 4);
			const dir = this.ball.dx < 0 ? -1 : 1;
			this.ball.dx = Math.cos(angle) * this.ball.speed * dir;
			this.ball.dy = Math.sin(angle) * this.ball.speed;
		}
	}
	private addScore(player: number) {
		this.score[player]++;
		this.bonus = [];
		for (const player of this.players) {
			for (const bonus of player.ActiveBonus) bonus.remove(player);
			player.ActiveBonus = [];
			player.y = this.height / 2 - player.size / 2;
		}
		this.setBallPos();
		this.bounceBallX(true);
		if (this.score[player] === this.maxScore) this.onWin(player as 0 | 1);
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
	getBonusData() {
		return this.bonus.map((b) => ({ name: b.name, y: b.y, radius: b.radius }));
	}
	checkBonusCollision() {
		const player: number = this.ball.dx > 0 ? 0 : 1;
		if (this.ball.x >= this.width / 2 - this.bonusRadius && this.ball.x <= this.width / 2 + this.bonusRadius)
			this.bonus = this.bonus.filter((bonus) => {
				if ((this.ball.x - this.width / 2) * (this.ball.x - this.width / 2) + (this.ball.y - bonus.y) * (this.ball.y - bonus.y) <= (this.ball.radius + bonus.radius) * (this.ball.radius + bonus.radius)) {
					if (bonus.is === "bonus") {
						if (bonus.apply(this.players[player])) this.players[player].ActiveBonus.push(bonus);
					} else {
						bonus.apply(this.players[(player + 1) % 2]);
						this.players[(player + 1) % 2].ActiveBonus.push(bonus);
					}
					return false;
				}
				return true;
			});
	}
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
		this.checkBonusCollision();
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
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p2.bot === "hard") {
			if (this.ball.y < p2.y + p2.size / 2) {
				p2.moveUp(true);
				p2.moveDown(false);
			} else if (this.ball.y > p2.y + p2.size / 2) {
				p2.moveUp(false);
				p2.moveDown(true);
			}
		}
		this.move(p1, dt);
		this.move(p2, dt);
	}
	move(p: Player, dt: number) {
		if (!(p.up && p.down)) {
			if (p.up && p.y > 0) {
				if (p.y - p.speed * dt < 0) p.y = 0;
				else p.y -= p.speed * dt;
			} else if (p.down && p.y + p.size < this.height) {
				if (p.y + p.speed * dt > this.height - p.size) p.y = this.height - p.size;
				else p.y += p.speed * dt;
			}
		}
	}
	updateBonus(dt: number) {
		if (this.bonus.length < this.bonusNb) {
			this.bonusTime -= dt;
			if (this.bonusTime <= 0) {
				let retries = 2;
				let y = Math.floor(Math.random() * (this.height - this.bonusRadius * 2) + this.bonusRadius);
				for (let i = 0; i < this.bonus.length && retries; ) {
					if (Math.abs(this.bonus[i].y - y) < this.bonusRadius * 2) {
						y = Math.floor(Math.random() * (this.height - 2 * this.bonusRadius) + this.bonusRadius);
						i = 0;
						--retries;
						continue;
					}
					++i;
				}
				if (retries) this.bonus.push(new Bigger(y, this.bonusRadius));
				this.bonusTime = DEFAULT_BONUS_TIME;
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
		// debug: verifier l'etat du tableau une fois par seconde
		if (this.elapsedTime >= 1) {
			console.log(`[updateBot] botController.length=${this.botController.length}`);
			console.log(`[updateBot] bot[0]=${this.botController[0] ? 'EXISTS' : 'undefined'}, bot[1]=${this.botController[1] ? 'EXISTS' : 'undefined'}`);
		}
		
		// methode manuelle pour eviter les problemes avec forEach sur sparse arrays
		for (let index = 0; index < this.botController.length; index++) {
			const bot = this.botController[index];
			if (!bot) continue;
			
			bot.aiLag += dt;
			if (bot.aiLag >= 1) {
				console.log(`[Board] Bot ${index} taking decision, aiLag=${bot.aiLag.toFixed(3)}`);
				bot.takeDecision(this, this.players[index]);
				bot.aiLag -= 1;
			}
			bot.update(this.players[index], this, dt);
		}
	}
	update(dt: number) {
		this.elapsedTime += dt;
		if (this.elapsedTime >= 1) {
			console.log("game running");
			// Debug: track paddles once per second
			try {
				const p1 = this.players[0];
				const p2 = this.players[1];
				console.log(`[paddles] p1 y=${p1.y.toFixed(1)} up=${p1.up} down=${p1.down} | p2 y=${p2.y.toFixed(1)} up=${p2.up} down=${p2.down}`);
			} catch {}
			this.elapsedTime -= 1;
		}
		this.updateBonus(dt);
		this.updateBot(dt);
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
		console.log(`[Board] connectBot called: id=${id}, diff=${diff}, training=${training}`);
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
				console.log("debug");
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
		}
		console.log(`[Board] Bot connected at index ${id}, botController.length=${this.botController.length}`);
	}

	restart() {
		this.score = [0, 0];
		this.ball.reset(this);
		for (const player of this.players) player.reset();
		if (this.training && this.botController.length !== 0) {
			if (this.gamesNb % 10 === 0) this.botController[0].save(this.gamesNb);
			if (this.gamesNb % 100 === 0) {
				plotRewards("rewards", this.botController[0].rewards, this.botController[0].type, this.gamesNb);
				plotRewards("epsilons", this.botController[0].epislons, this.botController[0].type, this.gamesNb);
			}
			this.botController[0].newEpisode();
		}
		++this.gamesNb;
	}
	get H(): number {
		return this.height;
	}
	get W(): number {
		return this.width;
	}
	get ballRadius() {
		return this.ball.radius;
	}
	get scores(): [p1: number, p2: number] {
		return this.score;
	}
	set Training(flag: boolean) {
		this.training = flag;
	}
	get Rewards() {
		return this.botController[0].rewards;
	}
}
