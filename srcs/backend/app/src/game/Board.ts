import Player, { type difficulty } from "./Player.ts";
import Ball from "./Ball.ts";
import BotController from "./Controller.ts";
//import { EasyController } from "./Controller.ts";
import Bonus from "./Bonus.ts";
import {Bigger} from "./Bonus.ts";

interface PlayerData {
	size: number;
	y: number;
	score: number;
}

type bounceParam = [player: null] | [player: Player, hitpoint: number];

export default class Board {
	private readonly height: number;
	private readonly width: number;
	private playerSpeed: number = 100;
	players: [Player, Player];
	private ball: Ball;
	private elapsedTime: number = 0;
	bonus: Bonus[] = [];
	private bonusNb: number = 1;
	private bonusTime: number = 1;
	private training: boolean = false;
	private botController: BotController[];
	private aiLag: number = 0;
	private botReward: number = 0;
	private score: [number, number] = [0, 0];
	private gamesNb: number = 0;

	constructor(height: number = 100, width: number = 200) {
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
		}
		this.ball.dx *= -1;
		if (this.ball.dx <= 30) this.ball.dx *= 1.5;
	}
	bounceBallY(...arg: bounceParam) {
		const [player, hitpoint] = arg;

		if (player === null) this.ball.dy *= -1;
		else
			this.ball.dy =
				((2 * hitpoint) / player.size - 1) * Math.abs(this.ball.dx);
	}
	private addScore(player: number) {
		this.score[player]++;
		this.setBallPos();
		this.bounceBallX(true);
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
		return this.bonus.map(b => ({
			name: b.name,
			y: b.y,
		}))
	}
	checkBonusCollision() {
		const player: number = this.ball.dx > 0 ? 0 : 1;
		if (this.ball.x >= this.width / 2 - 10 && this.ball.x <= this.width / 2 + 10)
			this.bonus = this.bonus.filter(bonus => {
				if (Math.pow(this.ball.x - this.width / 2, 2) + Math.pow(this.ball.y - bonus.y, 2) <= Math.pow(this.ball.radius + bonus.radius, 2)){
					if (bonus.is === "bonus"){
						if (bonus.apply(this, this.players[player]))
							this.players[player].ActiveBonus.push(bonus);
					}
					else {
						bonus.apply(this, this.players[(player + 1) % 2]);
						this.players[(player + 1) % 2].ActiveBonus.push(bonus);
					}
					return (false);
				}
				return (true);
			})

		// else if ((x <= this.width / 2 - 10 && nextX > this.width / 2 - 10) ||
		// 		(x >= this.width / 2 + 10 && nextX < this.width / 2 + 10))
		// {
		// }
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
		// if ((x <= this.width / 2 - 10 && nextX > this.width / 2 - 10) || (x >= this.width / 2 + 10 && nextX < this.width / 2 + 10))
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
		this.ball.x = nextX;
		this.ball.y = nextY;
		if (nextX + radius >= this.width) this.addScore(0);
		else if (nextX - radius <= 0) this.addScore(1);
	}
	updatePlayersPosition(dt: number) {
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p2.bot === "hard") {
			// p2.moveUp(false);
			// p2.moveDown(false);
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
				if (p.y + p.speed * dt > this.height - p.size)
					p.y = this.height - p.size;
				else p.y += p.speed * dt;
			}
		}
	}
	updateBonus(dt: number){
		if (this.bonus.length < this.bonusNb){
			this.bonusTime -= dt;
			if (this.bonusTime <= 0){
				this.bonus.push(new Bigger(this.height));
				this.bonusTime = 1;
			}
		}
		for (const player of this.players){
			if (player.ActiveBonus.length === 0)
				continue ;
			player.ActiveBonus = player.ActiveBonus.filter(bonus => {
				bonus.duration -= dt;
				if (bonus.duration <= 0){
					bonus.remove(this, player);
					return (false);
				}
				return (true);
			})
		}
	}
	update(dt: number) {
		this.elapsedTime += dt;
		// console.log(`elapsed time: ${this.elapsedTime}`);
		this.aiLag += dt;
		if (this.aiLag >= 1) {
			for (let i = 0; i < this.botController.length; ++i)
				this.botReward += this.botController[i]?.update(
					this.players[i],
					this
				);
			this.aiLag -= 1;
		}
		this.updateBonus(dt);
		this.updatePlayersPosition(dt);
		this.updateBallPosition(dt);
	}
	getPlayerInput(id: 0 | 1): { up: boolean; down: boolean } {
		return { up: this.players[id].up, down: this.players[id].down };
	}
	connectBot(id: 0 | 1, diff: difficulty) {
		this.players[id].bot = diff;
		switch (diff) {
			case "easy":
				this.botController[id] = new BotController({
					training: this.training,
				});
				break;
			case "medium":
				this.botController[id] = new BotController({
					training: this.training,
				});
				break;
			// case "hard":
			// 	this.botController[id] = new EasyController({training: true});
			// 	break ;
		}
	}

	getReward(player: 0 | 1) {
		//const maxReward = 1;
		//const minReward = -maxReward;

		const yDistance =
			Math.abs(this.players[player].y - this.ball.y) / this.height;
		let reward = Math.exp(-5 * yDistance);

		return reward;
	}
	getState(player: 0 | 1) {
		if (this.ball.y < this.players[player].y) return 0;
		if (this.ball.y > this.players[player].y + this.players[player].size)
			return 2;
		return 1;
	}
	restart() {
		this.score = [0, 0];
		this.ball.reset(this);
		this.players[0].y = this.height / 2;
		this.players[1].y = this.height / 2;
		if (this.training) {
			if (this.gamesNb % 10 == 0)
				this.botController[0].save(this.gamesNb);
			this.botController[0].rewards.push(this.botReward);
			this.botReward = 0;
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
