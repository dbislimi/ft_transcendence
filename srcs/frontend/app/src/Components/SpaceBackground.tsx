import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useBackground } from "../contexts/BackgroundContext";

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
	getScreenCoords(z: number){
		const offsetX = this.maxDepth / 2 * (this.x / z) + this.width / 2;
		const offsetY = this.maxDepth / 2 * (this.y / z) + this.height / 2;
		return {offsetX, offsetY};
	}
	update(){
		this.z -= this.speed;
		if (this.z <= 10)
			this.reset();
	}
	reset() {
		this.x = Math.random() * this.width - this.width / 2;
		this.y = Math.random() * this.height - this.height / 2;
		this.z = Math.random() * this.maxDepth;
		this.color = colors[Math.floor(Math.random() * colors.length)];
	}
	draw(c: CanvasRenderingContext2D){
		const {offsetX:x1, offsetY:y1} = this.getScreenCoords(this.z);
		const minRadius = 0.2;
		const maxRadius = 2;
		const normZ = (this.maxDepth - this.z) / this.maxDepth;
		const radius =  minRadius + normZ * (maxRadius - minRadius);
		const blur = normZ * 10;
		c.shadowBlur = blur;
		c.shadowColor = this.color;
		if (normZ > 0.4){
			const {offsetX:x2, offsetY:y2} = this.getScreenCoords(this.z + normZ * 100);
			c.beginPath();
			c.moveTo(x2, y2);
			c.lineTo(x1, y1);
			c.strokeStyle = 'rgba(255,255,255,0.6)';
			c.lineWidth = radius;
			c.stroke();
		}
		c.beginPath();
		c.arc(x1, y1, radius, 0, 2 * Math.PI, false);
		c.fillStyle = 'white';
		c.fill();
		c.shadowBlur = 0;
	}
}

export default function SpaceBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameIdRef = useRef<number>(0);
	const location = useLocation();
	const { getBackgroundFor, getGlobalBackgroundKey } = useBackground();

	const shouldRender = useMemo(() => {
		const path = location.pathname || '';
		let key: string = getGlobalBackgroundKey();
		if (path.startsWith('/game')) key = getBackgroundFor('pong');
		else if (path.startsWith('/bomb-party')) key = getBackgroundFor('bombparty');
		return key === 'default' || key === 'space';
	}, [location.pathname, getBackgroundFor, getGlobalBackgroundKey]);
	
	useEffect(() => {
		if (!shouldRender) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		let Stars: Star[] = [];
		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			Stars = [];
			for (let i = 0; i < 500; ++i) {
				Stars.push(new Star(canvas));
			}
		};
		const c = canvas.getContext("2d");
		if (!c) return;
		
		const loop = () => {
			c.fillStyle = "rgba(0,0,0,0.3)";
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
	}, [shouldRender]);
	if (!shouldRender) return null;
	return <canvas className="fixed inset-0 w-full h-full pointer-events-none z-0" ref={canvasRef} />;
}