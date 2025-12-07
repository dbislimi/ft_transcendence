import { type MutableRefObject, memo } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongLabels from "../pong/PongLabels";
import type { ServerSnapshot } from "../types/PongState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<ServerSnapshot>;
	side: 0 | 1;
	interpolationDelay: number;
	enableIplusPRef: MutableRefObject<boolean>;
	enableInterpolationRef: MutableRefObject<boolean>;
};

const PongGameArea = memo(function PongGameArea({
	labels,
	gameRef,
	side,
	interpolationDelay,
	enableIplusPRef,
	enableInterpolationRef,
}: PongGameAreaProps) {
	console.log("side", side);
	return (
		<div className="relative">
			<PongLabels
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
				side={side}
			/>
			<PongCanvas
				gameRef={gameRef}
				side={side}
				interpolationDelay={interpolationDelay}
				enableIplusPRef={enableIplusPRef}
				enableInterpolationRef={enableInterpolationRef}
			/>
		</div>
	);
});

export default PongGameArea;
