import { useEffect } from "react";

interface UsePongControlsOptions {
	enabled: boolean;
	send: (payload: any) => void;
}

export function usePongControls({ enabled, send }: UsePongControlsOptions) {
	useEffect(() => {
		if (!enabled) return;

		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			const key = e.key;
			let payload: { dir: "up" | "down"; id: number } | null = null;
			if (["Shift", "s"].includes(key)) payload = { dir: "down", id: 0 };
			else if (["ArrowDown"].includes(key))
				payload = { dir: "down", id: 1 };
			else if ([" ", "w"].includes(key)) payload = { dir: "up", id: 0 };
			else if (["ArrowUp"].includes(key)) payload = { dir: "up", id: 1 };
			if (payload) {
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
	}, [enabled, send]);
}
