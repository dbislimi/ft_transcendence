import type { PendingInput } from "../hooks/usePongControls";
import type { Player } from "../types/PongState";

/**
 * Replays pending inputs from the server's authoritative snapshot to reconcile client prediction
 */
export function replayPendingInputs(
	serverMe: Player,
	snapshotTimestamp: number,
	pendingInputs: PendingInput[],
	now: number
) {
	let virtualY = serverMe.y;
	let isMovingUp = serverMe.movingUp;
	let isMovingDown = serverMe.movingDown;
	let lastTime = snapshotTimestamp;

	const simulatePhysics = (endTime: number) => {
		const dt = (endTime - lastTime) / 1000;
		if (dt <= 0) return;
		const move = 90 * dt;
		if (isMovingUp) virtualY -= move;
		if (isMovingDown) virtualY += move;
		virtualY = Math.max(0, Math.min(virtualY, 100 - serverMe.size));
		lastTime = endTime;
	};

	for (const input of pendingInputs) {
		simulatePhysics(input.timestamp);
		const isPress = input.type === "press";
		if (input.dir === "up") isMovingUp = isPress;
		if (input.dir === "down") isMovingDown = isPress;
	}
	simulatePhysics(now);

	return { y: virtualY, movingUp: isMovingUp, movingDown: isMovingDown };
}

/**
 * Reconciles client state with server snapshot using input replay
 */
export function reconcileWithServer(
	clientMe: Player,
	serverMe: Player,
	snapshotTimestamp: number,
	pendingInputs: PendingInput[]
): void {
	const ERROR_THRESHOLD = 0.5;

	// Filter out acknowledged inputs
	const lastProcessedId = serverMe.lastProcessedInputId ?? -1;
	const remainingInputs = pendingInputs.filter(
		(input: PendingInput) => input.inputId > lastProcessedId
	);

	// Replay inputs from server's authoritative position
	const correctedState = replayPendingInputs(
		serverMe,
		snapshotTimestamp,
		remainingInputs,
		Date.now()
	);

	// Apply correction only if error is significant (avoid micro-jitter)
	const positionError = Math.abs(correctedState.y - clientMe.y);
	if (positionError > ERROR_THRESHOLD) {
		clientMe.y = correctedState.y;
	}

	// Always sync movement flags
	clientMe.movingUp = correctedState.movingUp;
	clientMe.movingDown = correctedState.movingDown;
}
