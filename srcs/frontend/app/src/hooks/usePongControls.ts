import { useEffect, useRef } from "react";
import type { Player } from "../types/PongState";

interface UsePongControlsOptions {
	isEnabled: () => boolean;
	send: (payload: any) => void;
	player: Player;
}

export function usePongControls({
	isEnabled,
	send,
	player,
}: UsePongControlsOptions) {
	const enabledRef = useRef(isEnabled);

	useEffect(() => {
		enabledRef.current = isEnabled;
	}, [isEnabled]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			if (!enabledRef.current()) return;
			const key = e.key;
			let payload: { dir: "up" | "down"; id: number } | null = null;
			if (key === "s") payload = { dir: "down", id: 0 };
			else if (key === "w") payload = { dir: "up", id: 0 };
			else if (key === "ArrowDown") payload = { dir: "down", id: 1 };
			else if (key === "ArrowUp") payload = { dir: "up", id: 1 };

			if (payload) {
				const isPress = type === "press";
				const isDown = payload.dir === "down";

				if (isDown) player.movingDown = isPress;
				else player.movingUp = isPress;
				send({ event: "play", body: { type, ...payload } });
			}
		};
		const keydown = (e: KeyboardEvent) => {
			if (!e.repeat) handleKey(e, "press");
		};
		const keyup = (e: KeyboardEvent) => handleKey(e, "release");

		document.addEventListener("keydown", keydown);
		document.addEventListener("keyup", keyup);
		return () => {
			document.removeEventListener("keydown", keydown);
			document.removeEventListener("keyup", keyup);
		};
	}, [send, player]);
}
