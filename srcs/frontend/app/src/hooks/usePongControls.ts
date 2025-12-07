import React, { useEffect, useRef } from "react";
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
	player: Player;
	pendingInputsRef: React.MutableRefObject<PendingInput[]>;
	inputIdRef: React.MutableRefObject<number>;
}

export function usePongControls({
	isEnabled,
	send,
	player,
	pendingInputsRef,
	inputIdRef,
}: UsePongControlsOptions) {
	const enabledRef = useRef(isEnabled);

	useEffect(() => {
		enabledRef.current = isEnabled;
	}, [isEnabled]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: "press" | "release") => {
			if (!enabledRef.current()) return;
			const key = e.key;
			let payload: { inputId: number; dir: "up" | "down"; id: number, timestamp: number } | null = null;
			if (key === "s") payload = {inputId: inputIdRef.current++, dir: "down", id: 0, timestamp: Date.now() };
			else if (key === "w") payload = {inputId: inputIdRef.current++, dir: "up", id: 0, timestamp: Date.now() };
			else if (key === "ArrowDown") payload = {inputId: inputIdRef.current++, dir: "down", id: 1, timestamp: Date.now() };
			else if (key === "ArrowUp") payload = {inputId: inputIdRef.current++, dir: "up", id: 1, timestamp: Date.now() };

			if (payload) {
				const isPress = type === "press";
				const isDown = payload.dir === "down";
				if (isDown) player.movingDown = isPress;
				else player.movingUp = isPress;
				pendingInputsRef.current.push({
					inputId: payload.inputId,
					dir: payload.dir,
					type: type,
					inputOwnerId: payload.id,
					timestamp: payload.timestamp,
				});
				withLag(() => send({ event: "play", body: { type, ...payload } }));
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
	}, [send, player, pendingInputsRef, inputIdRef]);
}
