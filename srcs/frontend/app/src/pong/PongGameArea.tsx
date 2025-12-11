import { type MutableRefObject, memo } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongLabels from "../pong/PongLabels";
import type { PongState } from "../types/PongState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<PongState>;
	side: 0 | 1;
	interpolationDelayRef: MutableRefObject<number>;
	enableIplusPRef: MutableRefObject<boolean>;
	enableInterpolationRef: MutableRefObject<boolean>;
	isLocalMode: boolean;
};

const PongGameArea = memo(function PongGameArea({
	labels,
	gameRef,
	side,
	interpolationDelayRef,
	enableIplusPRef,
	enableInterpolationRef,
	isLocalMode,
}: PongGameAreaProps) {
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
				interpolationDelayRef={interpolationDelayRef}
				enableIplusPRef={enableIplusPRef}
				enableInterpolationRef={enableInterpolationRef}
				isLocalMode={isLocalMode}
			/>
		</div>
	);
});

export default PongGameArea;
