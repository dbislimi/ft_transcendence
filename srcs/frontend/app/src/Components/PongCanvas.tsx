import { useEffect, useRef } from "react";
import { memo } from "react";

interface Ball {
	x: number;
	y: number;
}

interface prop {
	ball: React.RefObject<{
		x: number;
		y: number;
	}>;
}

function PongCanvas({ ball }: prop) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);
	console.log("pong rendered");
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.width = 200 * 4;
		canvas.height = 100 * 4;
		const c = canvas.getContext("2d");
		if (!c) return;
		const loop = () => {
			c.clearRect(0, 0, canvas.width, canvas.height);
			c.beginPath();
			c.arc(
				ball.current.x * 4,
				ball.current.y * 4,
				5,
				2 * Math.PI,
				0,
				true
			);
			c.fillStyle = "red";
			c.fill();
			frameIdRef.current = requestAnimationFrame(loop);
		};
		frameIdRef.current = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(frameIdRef.current);
	}, []);
	return <canvas ref={canvasRef} className="border-4 absolute"></canvas>;
}

export default memo(PongCanvas);
