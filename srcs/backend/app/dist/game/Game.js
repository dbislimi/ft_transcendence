import Board from "./Board.ts";
let GAMESPEED = 1;
export default class Game {
    board;
    clients;
    timeoutId = null;
    prevTime;
    maxScore = 5;
    static TICK_RATE = 1000 / 60;
    onEnd;
    onAbort;
    signal = undefined;
    timestamp;
    constructor(p1, p2, onEnd) {
        this.onEnd = onEnd;
        this.board = new Board();
        if (typeof p2 === "object") {
            this.clients = [p1, p2];
            return;
        }
        this.clients = [p1, undefined];
        if (p2 === undefined)
            return;
        if (p2[0] !== "t")
            this.board.connectBot(1, p2);
        else {
            console.log("connectbot ", p2);
            this.board.Training = true;
            GAMESPEED = 100;
            this.board.connectBot(1, "hard");
            this.board.connectBot(0, p2.slice(5));
        }
    }
    send(data, cb) {
        for (const ws of this.clients)
            ws?.send(data, cb);
    }
    startAsync(signal) {
        this.signal = signal;
        return new Promise((resolve, reject) => {
            this.onAbort = () => {
                this.pause();
                signal.removeEventListener("abort", this.onAbort);
                reject(new Error("Training aborted."));
            };
            signal.addEventListener("abort", this.onAbort);
            this.onEnd = resolve;
            this.restart();
        });
    }
    start() {
        this.prevTime = performance.now();
        this.gameLoop();
    }
    pause() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    stop(winner) {
        this.pause();
        this.signal?.removeEventListener("abort", this.onAbort);
        const data = { event: "win", body: winner };
        this.send(JSON.stringify(data));
        this.onEnd?.();
    }
    restart() {
        this.board.restart();
        this.start();
    }
    up(type, player) {
        if (!this.board.players[player].up && type === "press") {
            this.board.players[player].moveUp(true);
            this.timestamp = Date.now();
        }
        else if (this.board.players[player].up && type === "release") {
            this.board.players[player].moveUp(false);
            console.log("timestamp:", Date.now() - this.timestamp);
            this.timestamp = 0;
        }
    }
    down(type, player) {
        if (!this.board.players[player].down && type === "press")
            this.board.players[player].moveDown(true);
        else if (this.board.players[player].down && type === "release")
            this.board.players[player].moveDown(false);
    }
    move(type, dir, player) {
        if (dir === "up")
            this.up(type, player);
        else
            this.down(type, player);
    }
    setBall(x, y) {
        this.board.setBallPos(x, y);
    }
    gameLoop() {
        const now = performance.now();
        let deltaTime = ((now - this.prevTime) / 1000) * GAMESPEED;
        const MAX_DELTA = 0.1;
        deltaTime = Math.min(deltaTime, MAX_DELTA);
        this.prevTime = now;
        const winner = this.board.scores.findIndex((n) => n === this.maxScore);
        if (winner !== -1) {
            this.stop(winner);
            return;
        }
        this.board.update(deltaTime);
        const data = {
            event: "data",
            body: {
                ball: {
                    ...this.board.getBallData(),
                    speed: (this.board.getBallSpeed() * 3.6).toFixed(2),
                },
                players: this.board.getPlayersData(),
                bonus: {
                    count: this.board.bonus.length,
                    bonuses: this.board.getBonusData(),
                },
            },
        };
        this.send(JSON.stringify(data));
        const elapsed = performance.now() - now;
        const delay = Math.max(0, Game.TICK_RATE - elapsed);
        this.timeoutId = setTimeout(() => this.gameLoop(), delay);
    }
}
