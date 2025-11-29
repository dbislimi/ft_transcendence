import { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useWebSocket } from "../context/WebSocketContext";
import { useNavigate } from "react-router-dom";
import { useGameSession } from "../context/GameSessionContext";
import { useTranslation } from "react-i18next";

export default function RealtimeNotifications() {
	const { notify, dismiss } = useNotifications();
	const { addPongRoute, removePongRoute, pongWsRef } = useWebSocket();
	const navigate = useNavigate();
	const { setSession } = useGameSession();
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
			}
		};
		addPongRoute("tournament_rejoin_prompt", listener);
		return () => removePongRoute("tournament_rejoin_prompt", listener);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate, t]);

	useEffect(() => {
		const onSessionReady = (data: any) => {
			if (!data || data.event !== "game_session_ready") return;
			const body = data.body || {};
			setSession(body);
			if (location.pathname !== "/pong") navigate("/pong");
		};
		addPongRoute("game_session", onSessionReady);
		return () => removePongRoute("game_session", onSessionReady);
	}, [addPongRoute, removePongRoute, navigate, setSession, t]);

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
					const to = data.body?.to ?? t("notifications.invitation.sentMessage", { to: "Un joueur" });
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (!invitationId) break;
					const n = sentNotifs.get(invitationId);
					if (n) dismiss(n);
					const notifId = notify({
						variant: "info",
						title: t("notifications.invitation.sentTitle"),
						message: t("notifications.invitation.sentMessage", { to }),
						duration: undefined,
						actions: [
							{
								label: t("notifications.invitation.cancelButton"),
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
						title: t("notifications.invitation.receivedTitle"),
						message: t("notifications.invitation.receivedMessage", { from, expiresIn }),
						duration: expiresIn * 1000,
						actions: [
							{
								label: t("notifications.invitation.acceptButton"),
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
								label: t("notifications.invitation.declineButton"),
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
						title: t("notifications.invitation.gameFoundTitle"),
						message: t("notifications.invitation.gameFoundMessage", { opponent }),
						duration: 3000,
					});
					navigate("/pong");
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
						title: t("notifications.invitation.declinedTitle"),
						message: t("notifications.invitation.declinedMessage", { by }),
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
						title: t("notifications.invitation.declinedSelfTitle"),
						message: t("notifications.invitation.declinedSelfMessage"),
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
						title: t("notifications.invitation.cancelledTitle"),
						message: data.body?.by
							? t("notifications.invitation.cancelledMessage", { by: data.body.by })
							: t("notifications.invitation.cancelledMessageDefault"),
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
						title: t("notifications.invitation.cancelledSelfTitle"),
						message: t("notifications.invitation.cancelledSelfMessage"),
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
						title: t("notifications.invitation.expiredTitle"),
						message: to
							? t("notifications.invitation.expiredMessage", { to })
							: t("notifications.invitation.expiredMessageDefault"),
						duration: 3000,
					});
					break;
				}

				case "invitation_error": {
					const reason = data.body?.reason ?? "unknown";
					if (reason === "friend_not_found") {
						notify({
							variant: "warning",
							title: t("notifications.invitation.errorTitle"),
							message: t("notifications.invitation.errorFriendNotFound"),
							duration: 3000,
						});
					} else if (reason === "in_game" || reason === "searching") {
						notify({
							variant: "warning",
							title: t("notifications.invitation.errorTitle"),
							message: t("notifications.invitation.errorPlayerBusy"),
							duration: 3000,
						});
					}
					break;
				}
			}
		};
		addPongRoute("invitation_events", onInvitationEvent);
		return () => removePongRoute("invitation_events", onInvitationEvent);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate, t]);

	return null;
}
