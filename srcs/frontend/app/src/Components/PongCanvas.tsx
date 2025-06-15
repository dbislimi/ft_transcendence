import { useEffect, useRef } from "react";
import { memo } from "react";
import type { Players, Ball } from "../pages/Game";

interface prop {
	ball: React.RefObject<Ball>;
	players: React.RefObject<Players>;
	scale: number;
}

function PongCanvas({ ball, players, scale }: prop) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);
	console.log("pong rendered");
	useEffect(() => {
		console.log("useeffect");
		const canvas = canvasRef.current;
		const fieldHeight = 100 * scale;
		const fieldWidth = 200 * scale;
		const playerWidth = (fieldWidth / 50);
		if (!canvas) return;
		canvas.width = fieldWidth;
		canvas.height = fieldHeight;
		const c = canvas.getContext("2d");
		//canvas.addEventListener("keydown", (event) => {
		//	const key = event.key;
		//	console.log("key: ", key);
		//})
		if (!c) return;
		const loop = () => {
			const p1Size = players.current.p1.size * scale;
			const p2Size = players.current.p2.size * scale;
			c.clearRect(0, 0, canvas.width, canvas.height);
			c.rect(
				playerWidth,
				players.current.p1.y * scale,
				playerWidth,
				p1Size
			);
			c.rect(
				fieldWidth - 2 * playerWidth,
				players.current.p2.y * scale,
				playerWidth,
				p2Size
			);
			c.fillStyle = "blue";
			c.fill();
			c.beginPath();
			c.arc(
				ball.current.x * 4,
				ball.current.y * 4,
				ball.current.radius * scale,
				0,
				2 * Math.PI,
				false
			);
			c.fillStyle = "red";
			c.fill();
			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, [scale]);
	return <canvas ref={canvasRef} className="border absolute"></canvas>;
}

export default memo(PongCanvas);
