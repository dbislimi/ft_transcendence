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
						"Vous avez quitte une manche. Rejoindre avant expiration.",
					duration: timeoutSec * 1000,
					actions: [
						{
							label: "Rejoindre",
							primary: true,
							onPress: () => {
								navigate("/pong");
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
			if (location.pathname !== "/pong") navigate("/pong");
		};
		addPongRoute("game_session", onSessionReady);
		return () => removePongRoute("game_session", onSessionReady);
	}, [addPongRoute, removePongRoute, navigate, setSession]);

	useEffect(() => {
		const sentNotifs = new Map<string, string>();
		const receivNotifs = new Map<string, string>();

		const dismissNotificationById = (invitationId: string) => {
			const sentNotif = sentNotifs.get(invitationId);
			if (sentNotif) {
				dismiss(sentNotif);
				sentNotifs.delete(invitationId);
				return true;
			}
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
				case "invitation_waiting": {
					const to = data.body?.to ?? "Un joueur";
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (!invitationId) break;
					const n = sentNotifs.get(invitationId);
					if (n) dismiss(n);
					const notifId = notify({
						variant: "info",
						title: "Invitation envoyee",
						message: `Invitation envoyee à ${to}. En attente d'acceptation ou de refus.`,
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
						dismissNotificationById(invitationId);
					} else {
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
						title: "Partie lancee",
						message: `La partie commence avec ${opponent}`,
						duration: 3000,
					});
					navigate("/pong");
					break;
				}

				case "invitation_accepted": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const nSent = sentNotifs.get(invitationId);
						if (nSent) dismiss(nSent);
						sentNotifs.delete(invitationId);
						const nReceiv = receivNotifs.get(invitationId);
						if (nReceiv) dismiss(nReceiv);
						receivNotifs.delete(invitationId);
					}
					const by =
						data.body?.by ?? data.body?.inviter ?? "Un joueur";
					notify({
						variant: "success",
						title: "Invitation acceptee",
						message: `${by} a accepte votre invitation`,
						duration: 3000,
					});
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
						title: "Invitation declinee",
						message: `${by} a decline votre invitation`,
						duration: 3000,
					});
					break;
				}
				case "invitation_declined_self": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const n = receivNotifs.get(invitationId);
						if (n) dismiss(n);
						receivNotifs.delete(invitationId);
					}
					notify({
						variant: "warning",
						title: "Invitation refusee",
						message: "Vous avez refuse l'invitation",
						duration: 3000,
					});
					break;
				}

				case "invitation_cancelled": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const n = receivNotifs.get(invitationId);
						if (n) dismiss(n);
						receivNotifs.delete(invitationId);
					}
					notify({
						variant: "warning",
						title: "Invitation annulee",
						message: data.body?.by
							? `${data.body.by} a annule son invitation`
							: "Invitation annulee",
						duration: 3000,
					});
					break;
				}
				case "invitation_cancelled_self": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const n = sentNotifs.get(invitationId);
						if (n) dismiss(n);
						sentNotifs.delete(invitationId);
					}
					notify({
						variant: "warning",
						title: "Invitation annulee",
						message: "Vous avez annule l'invitation",
						duration: 3000,
					});
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
						title: "Invitation expiree",
						message: to
							? `Votre invitation à ${to} a expire`
							: "Votre invitation a expire",
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
							message: "Le joueur est occupe",
							duration: 3000,
						});
					}
					break;
				}
			}
		};
		addPongRoute("invitation_events", onInvitationEvent);
		return () => removePongRoute("invitation_events", onInvitationEvent);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate]);

	return null;
}
