import { useEffect } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNavigate } from "react-router-dom";
import { useGameSession } from "../contexts/GameSessionContext";

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
					notify({
						variant: "success",
						title: "Partie lancée !",
						message: "La partie commence avec votre ami.",
						duration: 3000,
					});
					navigate("/pong?mode=online");
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
						title: "Invitation acceptée",
						message: `${by} a accepté votre invitation`,
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
					notify({
						variant: "warning",
						title: "Invitation refusée",
						message: data.body?.by
							? `${data.body.by} a refusé votre invitation`
							: "Invitation refusée",
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
						title: "Invitation refusée",
						message: "Vous avez refusé l'invitation",
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
						title: "Invitation annulée",
						message: data.body?.by
							? `${data.body.by} a annulé son invitation`
							: "Invitation annulée",
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
						title: "Invitation annulée",
						message: "Vous avez annulé l'invitation",
						duration: 3000,
					});
					break;
				}

				case "invitation_expired": {
					const invitationId: string | undefined =
						data.body?.invitationId;
					if (invitationId) {
						const ns = sentNotifs.get(invitationId);
						if (ns) dismiss(ns);
						sentNotifs.delete(invitationId);
						const nr = receivNotifs.get(invitationId);
						if (nr) dismiss(nr);
						receivNotifs.delete(invitationId);
					}
					const from = data.body?.from;
					const to = data.body?.to;
					const message = from
						? `L'invitation de ${from} a expiré`
						: to
						? `Votre invitation à ${to} a expiré`
						: "L'invitation a expiré";
					notify({
						variant: "warning",
						title: "Invitation expirée",
						message,
						duration: 3000,
					});
					break;
				}

				case "invitation_error": {
					const reason = data.body?.reason ?? "unknown";
					const errorMessages: Record<string, string> = {
						in_game: "Le joueur est déjà en partie",
						searching: "Le joueur est déjà en recherche de partie",
						friend_not_found: "Ami introuvable",
						inviter_busy: "Vous avez déjà une invitation en cours",
						invitee_busy:
							"Le joueur a déjà une invitation en cours",
						self: "Vous ne pouvez pas vous inviter vous-même",
						id_required: "L'identifiant de l'invitation est requis",
						accept_failed: "Échec de l'acceptation de l'invitation",
						decline_failed: "Échec du refus de l'invitation",
						cancel_failed: "Échec de l'annulation de l'invitation",
					};
					notify({
						variant: "error",
						title: "Erreur d'invitation",
						message: errorMessages[reason] ?? `Erreur: ${reason}`,
						duration: 5000,
					});
					break;
				}
			}
		};
		addPongRoute("invitation_events", onInvitationEvent);
		return () => removePongRoute("invitation_events", onInvitationEvent);
	}, [addPongRoute, removePongRoute, notify, pongWsRef, navigate]);

	return null;
}
