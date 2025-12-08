import type { PendingInput } from "../hooks/usePongControls";
import type { Player } from "../types/PongState";

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

export function reconcileWithServer(
	clientMe: Player,
	serverMe: Player,
	snapshotTimestamp: number,
	pendingInputs: PendingInput[]
): void {
	const ERROR_THRESHOLD = 0.5;
	const lastProcessedId = serverMe.lastProcessedInputId ?? -1;
	const remainingInputs = pendingInputs.filter(
		(input: PendingInput) => input.inputId > lastProcessedId
	);
	const correctedState = replayPendingInputs(
		serverMe,
		snapshotTimestamp,
		remainingInputs,
		Date.now()
	);
	const positionError = Math.abs(correctedState.y - clientMe.y);
	if (positionError > ERROR_THRESHOLD) {
		clientMe.y = correctedState.y;
	}
	clientMe.movingUp = correctedState.movingUp;
	clientMe.movingDown = correctedState.movingDown;
}
