import React, { useCallback, useEffect, useRef, useState } from "react";
import { withLag } from "../utils/NetworkSimulator";


const PING_TIMEOUT = 5000;

export function usePing(
	wsRef: React.MutableRefObject<WebSocket | null>,
	isActive: boolean = true
) {
	const [ping, setPing] = useState<number | null>(null);
	const pingIntervalRef = useRef<number | null>(null);
	const pendingPingRef = useRef<number | null>(null);
	const timeoutRef = useRef<number | null>(null);

	const sendPing = useCallback(() => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			return;
		}

		const timestamp = Date.now();
		pendingPingRef.current = timestamp;

		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => {
			if (pendingPingRef.current === timestamp) {
				console.warn(
					`Ping timeout: no pong received for timestamp ${timestamp}`
				);
				pendingPingRef.current = null;
				setPing(null);
			}
		}, PING_TIMEOUT);
		
		// Apply lag simulation to ping send (matching game inputs)
		withLag(() => {
			wsRef.current?.send(
				JSON.stringify({
					event: "ping",
					body: { timestamp },
				})
			);
		});
	}, [wsRef]);

	const handlePongMessage = useCallback((data: any) => {
		if (data.event === "pong" && pendingPingRef.current !== null) {
			if (data.body?.timestamp === pendingPingRef.current) {
				const now = Date.now();
				const latency = now - pendingPingRef.current;
				setPing(latency);
				pendingPingRef.current = null;

				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
					timeoutRef.current = null;
				}
			}
		}
	}, []);

	useEffect(() => {
		if (!isActive) {
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
				pingIntervalRef.current = null;
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			setPing(null);
			pendingPingRef.current = null;
			return;
		}
		sendPing();
		pingIntervalRef.current = window.setInterval(sendPing, 2000);
		return () => {
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
				pingIntervalRef.current = null;
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, [isActive, sendPing]);

	return { ping, handlePongMessage };
}
