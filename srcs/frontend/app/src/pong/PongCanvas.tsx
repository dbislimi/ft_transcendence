import { memo, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ServerSnapshot, Player, PongState } from "../types/PongState";

interface Props {
	gameRef: MutableRefObject<PongState>;
	side: 0 | 1;
	interpolationDelayRef: MutableRefObject<number>;
	enableIplusPRef: MutableRefObject<boolean>;
	enableInterpolationRef: MutableRefObject<boolean>;
}


const SCALE = 4;
const BALL_RADIUS = 100 / 70;
const PLAYER_SPEED = 90; // back

function drawField(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number
) {
	// Gradient background
	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, "rgba(15, 23, 42, 0.3)");
	gradient.addColorStop(0.5, "rgba(30, 41, 59, 0.35)");
	gradient.addColorStop(1, "rgba(15, 23, 42, 0.3)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
	
	// Center line
	ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
	ctx.lineWidth = 4;
	ctx.setLineDash([15, 15]);
	ctx.beginPath();
	ctx.moveTo(width / 2, 0);
	ctx.lineTo(width / 2, height);
	ctx.stroke();
	ctx.setLineDash([]);
	
	// Center circle
	ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(width / 2, height / 2, 80, 0, 2 * Math.PI);
	ctx.stroke();
}

function drawScore(
	ctx: CanvasRenderingContext2D,
	p1Score: number,
	p2Score: number,
	width: number,
	height: number
) {
	ctx.font = "300px Audiowide";
	ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
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
	height: number,
	time: number
) {
	// Animate hue over time
	const hue = (time * 10) % 360;
	const color1 = `hsla(${hue}, 80%, 60%, 0.8)`;
	const color2 = `hsla(${(hue + 30) % 360}, 85%, 65%, 1)`;
	const color3 = `hsla(${hue}, 80%, 60%, 0.8)`;
	const shadowColor = `hsla(${hue}, 85%, 65%, 0.8)`;
	
	// Paddle gradient
	const gradient = ctx.createLinearGradient(x, y, x, y + height);
	gradient.addColorStop(0, color1);
	gradient.addColorStop(0.5, color2);
	gradient.addColorStop(1, color3);
	
	ctx.fillStyle = gradient;
	ctx.shadowBlur = 20;
	ctx.shadowColor = shadowColor;
	
	// Rounded rectangle
	const radius = 8;
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, radius);
	ctx.fill();
	
	ctx.shadowBlur = 0;
}

function drawBall(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number
) {
	// Outer glow
	ctx.beginPath();
	ctx.arc(x, y, radius + 4, 0, 2 * Math.PI, false);
	const outerGlow = ctx.createRadialGradient(x, y, radius, x, y, radius + 4);
	outerGlow.addColorStop(0, "rgba(244, 63, 94, 0.6)");
	outerGlow.addColorStop(1, "rgba(244, 63, 94, 0)");
	ctx.fillStyle = outerGlow;
	ctx.fill();
	
	// Main ball
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
	const ballGradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius);
	ballGradient.addColorStop(0, "rgba(252, 165, 165, 1)");
	ballGradient.addColorStop(0.6, "rgba(248, 113, 113, 1)");
	ballGradient.addColorStop(1, "rgba(239, 68, 68, 1)");
	ctx.fillStyle = ballGradient;
	ctx.shadowBlur = 15;
	ctx.shadowColor = "rgba(244, 63, 94, 0.8)";
	ctx.fill();
	ctx.shadowBlur = 0;
}

function drawBonuses(
	ctx: CanvasRenderingContext2D,
	bonuses: Array<{ y: number; radius: number }>
) {
	for (const bonus of bonuses) {
		const x = 100 * 4;
		const y = bonus.y * 4;
		const r = bonus.radius * SCALE;
		
		// Outer glow
		ctx.beginPath();
		ctx.arc(x, y, r + 3, 0, 2 * Math.PI, false);
		const outerGlow = ctx.createRadialGradient(x, y, r, x, y, r + 3);
		outerGlow.addColorStop(0, "rgba(45, 212, 191, 0.6)");
		outerGlow.addColorStop(1, "rgba(45, 212, 191, 0)");
		ctx.fillStyle = outerGlow;
		ctx.fill();
		
		// Main bonus
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2 * Math.PI, false);
		const gradient = ctx.createRadialGradient(x - r/3, y - r/3, 0, x, y, r);
		gradient.addColorStop(0, "rgba(153, 246, 228, 1)");
		gradient.addColorStop(0.5, "rgba(94, 234, 212, 1)");
		gradient.addColorStop(1, "rgba(45, 212, 191, 1)");
		ctx.fillStyle = gradient;
		ctx.shadowBlur = 15;
		ctx.shadowColor = "rgba(45, 212, 191, 0.8)";
		ctx.fill();
		ctx.shadowBlur = 0;
	}
}

const getLatestSnapshot = (buff: ServerSnapshot[]) => buff.length > 0 ? buff[buff.length - 1] : null;

const interpolate = (gameRefCurrent: PongState, side: 0 | 1, interpolationDelay: number, enableInterpolation: boolean) => {
	const buff = gameRefCurrent.serverUpdates;
	const opp = side === 0 ? "p2" : "p1";
	
	if (!enableInterpolation) {
		const latest = getLatestSnapshot(buff);
		if (latest) {
			gameRefCurrent.players[opp].y = latest.players[opp].y;
			gameRefCurrent.ball.x = latest.ball.x;
			gameRefCurrent.ball.y = latest.ball.y;
		}
		return;
	}
	
	const now = Date.now();
	const renderTime = now - interpolationDelay;
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

	const ballDistX = Math.abs(futureUpdate.ball.x - pastUpdate.ball.x);
	const isTeleport = ballDistX > 50;

	if (isTeleport) {
		gameRefCurrent.players[opp].y = futureUpdate.players[opp].y;
		gameRefCurrent.ball.x = futureUpdate.ball.x;
		gameRefCurrent.ball.y = futureUpdate.ball.y;
		return;
	}
	const total = futureUpdate.timestamp - pastUpdate.timestamp;
	const elapsed = renderTime - pastUpdate.timestamp;
	const ratio = elapsed / total;
	const lerp = (start: number, end: number, r: number) => start + (end - start) * r;
	gameRefCurrent.ball.x = lerp(pastUpdate.ball.x, futureUpdate.ball.x, ratio);
	gameRefCurrent.ball.y = lerp(pastUpdate.ball.y, futureUpdate.ball.y, ratio);
	gameRefCurrent.players[opp].y = lerp(pastUpdate.players[opp].y, futureUpdate.players[opp].y, ratio);
}

function PongCanvas({ gameRef, side, interpolationDelayRef, enableIplusPRef, enableInterpolationRef }: Props) {
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

		let lastFrameTime = performance.now();
		const startTime = performance.now();
		const loop = (now: number) => {
			const deltaTime = (now - lastFrameTime) / 1000;
			const elapsedTime = (now - startTime) / 1000;
			lastFrameTime = now;
			interpolate(gameRef.current, side, interpolationDelayRef.current, enableInterpolationRef.current);			
			const { players, ball, bonuses } = gameRef.current;
			const me = side === 0 ? players.p1 : players.p2;
			
			if (enableIplusPRef.current) {
				const move = PLAYER_SPEED * deltaTime;
				if (me.movingDown) {
					me.y = Math.min(me.y + move, 100 - me.size);
				}
				if (me.movingUp) {
					me.y = Math.max(me.y - move, 0);
				}
			} else {
				const latest = getLatestSnapshot(gameRef.current.serverUpdates);
				if (latest) {
					const serverMe = side === 0 ? latest.players.p1 : latest.players.p2;
					me.y = serverMe.y;
				}
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

			drawPaddle(ctx, p1X, players.p1.y * SCALE, playerWidth, p1Size, elapsedTime);
			drawPaddle(ctx, p2X, players.p2.y * SCALE, playerWidth, p2Size, elapsedTime);
			drawBall(ctx, ball.x * 4, ball.y * 4, BALL_RADIUS * SCALE);

			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [gameRef, side, interpolationDelayRef, enableIplusPRef, enableInterpolationRef]);

	return (
		<canvas
			ref={canvasRef}
			className="z-5 border-4 border-slate-700 shadow-2xl shadow-indigo-500/20 rounded-2xl"
		/>
	);
}

export default memo(PongCanvas);
