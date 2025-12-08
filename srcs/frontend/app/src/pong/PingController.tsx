import { type MutableRefObject, useEffect, memo } from "react";
import { usePing } from "../hooks/usePing";
import PingDisplay from "./PingDisplay";
import { useWebSocket } from "../contexts/WebSocketContext";

interface PingControllerProps {
	shouldMeasurePing: boolean;
	interpolationDelayRef: MutableRefObject<number>;
}

const PingController = memo(({ 
	shouldMeasurePing, 
	interpolationDelayRef, 
}: PingControllerProps) => {
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { ping, handlePongMessage } = usePing(pongWsRef, shouldMeasurePing);

	useEffect(() => {
		if (ping !== null) {
			interpolationDelayRef.current = Math.max(Math.round(ping * 1.5), 50);
		}
	}, [ping, interpolationDelayRef]);

	useEffect(() => {
		addPongRoute("ping", handlePongMessage);
		return () => removePongRoute("ping", handlePongMessage);
	}, [addPongRoute, removePongRoute, handlePongMessage]);

	if (!shouldMeasurePing) return null;

	return <PingDisplay ping={ping} />;
});

export default PingController;
