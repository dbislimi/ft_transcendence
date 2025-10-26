import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useNavigate } from "react-router-dom";

export default function TournamentRejoinPromptNew(): JSX.Element | null {
	const { addPongListener, removePongListener, pongWsRef } = useWebSocket();
	const [visible, setVisible] = useState(false);
	const [remaining, setRemaining] = useState<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const listener = (data: any) => {
			if (!data) return;
			if (data?.event === "tournament_rejoin_prompt") {
				const timeout = Number(data.body?.timeout ?? 10);
				setRemaining(timeout);
				setVisible(true);
				if (timerRef.current) {
					window.clearTimeout(timerRef.current);
					timerRef.current = null;
				}

				timerRef.current = window.setTimeout(() => {
					setVisible(false);
					setRemaining(0);
					timerRef.current = null;
				}, timeout * 1000) as unknown as number;
			}
		};
		addPongListener(listener);
		return () => {
			removePongListener(listener);
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [addPongListener, removePongListener, navigate, pongWsRef]);

	if (!visible) return null;

	const onJoin = () => {
		navigate("/pong?mode=online");
		pongWsRef.current?.send(JSON.stringify({ event: "rejoin_tournament" }));
		setVisible(false);
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const onDismiss = () => {
		setVisible(false);
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	return (
		<div className="fixed right-5 bottom-5 z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg shadow-lg max-w-xs">
			<div className="font-semibold mb-1">Rejoindre le tournoi</div>
			<div className="text-sm mb-3">
				Vous avez quitté une manche. Voulez-vous rejoindre ?
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onJoin}
					className="px-3 py-1 rounded-md bg-cyan-400 text-black hover:bg-cyan-500"
				>
					Rejoindre
				</button>
				<button
					type="button"
					onClick={onDismiss}
					className="px-3 py-1 rounded-md bg-transparent border border-white/20 text-white hover:border-white"
				>
					Ignorer
				</button>
				<div className="ml-auto text-sm opacity-90">
					{remaining ?? ""}s
				</div>
			</div>
		</div>
	);
}
