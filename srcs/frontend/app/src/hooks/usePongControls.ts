import { useEffect, useRef, type MutableRefObject } from "react";
import type { Player } from "../types/PongState";
import { withLag } from "../utils/NetworkSimulator";

export interface PendingInput {
	inputId: number;
	dir: "up" | "down";
	type: "press" | "release";
	inputOwnerId: number;
	timestamp: number;
}

interface UsePongControlsOptions {
	isEnabled: () => boolean;
	send: (payload: any) => void;
	getPlayer: (id: number) => Player;
	pendingInputsRefs: MutableRefObject<[PendingInput[], PendingInput[]]>;
	inputIdRefs: MutableRefObject<[number, number]>;
	isLocalMode: boolean;
}

export function usePongControls({
	isEnabled,
	send,
	getPlayer,
	pendingInputsRefs,
	inputIdRefs,
	isLocalMode,
}: UsePongControlsOptions) {
	const enabledRef = useRef(isEnabled);

	useEffect(() => {
		enabledRef.current = isEnabled;
	}, [isEnabled]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			if (!enabledRef.current()) return;
			const key = e.key;
			let payload: {
				inputId: number;
				dir: "up" | "down";
				id: number;
				timestamp: number;
			} | null = null;
			if (key === "s") {
				payload = {
					inputId: inputIdRefs.current[0]++,
					dir: "down",
					id: 0,
					timestamp: Date.now(),
				};
			} else if (key === "w") {
				payload = {
					inputId: inputIdRefs.current[0]++,
					dir: "up",
					id: 0,
					timestamp: Date.now(),
				};
			} else if (key === "ArrowDown" && isLocalMode) {
				payload = {
					inputId: inputIdRefs.current[1]++,
					dir: "down",
					id: 1,
					timestamp: Date.now(),
				};
			} else if (key === "ArrowUp" && isLocalMode) {
				payload = {
					inputId: inputIdRefs.current[1]++,
					dir: "up",
					id: 1,
					timestamp: Date.now(),
				};
			}

			if (payload) {
				const player = getPlayer(payload.id);
				const isPress = type === "press";
				const isDown = payload.dir === "down";
				if (isDown) player.movingDown = isPress;
				else player.movingUp = isPress;
				pendingInputsRefs.current[payload.id].push({
					inputId: payload.inputId,
					dir: payload.dir,
					type: type,
					inputOwnerId: payload.id,
					timestamp: payload.timestamp,
				});
				withLag(() =>
					send({ event: "play", body: { type, ...payload } })
				);
			}
		};
		const keydown = (e: KeyboardEvent) => {
			if (isLocalMode && (e.key === "ArrowUp" || e.key === "ArrowDown"))
				e.preventDefault();
			if (!e.repeat) handleKey(e, "press");
		};
		const keyup = (e: KeyboardEvent) => {
			if (isLocalMode && (e.key === "ArrowUp" || e.key === "ArrowDown"))
				e.preventDefault();
			handleKey(e, "release");
		};

		document.addEventListener("keydown", keydown);
		document.addEventListener("keyup", keyup);
		return () => {
			document.removeEventListener("keydown", keydown);
			document.removeEventListener("keyup", keyup);
		};
	}, [send, getPlayer, pendingInputsRefs, inputIdRefs, isLocalMode]);
}
