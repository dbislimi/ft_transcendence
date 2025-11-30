import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useTranslation } from "react-i18next";

export default function TournamentRejoinPrompt(): JSX.Element | null {
	const { addPongRoute, removePongRoute, pongWsRef } = useWebSocket();
	const [visible, setVisible] = useState(false);
	const [remaining, setRemaining] = useState<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const { notify } = useNotifications();
	const navigate = useNavigate();
	const { t } = useTranslation();

	useEffect(() => {
		const listener = (data: any) => {
			if (!data) return;
			if (data?.event === "tournament_rejoin_prompt") {
				const timeoutSec = Number(data.body?.timeout ?? 10);
				notify({
					variant: "info",
					title: t("notifications.tournament.rejoinTitle"),
					message: t("notifications.tournament.rejoinMessage"),
					duration: timeoutSec * 1000,
					actions: [
						{
							label: t("notifications.tournament.rejoinButton"),
							primary: true,
							onPress: () => {
								navigate("/pong?mode=online");
								pongWsRef.current?.send(
									JSON.stringify({
										event: "rejoin",
										body: { type: "tournament" },
									})
								);
							},
						},
						{
							label: t("notifications.tournament.ignoreButton"),
							onPress: () => {
								pongWsRef.current?.send(
									JSON.stringify({
										event: "rejoin",
										body: { type: "dismiss" },
									})
								);
							},
						},
					],
				});
				setRemaining(timeoutSec);
				setVisible(false);
			}
		};
		addPongRoute("tournament_rejoin_prompt", listener);
		return () => {
			removePongRoute("tournament_rejoin_prompt", listener);
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [addPongRoute, removePongRoute, navigate, pongWsRef, t, notify]);

	useEffect(() => {
		if (!visible) return;
		const blockKeys = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
		};
		const opts: AddEventListenerOptions = { capture: true };
		window.addEventListener("keydown", blockKeys, opts);
		window.addEventListener("keypress", blockKeys, opts);
		window.addEventListener("keyup", blockKeys, opts);
		return () => {
			window.removeEventListener(
				"keydown",
				blockKeys,
				opts as EventListenerOptions
			);
			window.removeEventListener(
				"keypress",
				blockKeys,
				opts as EventListenerOptions
			);
			window.removeEventListener(
				"keyup",
				blockKeys,
				opts as EventListenerOptions
			);
		};
	}, [visible]);

	if (!visible) return null;

	const onJoin = () => {
		navigate("/pong?mode=online");
		pongWsRef.current?.send(
			JSON.stringify({
				event: "rejoin",
				body: { type: "tournament" },
			})
		);
		setVisible(false);
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const onDismiss = () => {
		pongWsRef.current?.send(
			JSON.stringify({
				event: "rejoin",
				body: { type: "dismiss" },
			})
		);
		setVisible(false);
		if (timerRef.current) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/70" />
			<div className="relative z-10 w-11/12 max-w-md bg-slate-900/95 border border-cyan-600/40 rounded-lg p-6 text-cyan-50 shadow-2xl">
				<div className="text-xl font-bold mb-2">
					{t('notifications.tournament.rejoinTitle')}
				</div>
				<div className="text-sm mb-4">
					{t('notifications.tournament.rejoinMessage')}
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onJoin}
						className="px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
					>
						{t('notifications.tournament.rejoinButton')}
					</button>
					<button
						type="button"
						onClick={onDismiss}
						className="px-4 py-2 rounded-md bg-transparent border border-white/20 text-white hover:border-white/40"
					>
						{t('notifications.tournament.ignoreButton')}
					</button>
					<div className="ml-auto text-sm opacity-90">
						{remaining ?? ""}s
					</div>
				</div>
			</div>
		</div>
	);
}
