import { useEffect, useRef } from "react";

interface UsePongControlsOptions {
	isEnabled: () => boolean;
	send: (payload: any) => void;
}

export function usePongControls({ isEnabled, send }: UsePongControlsOptions) {
	const enabledRef = useRef(isEnabled);

	useEffect(() => {
		enabledRef.current = isEnabled;
	}, [isEnabled]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			if (!enabledRef.current()) return;
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
	}, [send]);
}
