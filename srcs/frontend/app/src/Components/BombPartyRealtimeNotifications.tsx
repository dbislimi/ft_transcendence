import { useEffect } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { bombPartyService } from "../services/bombPartyService";
import { useBombPartyStore } from "../store/useBombPartyStore";

export default function BombPartyRealtimeNotifications() {
	const { notify, dismiss } = useNotifications();
	const navigate = useNavigate();
	const { t } = useTranslation();

	useEffect(() => {
		
		const handleLobbyError = (error: { error: string; code: string }) => {
			let title = t("notifications.bombParty.errorTitle", "Erreur");
			let message = error.error || t("notifications.bombParty.errorUnknown", "Une erreur est survenue");
			let variant: "error" | "warning" = "error";

			switch (error.code) {
				case "ROOM_NOT_FOUND":
					title = t("notifications.bombParty.roomNotFoundTitle", "Salle introuvable");
					message = t("notifications.bombParty.roomNotFoundMessage", "La salle demandée n'existe plus ou n'a jamais existé.");
					variant = "warning";
					break;
				case "ROOM_FULL":
					title = t("notifications.bombParty.roomFullTitle", "Salle pleine");
					message = t("notifications.bombParty.roomFullMessage", "Cette salle est déjà pleine. Veuillez choisir une autre salle.");
					variant = "warning";
					break;
				case "WRONG_PASSWORD":
					title = t("notifications.bombParty.wrongPasswordTitle", "Mot de passe incorrect");
					message = t("notifications.bombParty.wrongPasswordMessage", "Le mot de passe fourni est incorrect.");
					variant = "warning";
					break;
				case "ALREADY_IN_ROOM":
					title = t("notifications.bombParty.alreadyInRoomTitle", "Déjà dans une salle");
					message = t("notifications.bombParty.alreadyInRoomMessage", "Vous êtes déjà dans une salle. Quittez-la d'abord.");
					variant = "warning";
					break;
			}

			notify({
				variant,
				title,
				message,
				duration: 5000,
			});
		};

		const handlePlayerJoined = (data: { playerId: string; playerName: string; roomId: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				notify({
					variant: "info",
					title: t("notifications.bombParty.playerJoinedTitle", "Joueur rejoint"),
					message: t("notifications.bombParty.playerJoinedMessage", "{{name}} a rejoint la salle", {
						name: data.playerName || "Un joueur"
					}),
					duration: 3000,
				});
			}
		};

		const handlePlayerLeft = (data: { playerId: string; playerName: string; roomId: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				notify({
					variant: "info",
					title: t("notifications.bombParty.playerLeftTitle", "Joueur parti"),
					message: t("notifications.bombParty.playerLeftMessage", "{{name}} a quitté la salle", {
						name: data.playerName || "Un joueur"
					}),
					duration: 3000,
				});
			}
		};

		const handleGameStart = (data: { roomId: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				notify({
					variant: "success",
					title: t("notifications.bombParty.gameStartTitle", "Partie démarrée"),
					message: t("notifications.bombParty.gameStartMessage", "La partie commence !"),
					duration: 3000,
				});
			}
		};

		const handleGameEnd = (data: { roomId: string; winner?: { name: string }; reason: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				if (data.winner) {
					notify({
						variant: "success",
						title: t("notifications.bombParty.gameEndTitle", "Partie terminée"),
						message: t("notifications.bombParty.gameEndWinnerMessage", "{{name}} a gagné !", {
							name: data.winner.name
						}),
						duration: 5000,
					});
				} else {
					notify({
						variant: "info",
						title: t("notifications.bombParty.gameEndTitle", "Partie terminée"),
						message: t("notifications.bombParty.gameEndMessage", "La partie est terminée."),
						duration: 5000,
					});
				}
			}
		};

		const handleBonusApplied = (data: { roomId: string; playerId: string; playerName?: string; bonusKey: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId && data.playerId !== store.connection.playerId) {
				const bonusNames: Record<string, string> = {
					inversion: t("bombParty.bonus.inversion.name", "Inversion"),
					plus5sec: t("bombParty.bonus.plus5sec.name", "+5 secondes"),
					vitesseEclair: t("bombParty.bonus.vitesseEclair.name", "Vitesse Éclair"),
					doubleChance: t("bombParty.bonus.doubleChance.name", "Double Chance"),
					extraLife: t("bombParty.bonus.extraLife.name", "Vie supplémentaire"),
				};

				notify({
					variant: "info",
					title: t("notifications.bombParty.bonusAppliedTitle", "Bonus activé"),
					message: t("notifications.bombParty.bonusAppliedMessage", "{{name}} a activé {{bonus}}", {
						name: data.playerName || "Un joueur",
						bonus: bonusNames[data.bonusKey] || data.bonusKey
					}),
					duration: 3000,
				});
			}
		};

		const handleRejoinPrompt = (data: { roomId: string; timeout: number }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				const timeoutSec = data.timeout || 10;
				notify({
					variant: "info",
					title: t("notifications.bombParty.rejoinTitle", "Reconnexion à la partie"),
					message: t("notifications.bombParty.rejoinMessage", "Vous avez quitté la partie. Reconnectez-vous pour continuer à jouer."),
					duration: timeoutSec * 1000,
					actions: [
						{
							label: t("notifications.bombParty.rejoinButton", "Se reconnecter"),
							primary: true,
							onPress: () => {
								const store = useBombPartyStore.getState();
								const roomId = store.connection.roomId;
								if (roomId) {
									
									if (store.connection.state !== 'connected') {
										bombPartyService.init();
									}
									
									navigate("/bombparty");
									
									if (store.connection.state === 'connected' && store.connection.playerId) {
										bombPartyService.joinRoom(roomId);
									}
								} else {
									navigate("/bombparty");
								}
							},
						},
						{
							label: t("notifications.bombParty.ignoreButton", "Ignorer"),
							onPress: () => {
								
								
							},
						},
					],
				});
			}
		};

		const handleHostDisconnected = (data: { roomId: string; hostName: string }) => {
			const store = useBombPartyStore.getState();
			if (data.roomId === store.connection.roomId) {
				const gamePhase = store.gamePhase;
				notify({
					variant: "warning",
					title: t("notifications.bombParty.hostDisconnectedTitle", "Lobby fermé"),
					message: t("notifications.bombParty.hostDisconnectedMessage", "L'hôte {{name}} s'est déconnecté. Le lobby a été fermé.", {
						name: data.hostName || "L'hôte"
					}),
					duration: 5000,
				});
				
				
				
				setTimeout(() => {
					navigate("/");
				}, 1000); 
			}
		};

		
		
		

		
		let lastErrorRef: string | null = null;
		const unsubscribe = useBombPartyStore.subscribe(
			(state: any) => state.connection.lastError,
			(error: string | null) => {
				if (error && error !== lastErrorRef) {
					lastErrorRef = error;
					
					let code = "UNKNOWN";
					if (error.includes("not found") || error.includes("introuvable")) {
						code = "ROOM_NOT_FOUND";
					} else if (error.includes("pleine") || error.includes("full")) {
						code = "ROOM_FULL";
					} else if (error.includes("mot de passe") || error.includes("password")) {
						code = "WRONG_PASSWORD";
					} else if (error.includes("déjà") || error.includes("already")) {
						code = "ALREADY_IN_ROOM";
					}
					handleLobbyError({ error, code });
				}
			}
		);

		
		
		
		const handleWindowEvent = (event: CustomEvent) => {
			const data = event.detail;
			switch (event.type) {
				case "bp:lobby:error":
					handleLobbyError(data);
					break;
				case "bp:lobby:player_joined":
					handlePlayerJoined(data);
					break;
				case "bp:lobby:player_left":
					handlePlayerLeft(data);
					break;
				case "bp:game:start":
					handleGameStart(data);
					break;
				case "bp:game:end":
					handleGameEnd(data);
					break;
				case "bp:bonus:applied":
					handleBonusApplied(data);
					break;
				case "bp:game:rejoin_prompt":
					handleRejoinPrompt(data);
					break;
				case "bp:lobby:host_disconnected":
					handleHostDisconnected(data);
					break;
			}
		};

		window.addEventListener("bp:lobby:error", handleWindowEvent as EventListener);
		window.addEventListener("bp:lobby:player_joined", handleWindowEvent as EventListener);
		window.addEventListener("bp:lobby:player_left", handleWindowEvent as EventListener);
		window.addEventListener("bp:game:start", handleWindowEvent as EventListener);
		window.addEventListener("bp:game:end", handleWindowEvent as EventListener);
		window.addEventListener("bp:bonus:applied", handleWindowEvent as EventListener);
		window.addEventListener("bp:game:rejoin_prompt", handleWindowEvent as EventListener);
		window.addEventListener("bp:lobby:host_disconnected", handleWindowEvent as EventListener);

		return () => {
			unsubscribe();
			window.removeEventListener("bp:lobby:error", handleWindowEvent as EventListener);
			window.removeEventListener("bp:lobby:player_joined", handleWindowEvent as EventListener);
			window.removeEventListener("bp:lobby:player_left", handleWindowEvent as EventListener);
			window.removeEventListener("bp:game:start", handleWindowEvent as EventListener);
			window.removeEventListener("bp:game:end", handleWindowEvent as EventListener);
			window.removeEventListener("bp:bonus:applied", handleWindowEvent as EventListener);
			window.removeEventListener("bp:game:rejoin_prompt", handleWindowEvent as EventListener);
			window.removeEventListener("bp:lobby:host_disconnected", handleWindowEvent as EventListener);
		};
	}, [notify, dismiss, navigate, t]);

	return null;
}

