
import { memo, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { GameState } from "../types/GameState";

interface Props {
	gameRef: MutableRefObject<GameState>
}
const SCALE = 4;
const BALL_RADIUS = 100 / 70;
function PongCanvas({
	gameRef
}: Props) {
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
		const c = canvas.getContext("2d");
		if (!c) return;

		const loop = () => {
			const { players, ball, bonuses } = gameRef.current;
			const p1Size = players.p1.size * SCALE;
			const p2Size = players.p2.size * SCALE;
			c.clearRect(0, 0, canvas.width, canvas.height);

			c.beginPath();
			c.font = "300px Audiowide";
			c.fillStyle = "white";
			c.textAlign = "center";
			c.textBaseline = "middle";

			const p1ScoreX = canvas.width / 4;
			const p2ScoreX = (canvas.width * 3) / 4;

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
			for (const bonus of bonuses) {
				c.arc(
					100 * 4,
					bonus.y * 4,
					bonus.radius * SCALE,
					0,
					2 * Math.PI,
					false
				);
				c.fillStyle = "rgba(31, 226, 200, 1)";
				c.fill();
			}
			c.fillStyle = "rgba(0,0,0,0.8)";
			c.fillRect(0, 0, canvas.width, canvas.height);
			c.beginPath();
			const p1X = playerWidth;
			const p2X = fieldWidth - 2 * playerWidth;

			c.rect(p1X, players.p1.y * SCALE, playerWidth, p1Size);
			c.shadowBlur = 10;
			c.shadowColor = "white";
			c.fill();

			c.beginPath();
			c.rect(p2X, players.p2.y * SCALE, playerWidth, p2Size);
			c.shadowBlur = 10;
			c.shadowColor = "white";
			c.fill();
			c.beginPath();
			c.arc(
				ball.x * 4,
				ball.y * 4,
				BALL_RADIUS * SCALE,
				0,
				2 * Math.PI,
				false
			);
			c.shadowBlur = 10;
			c.shadowColor = "rgba(102, 14, 237, 1)";
			c.fillStyle = "#f43f5e";
			c.fill();
			c.shadowBlur = 0;
			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [gameRef, SCALE]);
	return (
		<canvas
			ref={canvasRef}
			className="z-5 border-4 border-gray border-t-gray-300 border-b-gray-300 rounded-lg"
		/>
	);
}

export default memo(PongCanvas);
