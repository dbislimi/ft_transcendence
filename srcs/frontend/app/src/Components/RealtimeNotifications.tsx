import { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useWebSocket } from "../context/WebSocketContext";
import { useNavigate } from "react-router-dom";
import { useGameSession } from "../context/GameSessionContext";

export default function RealtimeNotifications() {
	const { notify, dismiss } = useNotifications();
	const { addPongRoute, removePongRoute, pongWsRef } = useWebSocket();
	const navigate = useNavigate();
	const { setSession } = useGameSession();

	useEffect(() => {
		const listener = (data: any) => {
			if (!data) return;
			if (data?.event === "tournament_rejoin_prompt") {
				const timeoutSec = Number(data.body?.timeout ?? 10);
				notify({
					variant: "info",
					title: "Tournoi en cours",
					message:
						"Vous avez quitté une manche. Rejoindre avant expiration.",
					duration: timeoutSec * 1000,
					actions: [
						{
							label: "Rejoindre",
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
							label: "Ignorer",
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
			}
		};
		addPongRoute("tournament_rejoin_prompt", listener);
		return () => removePongRoute("tournament_rejoin_prompt", listener);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate]);

	useEffect(() => {
		const onSessionReady = (data: any) => {
			if (!data || data.event !== "game_session_ready") return;
			const body = data.body || {};
			setSession(body);
			if (location.pathname !== "/pong") navigate("/pong?mode=online");
		};
		addPongRoute("game_session", onSessionReady);
		return () => removePongRoute("game_session", onSessionReady);
	}, [addPongRoute, removePongRoute, navigate, setSession]);

	useEffect(() => {
		const sentNotifs = new Map<string, string>();
		const receivNotifs = new Map<string, string>();

		const dismissNotificationById = (invitationId: string) => {
			// Check sent notifications
			const sentNotif = sentNotifs.get(invitationId);
			if (sentNotif) {
				dismiss(sentNotif);
				sentNotifs.delete(invitationId);
				return true;
			}
			// Check received notifications
			const receivNotif = receivNotifs.get(invitationId);
			if (receivNotif) {
				dismiss(receivNotif);
				receivNotifs.delete(invitationId);
				return true;
			}
			return false;
		};

		const onInvitationEvent = (data: any) => {
			if (!data) return;
			switch (data.event) {
				case "invite_rejoin_prompt": {
					notify({
						variant: "info",
						title: "Partie interrompue",
						message:
							"Vous avez quitté une partie invitée. Rejoindre ou abandonner.",
						duration: undefined,
						actions: [
							{
								label: "Rejoindre",
								primary: true,
								onPress: () => {
									navigate("/pong?mode=online");
									pongWsRef.current?.send(
										JSON.stringify({ event: "ready" })
									);
								},
							},
							{
								label: "Abandonner",
								type: "decline",
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
					break;
				}
				case "invitation_waiting": {
					const to = data.body?.to ?? "Un joueur";
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (!invitationId) break;
					const n = sentNotifs.get(invitationId);
					if (n) dismiss(n);
					const notifId = notify({
						variant: "info",
						title: "Invitation envoyée",
						message: `Invitation envoyée à ${to}. En attente d'acceptation ou de refus.`,
						duration: undefined,
						actions: [
							{
								label: "Annuler",
								type: "decline",
								onPress: () => {
									pongWsRef.current?.send(
										JSON.stringify({
											event: "invitation",
											body: {
												action: "cancel",
												invitationId,
											},
										})
									);
								},
							},
						],
					});
					sentNotifs.set(invitationId, notifId);
					break;
				}
				case "invitation": {
					const from = data.body?.from ?? "Un joueur";
					const expiresIn = data.body?.expiresIn ?? 30;
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (!invitationId) break;
					const n = receivNotifs.get(invitationId);
					if (n) dismiss(n);
					const notifId = notify({
						variant: "info",
						title: "Invitation à jouer au Pong",
						message: `${from} vous invite à une partie (expire dans ${expiresIn}s)`,
						duration: expiresIn * 1000,
						actions: [
							{
								label: "Accepter",
								primary: true,
								onPress: () => {
									pongWsRef.current?.send(
										JSON.stringify({
											event: "invitation",
											body: {
												action: "accept",
												invitationId,
											},
										})
									);
								},
							},
							{
								label: "Refuser",
								type: "decline",
								onPress: () => {
									pongWsRef.current?.send(
										JSON.stringify({
											event: "invitation",
											body: {
												action: "decline",
												invitationId,
											},
										})
									);
								},
							},
						],
					});
					receivNotifs.set(invitationId, notifId);
					break;
				}

				case "invitation_game_found": {
					const invitationId = data.body?.invitationId;
					if (invitationId) {
						// Close specific invitation notification
						dismissNotificationById(invitationId);
					} else {
						// Fallback: close all remaining invitation notifications
						for (const notifId of sentNotifs.values()) {
							dismiss(notifId);
						}
						sentNotifs.clear();
						for (const notifId of receivNotifs.values()) {
							dismiss(notifId);
						}
						receivNotifs.clear();
					}
					const opponent = data.body?.opponent ?? "votre ami";
					notify({
						variant: "info",
						title: "Partie lancée",
						message: `La partie commence avec ${opponent}`,
						duration: 3000,
					});
					navigate("/pong?mode=online");
					break;
				}

				case "invitation_declined": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const n = sentNotifs.get(invitationId);
						if (n) dismiss(n);
						sentNotifs.delete(invitationId);
					}
					const by = data.body?.by ?? "Un joueur";
					notify({
						variant: "info",
						title: "Invitation déclinée",
						message: `${by} a décliné votre invitation`,
						duration: 3000,
					});
					break;
				}

				case "invitation_declined_self": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						dismissNotificationById(invitationId);
					}
					break;
				}

				case "invitation_cancelled": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						dismissNotificationById(invitationId);
					}
					break;
				}

				case "invitation_cancelled_self": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						dismissNotificationById(invitationId);
					}
					break;
				}

				case "invitation_expired": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						dismissNotificationById(invitationId);
					}
					const to = data.body?.to;
					notify({
						variant: "info",
						title: "Invitation expirée",
						message: to
							? `Votre invitation à ${to} a expiré`
							: "Votre invitation a expiré",
						duration: 3000,
					});
					break;
				}

				case "invitation_error": {
					const reason = data.body?.reason ?? "unknown";
					if (reason === "friend_not_found") {
						notify({
							variant: "warning",
							title: "Erreur",
							message: "Ami introuvable",
							duration: 3000,
						});
					} else if (reason === "in_game" || reason === "searching") {
						notify({
							variant: "warning",
							title: "Erreur",
							message: "Le joueur est occupé",
							duration: 3000,
						});
					}
					// Ignore other errors
					break;
				}
			}
		};
		addPongRoute("invitation_events", onInvitationEvent);
		return () => removePongRoute("invitation_events", onInvitationEvent);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate]);

	return null;
}
