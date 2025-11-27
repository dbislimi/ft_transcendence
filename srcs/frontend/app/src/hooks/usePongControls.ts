import { useEffect, useRef } from "react";

interface UsePongControlsOptions {
	isEnabled: () => boolean;
	send: (payload: any) => void;
	preferredSide: string;
	side: number | null;
}

export function usePongControls({
	isEnabled,
	send,
	preferredSide,
	side,
}: UsePongControlsOptions) {
	const enabledRef = useRef(isEnabled);
	const shouldMirror = preferredSide === "right" ? side === 0 : side === 1;

	useEffect(() => {
		enabledRef.current = isEnabled;
	}, [isEnabled]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			if (!enabledRef.current()) return;
			const key = e.key;
			let payload: { dir: "up" | "down"; id: number } | null = null;
			if (["Shift", "s"].includes(key))
				payload = { dir: "down", id: shouldMirror ? 1 : 0 };
			else if (["ArrowDown"].includes(key))
				payload = { dir: "down", id: shouldMirror ? 0 : 1 };
			else if ([" ", "w"].includes(key))
				payload = { dir: "up", id: shouldMirror ? 1 : 0 };
			else if (["ArrowUp"].includes(key))
				payload = { dir: "up", id: shouldMirror ? 0 : 1 };
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
	}, [send, preferredSide, side]);
}
