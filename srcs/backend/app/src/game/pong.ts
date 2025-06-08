import Field from "./types";
import { performance } from 'perf_hooks';


function main(){
	const game: Field = new Field();
	let prevTime: number = performance.now();

	const TICK_RATE = 1000 / 60;

	const gameLoop = () => {
		const now = performance.now();
		const deltaTime = (now - prevTime) / 1000;
		prevTime = now;

		game.updateBallPosition(deltaTime);
		render();

		const elapsed = performance.now() - now;
		const delay = Math.max(0, TICK_RATE - elapsed);
		setTimeout(gameLoop, delay);
	}
	setTimeout(gameLoop, TICK_RATE);
}

main();