import { useEffect, useRef } from "react";
import { memo } from "react";
import type { Players, Ball, Bonus } from "../pages/Pong";

interface GameRefShape {
	ball: Ball;
	players: Players;
	bonus: Bonus;
}

interface Props {
	gameRef: React.RefObject<GameRefShape>;
	scale: number;
}

function PongCanvas({ gameRef, scale }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);
	console.log("pong rendered");
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
		const loop = () => {
			if (!gameRef.current) return;
			const { players, ball, bonus } = gameRef.current;
			const p1Size = players.p1.size * scale;
			const p2Size = players.p2.size * scale;
			c.clearRect(0, 0, canvas.width, canvas.height);
			c.beginPath();
			c.font = "300px Audiowide";
			c.fillStyle = "black";
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillText(
				players.p1.score.toString(),
				canvas.width / 4,
				canvas.height / 2 + 30
			);
			c.fillText(
				players.p2.score.toString(),
				(canvas.width * 3) / 4,
				canvas.height / 2 + 30
			);
			for (const bonuses of bonus.bonuses) {
				c.arc(
					100 * 4,
					bonuses.y * 4,
					bonuses.radius * scale,
					0,
					2 * Math.PI,
					false
				);
				c.fillStyle = "rgba(119, 45, 237, 1)";
				c.fill();
			}
			c.fillStyle = "rgba(0,0,0,0.8)";
			c.fillRect(0, 0, canvas.width, canvas.height);
			c.font = "15px Audiowide";
			c.fillStyle = "white";
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillText(ball.speed.toString() + " km/h", canvas.width / 2, 20);
			c.beginPath();
			c.rect(playerWidth, players.p1.y * scale, playerWidth, p1Size);
			c.rect(
				fieldWidth - 2 * playerWidth,
				players.p2.y * scale,
				playerWidth,
				p2Size
			);
			c.fillStyle = "rgba(42, 233, 255, 0.8)";
			c.shadowBlur = 10;
			c.shadowColor = "white";
			c.fill();
			c.beginPath();
			c.arc(
				ball.x * 4,
				ball.y * 4,
				ball.radius * scale,
				0,
				2 * Math.PI,
				false
			);
			c.shadowBlur = 10;
			c.shadowColor = "rgba(102, 14, 237, 1)";
			c.fillStyle = "rgba(189, 45, 237, 1)";
			c.fill();
			c.shadowBlur = 0;
			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [gameRef, scale]);
	return (
		<canvas
			ref={canvasRef}
			className="z-5 border-4 border-gray border-t-gray-300 border-b-gray-300 rounded-lg"
		/>
	);
}

export default memo(PongCanvas);
