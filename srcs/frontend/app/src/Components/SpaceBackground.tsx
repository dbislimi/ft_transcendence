import { useEffect, useRef } from "react";

const colors = ["#F23041", "#F241E6", "#8C2A86", "#162059", "#41F2F2"];

class Star {
	x: number;
	y: number;
	z: number;
	private color: string;
	private height: number;
	private width: number;
	private maxDepth: number = 10000;
	private speed: number = 10;

	constructor(canvas: HTMLCanvasElement) {
		this.height = canvas.height;
		this.width = canvas.width;
		this.x = Math.random() * this.width - this.width / 2;
		this.y = Math.random() * this.height - this.height / 2;
		this.z = Math.random() * this.maxDepth;
		this.color = colors[Math.floor(Math.random() * colors.length)];
	}
	update(){
		this.z -= this.speed;
		if (this.z <= 0)
			this.reset();
	}
	reset() {
		this.x = Math.random() * this.width - this.width / 2;
		this.y = Math.random() * this.height - this.height / 2;
		this.z = Math.random() * this.maxDepth;
		this.color = colors[Math.floor(Math.random() * colors.length)];
	}
	draw(c: CanvasRenderingContext2D){
		const offsetX = this.maxDepth / 2 * (this.x / this.z) + this.width / 2;
		const offsetY = this.maxDepth / 2 * (this.y / this.z) + this.height / 2;
		const minRadius = 0.2;
		const maxRadius = 2;
		const normZ = (this.maxDepth - this.z) / this.maxDepth;
		const radius =  minRadius + normZ * (maxRadius - minRadius);
		const blur = normZ * 10;
		c.shadowBlur = blur;
		c.shadowColor = this.color;
		c.beginPath();
		c.arc(offsetX, offsetY, radius, 0, 2 * Math.PI, false);
		c.fill();
		c.shadowBlur = 0;
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
			for (let i = 0; i < 400; ++i) {
				Stars.push(new Star(canvas));
			}
		};
		const c = canvas.getContext("2d");
		if (!c) return;
		
		const loop = () => {
			c.fillStyle = "rgba(0,0,0,0.1)";
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
