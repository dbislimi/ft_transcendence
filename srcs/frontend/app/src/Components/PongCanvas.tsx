import { memo, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { GameState } from "../types/GameState";

interface Props {
	gameRef: RefObject<GameState>;
	scale: number;
	cosmetics: {
		preferredSide: string;
		paddleColor: string;
		ballColor: string;
	};
	opponentPaddleColor?: string;
	side: number | null;
}

function PongCanvas({
	gameRef,
	scale,
	cosmetics,
	opponentPaddleColor,
	side,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);

	const colorMap: Record<string, string> = {
		Cyan: "#06b6d4",
		Emerald: "#10b981",
		Rose: "#f43f5e",
		Blue: "#3b82f6",
		Amber: "#f59e0b",
		White: "#ffffff",
	};

	const getColor = (name: string) => colorMap[name] || "#ffffff";

	const shouldMirror =
		cosmetics.preferredSide === "right" ? side === 0 : side === 1;

	useEffect(() => {
		const canvas = canvasRef.current;
		const fieldHeight = 100 * scale;
		const fieldWidth = 200 * scale;
		const playerWidth = fieldWidth / 100;
		if (!canvas) return;
		canvas.width = fieldWidth;
		canvas.height = fieldHeight;
		const c = canvas.getContext("2d");
		if (!c) return;
		const mirrorX = (x: number) => (shouldMirror ? canvas.width - x : x);

		const loop = () => {
			if (!gameRef.current) return;
			const { players, ball, bonuses } = gameRef.current;
			const p1Size = players.p1.size * scale;
			const p2Size = players.p2.size * scale;
			c.clearRect(0, 0, canvas.width, canvas.height);

			c.beginPath();
			c.font = "300px Audiowide";
			c.fillStyle = "white";
			c.textAlign = "center";
			c.textBaseline = "middle";

			const p1ScoreX = shouldMirror
				? (canvas.width * 3) / 4
				: canvas.width / 4;
			const p2ScoreX = shouldMirror
				? canvas.width / 4
				: (canvas.width * 3) / 4;

			c.fillText(
				players.p1.score.toString(),
				p1ScoreX,
				canvas.height / 2 + 30
			);
			c.fillText(
				players.p2.score.toString(),
				p2ScoreX,
				canvas.height / 2 + 30
			);
			for (const bonus of bonuses.bonuses) {
				c.arc(
					mirrorX(100 * 4),
					bonus.y * 4,
					bonus.radius * scale,
					0,
					2 * Math.PI,
					false
				);
				c.fillStyle = "rgba(119, 45, 237, 1)";
				c.fill();
			}
			c.fillStyle = "rgba(0,0,0,0.8)";
			c.fillRect(0, 0, canvas.width, canvas.height);
			c.beginPath();
			const p1X = shouldMirror
				? canvas.width - 2 * playerWidth
				: playerWidth;
			const p2X = shouldMirror
				? canvas.width - fieldWidth + playerWidth
				: fieldWidth - 2 * playerWidth;

			c.rect(p1X, players.p1.y * scale, playerWidth, p1Size);
			const isP1Opponent = side !== 0;
			c.fillStyle = isP1Opponent
				? opponentPaddleColor ?? "#ffffff"
				: getColor(cosmetics.paddleColor);
			c.shadowBlur = 10;
			c.shadowColor = "white";
			c.fill();

			c.beginPath();
			c.rect(p2X, players.p2.y * scale, playerWidth, p2Size);
			const isP2Opponent = side !== 1;
			c.fillStyle = isP2Opponent
				? opponentPaddleColor ?? "#ffffff"
				: getColor(cosmetics.paddleColor);
			c.shadowBlur = 10;
			c.shadowColor = "white";
			c.fill();
			c.beginPath();
			c.arc(
				mirrorX(ball.x * 4),
				ball.y * 4,
				ball.radius * scale,
				0,
				2 * Math.PI,
				false
			);
			c.shadowBlur = 10;
			c.shadowColor = "rgba(102, 14, 237, 1)";
			c.fillStyle = getColor(cosmetics.ballColor);
			c.fill();
			c.shadowBlur = 0;
			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [gameRef, scale, cosmetics, opponentPaddleColor, side]);
	return (
		<canvas
			ref={canvasRef}
			className="z-5 border-4 border-gray border-t-gray-300 border-b-gray-300 rounded-lg"
		/>
	);
}

export default memo(PongCanvas);
