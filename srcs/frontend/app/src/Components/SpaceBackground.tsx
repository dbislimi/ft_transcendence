import { useEffect, useRef } from "react";

class Star {
	x: number;
	y: number;
	z: number;
	radius: number;
	private centerX: number;
	private centerY: number;

	constructor(canvas: HTMLCanvasElement) {
		this.centerY = canvas.height / 2;
		this.centerX = canvas.width / 2;
		this.x = Math.random() * this.centerX - this.centerX;
		this.y = Math.random() * this.centerY - this.centerY;
		this.z = Math.random() * 100;
		this.radius = 10 / this.z;
	}
	update(){
		this.z -= 10;
		if (this.z <= 0)
			this.reset();
	}
	reset() {
		this.x = Math.random() * this.centerX - this.centerX;
		this.y = Math.random() * this.centerY - this.centerY;
		this.z = 100;
	}
	draw(c: CanvasRenderingContext2D){
		const offsetX = 100 * (this.x / this.z) + this.centerX;
		const offsetY = 100 * (this.y / this.z) + this.centerY;
		c.beginPath();
		c.arc(offsetX, offsetY, this.radius, 0, 2 * Math.PI, false);
		c.fill();
	}
}

export default function SpaceBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);
	
	useEffect(() => {
		const header = document.querySelector("header");
		const canvas = canvasRef.current;
		if (!canvas || !header) return;
		let Stars: Star[] = [];
		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight - header.offsetHeight;
			Stars = [];
			for (let i = 0; i < 100; ++i) {
				Stars.push(new Star(canvas));
			}
		};
		const c = canvas.getContext("2d");
		if (!c) return;
		
		const loop = () => {
			c.fillStyle = "black";
			c.fillRect(0, 0, canvas.width, canvas.height);
			for (let i = 0; i < Stars.length; ++i) {
				c.fillStyle = "white";
				Stars[i].update();
				Stars[i].draw(c);
			}
			frameIdRef.current = requestAnimationFrame(loop);
		};
		window.addEventListener("resize", resize);
		resize();
		frameIdRef.current = requestAnimationFrame(loop);
		return () => {
			window.removeEventListener("resize", resize);
			cancelAnimationFrame(frameIdRef.current);
		};
	}, []);
	return <canvas className="z-0 absolute" ref={canvasRef} />;
}
