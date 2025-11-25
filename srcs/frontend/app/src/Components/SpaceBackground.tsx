import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useBackground } from "../contexts/BackgroundContext";
import { useGlobalBackground } from "../contexts/GlobalBackgroundContext";
import { Application, Graphics, Sprite, Container, Texture } from "pixi.js";

const colors = [0xf23041, 0xf241e6, 0x8c2a86, 0x162059, 0x41f2f2];
const STAR_DENSITY_PER_MEGAPIXEL = 2000;
const PARALLAX_FACTOR = 0.09;
const PARALLAX_SMOOTHING = 0.023;

class Star {
	x: number;
	y: number;
	z: number;
	color: number;
	width: number;
	height: number;
	core: Sprite;
	glow: Sprite;
	static readonly maxDepth: number = 10000;
	static readonly speed: number = 10;

	constructor(
		width: number,
		height: number,
		coreTexture: Texture,
		glowTexture: Texture
	) {
		this.width = width;
		this.height = height;
		this.x = Math.random() * this.width - this.width / 2;
		this.y = Math.random() * this.height - this.height / 2;
		this.z = Math.random() * Star.maxDepth;
		this.color = colors[Math.floor(Math.random() * colors.length)];

		this.core = new Sprite(coreTexture);
		this.core.anchor.set(0.5);

		this.glow = new Sprite(glowTexture);
		this.glow.anchor.set(0.5);
		this.glow.tint = this.color;
		this.glow.alpha = 0.9;
	}

	getScreenCoords(z: number) {
		const focal = Star.maxDepth / 2;
		const offsetX = focal * (this.x / z) + this.width / 2;
		const offsetY = focal * (this.y / z) + this.height / 2;
		return { x: offsetX, y: offsetY };
	}

	isOffscreen({ x, y }: { x: number; y: number }, padding: number = 0) {
		return (
			x < -padding ||
			x > this.width + padding ||
			y < -padding ||
			y > this.height + padding
		);
	}

	update() {
		this.z -= Star.speed;
		if (this.z <= 10) this.reset();
	}

	reset() {
		this.x = Math.random() * this.width - this.width / 2;
		this.y = Math.random() * this.height - this.height / 2;
		this.z = Star.maxDepth;
		this.color = colors[Math.floor(Math.random() * colors.length)];
		this.glow.tint = this.color;
	}
}

export default function SpaceBackground() {
	const containerRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<Application | null>(null);
	const starsRef = useRef<Star[]>([]);
	const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const centerOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const location = useLocation();
	const { getGlobalBackgroundKey, getBackgroundFor } = useBackground();
	const { currentBackground } = useGlobalBackground();

	const shouldRender = useMemo(() => {
		return (
			currentBackground.id === "default" ||
			currentBackground.id === "space"
		);
	}, [currentBackground.id]);

	useEffect(() => {
		if (!shouldRender) return;
		const e = containerRef.current;
		if (!e) return;

		let cancelled = false;
		let loop: (() => void) | null = null;
		let onResize: (() => void) | null = null;
		let handleVisibility: (() => void) | null = null;
		let onPointerMove: ((ev: PointerEvent) => void) | null = null;
		const app = new Application();

		const init = async () => {
			await app.init({
				width: window.innerWidth,
				height: window.innerHeight,
				antialias: false,
				backgroundAlpha: 0,
				resolution: 1,
				autoStart: false,
			});
			if (cancelled) {
				app.destroy(true);
				return;
			}
			appRef.current = app;
			e.appendChild(app.canvas);

			const makeCoreTexture = () => {
				const g = new Graphics();
				g.circle(0, 0, 2).fill(0xffffff);
				const tex = app.renderer.generateTexture(g);
				g.destroy();
				return tex;
			};

			const makeGlowTexture = () => {
				const g = new Graphics();
				const steps = 4;
				const base = 3;
				for (let i = steps; i >= 1; i--) {
					const r = base * i;
					const alpha = 0.15 * (i / steps);
					g.circle(0, 0, r).fill({ color: 0xffffff, alpha });
				}
				const tex = app.renderer.generateTexture(g);
				g.destroy();
				return tex;
			};

			const coreTexture = makeCoreTexture();
			const glowTexture = makeGlowTexture();

			const starsLayer = new Container();
			app.stage.addChild(starsLayer);

			const attachSprites = (s: Star) => {
				starsLayer.addChild(s.glow);
				starsLayer.addChild(s.core);
			};

			const detachSprites = () => {
				const removed = starsLayer.removeChildren();
				for (const child of removed) child.destroy();
			};

			const init_stars = () => {
				const w = app.renderer.width;
				const h = app.renderer.height;
				const stars: Star[] = [];
				detachSprites();
				const area = w * h;
				const target = Math.max(
					0,
					Math.round((area / 1000000) * STAR_DENSITY_PER_MEGAPIXEL)
				);
				for (let i = 0; i < target; i++) {
					const s = new Star(w, h, coreTexture, glowTexture);
					attachSprites(s);
					stars.push(s);
				}
				starsRef.current = stars;
			};

			init_stars();
			pointerRef.current.x = app.renderer.width / 2;
			pointerRef.current.y = app.renderer.height / 2;

			loop = () => {
				const stars = starsRef.current;
				const w = app.renderer.width;
				const h = app.renderer.height;

				const cx = w / 2;
				const cy = h / 2;
				const dx = pointerRef.current.x - cx;
				const dy = pointerRef.current.y - cy;
				const targetX = -dx * PARALLAX_FACTOR;
				const targetY = -dy * PARALLAX_FACTOR;
				centerOffsetRef.current.x +=
					(targetX - centerOffsetRef.current.x) * PARALLAX_SMOOTHING;
				centerOffsetRef.current.y +=
					(targetY - centerOffsetRef.current.y) * PARALLAX_SMOOTHING;

				for (const s of stars) {
					s.width = w;
					s.height = h;
					s.update();

					const minRadius = 0.2;
					const maxRadius = 2.2;
					const normZ = (Star.maxDepth - s.z) / Star.maxDepth;
					const radius = minRadius + normZ * (maxRadius - minRadius);
					const pos = s.getScreenCoords(s.z);

					pos.x += centerOffsetRef.current.x;
					pos.y += centerOffsetRef.current.y;

					if (s.isOffscreen(pos, 500)) {
						s.reset();
						continue;
					}

					s.core.position.set(pos.x, pos.y);
					s.core.scale.set(radius / 2);
					s.core.alpha = Math.min(1, 0.4 + 0.6 * normZ);

					s.glow.position.set(pos.x, pos.y);
					s.glow.scale.set(radius / 3);
					s.glow.alpha = Math.min(1, 0.3 + 0.6 * normZ);
				}
			};

			app.ticker.add(loop);

			onResize = () => {
				app.renderer.resize(window.innerWidth, window.innerHeight);
				init_stars();
			};
			onPointerMove = (ev: PointerEvent) => {
				pointerRef.current.x = ev.clientX;
				pointerRef.current.y = ev.clientY;
			};
			handleVisibility = () => {
				if (document.hidden) app.ticker.maxFPS = 10;
				else app.ticker.maxFPS = 50;
			};
			app.start();
			document.addEventListener("visibilitychange", handleVisibility);
			window.addEventListener("resize", onResize);
			window.addEventListener("pointermove", onPointerMove);
			app.ticker.maxFPS = 50;
		};

		init();

		return () => {
			cancelled = true;
			const a = appRef.current;
			if (onResize) window.removeEventListener("resize", onResize);
			if (handleVisibility)
				document.removeEventListener(
					"visibilitychange",
					handleVisibility
				);
			if (onPointerMove)
				window.removeEventListener("pointermove", onPointerMove);
			if (a) {
				if (loop) a.ticker.remove(loop);
				a.stop();
				a.destroy(true);
				appRef.current = null;
			}
		};
	}, [shouldRender]);

	if (!shouldRender) return null;
	return (
		<div
			ref={containerRef}
			className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-black"
		>
			<div className="absolute inset-0 bg-black/30 pointer-events-none z-1" />
		</div>
	);
}
