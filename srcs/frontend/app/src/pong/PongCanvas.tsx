import { memo, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ServerSnapshot, Player, PongState } from "../types/PongState";

interface Props {
	gameRef: MutableRefObject<PongState>;
	side: 0 | 1;
}

const SCALE = 4;
const BALL_RADIUS = 100 / 70;
const PLAYER_SPEED = 90; // back
const FPS = 60;
const SPEED_PER_FRAME = PLAYER_SPEED / FPS;

function drawField(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number
) {
	ctx.fillStyle = "rgba(0,0,0,0.8)";
	ctx.fillRect(0, 0, width, height);
}

function drawScore(
	ctx: CanvasRenderingContext2D,
	p1Score: number,
	p2Score: number,
	width: number,
	height: number
) {
	ctx.font = "300px Audiowide";
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	const p1ScoreX = width / 4;
	const p2ScoreX = (width * 3) / 4;

	ctx.fillText(p1Score.toString(), p1ScoreX, height / 2 + 30);
	ctx.fillText(p2Score.toString(), p2ScoreX, height / 2 + 30);
}

function drawPaddle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number
) {
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.shadowBlur = 10;
	ctx.shadowColor = "white";
	ctx.fill();
}

function drawBall(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
) {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
	ctx.shadowBlur = 10;
	ctx.shadowColor = "rgba(102, 14, 237, 1)";
	ctx.fillStyle = "#f43f5e";
	ctx.fill();
	ctx.shadowBlur = 0;
}

function drawBonuses(
	ctx: CanvasRenderingContext2D,
	bonuses: Array<{ y: number; radius: number }>
) {
	for (const bonus of bonuses) {
		ctx.beginPath();
		ctx.arc(
			100 * 4,
			bonus.y * 4,
			bonus.radius * SCALE,
			0,
			2 * Math.PI,
			false
		);
		ctx.fillStyle = "rgba(31, 226, 200, 1)";
		ctx.fill();
	}
}

const INTERPOLATION_DELAY = 10;

const interpolate = (gameRefCurrent: PongState, side: 0 | 1) => {
	const now = Date.now();
	const renderTime = now - INTERPOLATION_DELAY;
	const buff = gameRefCurrent.serverUpdates;

	let futureUpdate = null;
	let pastUpdate = null;

	for (let i = 0; i < buff.length; ++i){
		if (buff[i].timestamp > renderTime){
			futureUpdate = buff[i];
			pastUpdate = buff[i - 1];
			break;
		}
	}
	if (!pastUpdate || !futureUpdate) return;

	const total = futureUpdate.timestamp - pastUpdate.timestamp;
	const elapsed = renderTime - pastUpdate.timestamp;
	const ratio = elapsed / total;

	const lerp = (start: number, end: number, r: number) => start + (end - start) * r;
	gameRefCurrent.ball.x = lerp(pastUpdate.ball.x, futureUpdate.ball.x, ratio);
	gameRefCurrent.ball.y = lerp(pastUpdate.ball.y, futureUpdate.ball.y, ratio);
	const opp = side === 0 ? "p2" : "p1";
	gameRefCurrent.players[opp].y = lerp(pastUpdate.players[opp].y, futureUpdate.players[opp].y, ratio);
}

function PongCanvas({ gameRef, side }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		const fieldHeight = 100 * SCALE;
		const fieldWidth = 200 * SCALE;
		const playerWidth = fieldWidth / 100;
		if (!canvas) return;
		canvas.width = fieldWidth;
		canvas.height = fieldHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const loop = () => {
			interpolate(gameRef.current, side);
			const { players, ball, bonuses } = gameRef.current;
			const me = side === 0 ? players.p1 : players.p2;
			if (me.movingDown){
				me.y += SPEED_PER_FRAME;
				console.log("down", me.y);
			}	
			if (me.movingUp){
				me.y -= SPEED_PER_FRAME;
				console.log("up", me.y);
			}

			const p1Size = players.p1.size * SCALE;
			const p2Size = players.p2.size * SCALE;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			drawScore(
				ctx,
				players.p1.score,
				players.p2.score,
				canvas.width,
				canvas.height
			);
			drawBonuses(ctx, bonuses);
			drawField(ctx, canvas.width, canvas.height);

			const p1X = playerWidth;
			const p2X = fieldWidth - 2 * playerWidth;

			drawPaddle(ctx, p1X, players.p1.y * SCALE, playerWidth, p1Size);
			drawPaddle(ctx, p2X, players.p2.y * SCALE, playerWidth, p2Size);
			drawBall(ctx, ball.x * 4, ball.y * 4, BALL_RADIUS * SCALE);

			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [gameRef, side]);

	return (
		<canvas
			ref={canvasRef}
			className="z-5 border-4 border-gray border-t-gray-300 border-b-gray-300 rounded-lg"
		/>
	);
}

export default memo(PongCanvas);
