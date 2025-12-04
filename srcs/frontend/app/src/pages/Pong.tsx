import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import SpaceBackground from "../Components/SpaceBackground";
import GameOverlay from "../pong/GameOverlay";
import GameOverOverlay from "../pong/GameOverOverlay";
import Countdown from "../Components/Countdown";
import SearchingOverlay from "../pong/SearchingOverlay";
import WaitingOverlay from "../pong/WaitingOverlay";
import { ReadyButton } from "../pong/ReadyButton";
import { usePongControls, type PendingInput } from "../hooks/usePongControls";
import { usePing } from "../hooks/usePing";
import BackToMenuButton from "../Components/BackToMenuButton";
import { useWebSocket } from "../contexts/WebSocketContext";
import PongRulesScreen from "../pong/PongRulesScreen";
import PongTournamentLobby from "../pong/PongTournamentLobby";
import PongGameArea from "../pong/PongGameArea";
import PingDisplay from "../pong/PingDisplay";
import type { PongState, ServerSnapshot } from "../types/PongState";

import { useUser } from "../contexts/UserContext";
import { useGameSession } from "../contexts/GameSessionContext";

type PlayerLabels = {
	self: string;
	opponent: string;
};

type Difficulty = "easy" | "medium" | "hard";

type GameOverData = {
	didWin: boolean;
	scores: number[];
	tournamentDepth?: number | null;
	finalTournamentWin?: boolean;
	type?: string;
	opponent?: string;
};

type Ui =
	| { kind: "search" }
	| { kind: "rules" }
	| { kind: "lobby" }
	| { kind: "training" }
	| { kind: "play" }
	| { kind: "wait"; opponentName: string }
	| {
			kind: "ready";
			remaining: number;
			selfReady: boolean;
			opponentReady: boolean;
			opponentName: string;
	  }
	| { kind: "countdown"; value: number }
	| { kind: "result"; gameOver: GameOverData };

const PLAYER_LABELS = {
	self: "You",
	opponent: "Opponent",
} as const;

const initGameState = (): PongState => ({
	ball: { x: 100, y: 50 },
	players: {
		p1: { size: 25, y: 37.5, score: 0, movingUp: false, movingDown: false },
		p2: { size: 25, y: 37.5, score: 0, movingUp: false, movingDown: false },
	},
	bonuses: [],
	timestamp: Date.now(),
	serverUpdates: [],
});

export default function Pong() {
	const { user, isAuthenticated } = useUser();
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { session, setSession, clearSession } = useGameSession();
	const navigate = useNavigate();
	const prevAuthRef = useRef(isAuthenticated);
	const trainingRef = useRef(false);
	const trainingLabelsRef = useRef<PlayerLabels | null>(null);
	const lastStartPayloadRef = useRef<Record<string, unknown> | null>(null);
	const activeSessionRef = useRef(false);
	const gameRef = useRef<PongState>(initGameState());
	const controlsReadyRef = useRef(false);
	const pendingInputsRef = useRef<PendingInput[]>([]);
	const [view, setView] = useState<Ui>({ kind: "rules" });
	const [bonusEnabled, setBonusEnabled] = useState(false);
	
	const shouldMeasurePing =
		["play", "ready", "countdown", "wait"].includes(view.kind);
	const {ping, handlePongMessage } = usePing(pongWsRef, shouldMeasurePing);
	
	
	const labels = useMemo((): PlayerLabels => {
		console.log(
			`Labels: ${view.kind}, ${
				view.kind === "result" && view.gameOver?.opponent
			}`
		);
		const defaultSelf = user?.name
		? `${user.name} (You)`
		: PLAYER_LABELS.self;
		if (view.kind === "training" && trainingLabelsRef.current)
			return trainingLabelsRef.current;
		if (view.kind === "result") {
			const self = session?.labels?.self || defaultSelf;
			const opponent =
			view.gameOver?.opponent ||
			session?.labels?.opponent ||
			PLAYER_LABELS.opponent;
			console.log(`OPPONENT: ${opponent}`);
			return { self, opponent };
		}
		if (session?.labels) return session.labels;
		return { self: defaultSelf, opponent: PLAYER_LABELS.opponent };
	}, [session, user, view.kind, view]);
	
	const setControlsReady = useCallback((next: boolean) => {
		controlsReadyRef.current = next;
	}, []);
	const isControlsReady = useCallback(() => controlsReadyRef.current, []);
	const resetGameState = useCallback(() => {
		gameRef.current = initGameState();
	}, []);
	
	const applyTournamentRound = useCallback(
		(body: any) => {
			if (!body) return;
			const depth: number | undefined = body.tournamentDepth;
			if (depth && session)
				setSession({ ...session, tournamentDepth: depth });
		},
		[session, setSession]
	);
	
	const localStop = useCallback(() => {
		resetGameState();
		setControlsReady(false);
		activeSessionRef.current = false;
		clearSession();
	}, [resetGameState, setControlsReady, clearSession]);
	
	const onMessage = useCallback(
		(data: any) => {
			if (!data) return;
			handlePongMessage(data);
			let remaining;
			console.log(data);
			switch (data.event) {
				case "searching":
					applyTournamentRound(data.body);
					setView({ kind: "search" });
					break;
					case "waiting":
						const opponentName = data.who;
						trainingRef.current = false;
						trainingLabelsRef.current = null;
						resetGameState();
						setControlsReady(false);
						if (
							typeof opponentName === "string" &&
							opponentName.trim().length
						)
						setView({ kind: "wait", opponentName });
						break;
						case "ready_phase":
							remaining = data.body?.remaining;
							const selfReady = data.body?.selfReady ?? false;
							const opponentReady = data.body?.opponentReady ?? false;
							const opponentNameReady = data.body?.opponentName;
							
							trainingRef.current = false;
							trainingLabelsRef.current = null;
							resetGameState();
							
							if (typeof remaining === "number") {
								setView({
									kind: "ready",
									remaining,
									selfReady,
									opponentReady,
									opponentName: opponentNameReady,
						});
					}
					break;
					case "countdown":
						remaining = data.body?.remaining;
						if (typeof remaining === "number" && !trainingRef.current) {
							if (remaining > 0)
								setView({ kind: "countdown", value: remaining });
							else setView({ kind: "play" });
						}
						break;
					case "data":
						setControlsReady(true);
						
						gameRef.current.serverUpdates.push(data.body);
						gameRef.current.serverUpdates.sort((a: ServerSnapshot, b: ServerSnapshot) => a.timestamp - b.timestamp);
						if (gameRef.current.serverUpdates.length > 60)
							gameRef.current.serverUpdates.shift();
						//gameRef.current.ball = data.body.ball;
						//gameRef.current.bonuses = data.body.bonuses;
						console.log(`session.side: ${session?.side}`);
						if (session?.side !== undefined) {
							const clientMe = session.side === 0 ? gameRef.current.players.p1 : gameRef.current.players.p2;
							const serverMe = session.side === 0 ? data.body.players.p1 : data.body.players.p2;
							Object.assign(clientMe, serverMe);
					

							//réconciliation
							pendingInputsRef.current = pendingInputsRef.current.filter((input: PendingInput) => input.inputId > serverMe.lastProcessedInputId);
						
							const replayPendingInputs = (serverMe: any, snapshotTimestamp: number, pendingInputs: PendingInput[], now: number) => {
								let virtualY = serverMe.y;
								let isMovingUp = serverMe.movingUp;
								let isMovingDown = serverMe.movingDown;
								let lastTime = snapshotTimestamp;

								const simulatePhysics = (endTime: number) => {
									const dt = (endTime - lastTime) / 1000;
									if (dt <= 0) return;
									let move = 90 * dt;
									if (isMovingUp) virtualY -= move;
									if (isMovingDown) virtualY += move;
									if (virtualY < 0) virtualY = 0;
									if (virtualY > 100 - serverMe.size) virtualY = 100 - serverMe.size;
									lastTime = endTime;
								}

								for (const input of pendingInputs) {
									simulatePhysics(input.timestamp);
									const isPress = input.type === "press";
									if (input.dir === "up") isMovingUp = isPress;
									if (input.dir === "down") isMovingDown = isPress;
								}
								simulatePhysics(now);
								
								return {y: virtualY, movingUp: isMovingUp, movingDown: isMovingDown};
							}
							//replay
							const correctedState = replayPendingInputs(serverMe, data.body.timestamp, pendingInputsRef.current, Date.now());
							clientMe.y = correctedState.y;
							clientMe.movingUp = correctedState.movingUp;
							clientMe.movingDown = correctedState.movingDown;
						}
						break;
						case "result":
							const type: string = data.body.is;
							const didWin: boolean = data.body.didWin;
							const scores: number[] = data.body.scores;
							const opponentFromResult: string | undefined =
							data.body?.opponent;
							applyTournamentRound(data.body);
							if (trainingRef.current) {
								trainingRef.current = false;
								trainingLabelsRef.current = null;
								resetGameState();
								setControlsReady(false);
								setView({ kind: "search" });
						break;
					}
					activeSessionRef.current = false;
					const td = data.body.tournamentDepth;
					const isTournamentFinalWin =
					type === "tournament" &&
					didWin === true &&
					td != null &&
					Number(td) === 1;
					setView({
						kind: "result",
						gameOver: {
							didWin,
							scores,
							tournamentDepth: td,
							finalTournamentWin:
							isTournamentFinalWin || undefined,
							type,
							opponent: opponentFromResult,
						},
					});
					break;
					case "error":
						if (data.msg === "tournamentId")
							window.alert(
						"Le nom de tournoi est deja utilisé. Choisissez-en un autre"
					);
					else if (data.msg === "rejoin_active") {
						window.alert(
							"Vous avez une partie de tournoi en attente de reconnexion. Reprenez-la ou attendez la fin du délai."
						);
						setView({ kind: "rules" });
					}
					break;
				}
			},
			[applyTournamentRound, clearSession, pendingInputsRef]
		);
		
		useEffect(() => {
			addPongRoute("pong", onMessage);
			return () => removePongRoute("pong", onMessage);
		}, [addPongRoute, removePongRoute, onMessage]);
		
		useEffect(() => {
			if (!session) return;
			if (
				["play", "ready", "countdown", "result", "wait"].includes(view.kind)
			)
			return;
			resetGameState();
			setControlsReady(false);
			activeSessionRef.current = true;
			trainingRef.current = false;
			trainingLabelsRef.current = null;
			if (session.sessionType === "offline") setView({ kind: "play" });
			else {
				setView({
					kind: "ready",
					remaining: 30,
					selfReady: false,
					opponentReady: false,
					opponentName: session.labels.opponent,
				});
			}
		}, [session, view.kind, resetGameState, setControlsReady]);
		
		useEffect(() => {
			if (prevAuthRef.current && !isAuthenticated && view.kind !== "rules") {
				localStop();
				setView({ kind: "rules" });
			}
			prevAuthRef.current = isAuthenticated;
		}, [isAuthenticated, view.kind, localStop]);
		
		useEffect(() => {
			return () => {
				pongWsRef?.current?.send(
					JSON.stringify({
						event: "stop",
						body: { type: "online" },
				})
			);
			clearSession();
		};
	}, [clearSession]);
	
	const gameOverData = view.kind === "result" ? view.gameOver : null;
	
	const stop = useCallback(
		(forceOnline: boolean = false) => {
			const stopType =
			forceOnline ||
			(!trainingRef.current && session?.sessionType !== "offline")
			? "online"
			: "offline";
			pongWsRef?.current?.send(
				JSON.stringify({
					event: "stop",
					body: { type: stopType },
				})
			);
			localStop();
		},
		[localStop, pongWsRef, session?.sessionType]
	);
	
	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			if (!trainingRef.current) lastStartPayloadRef.current = body;
			activeSessionRef.current = true;
			pongWsRef.current?.send(JSON.stringify({ event: "start", body }));
		},
		[pongWsRef]
	);
	
	const handleBackToMenu = useCallback(() => {
		stop(true);
		activeSessionRef.current = false;
		resetGameState();
		clearSession();
		setView({ kind: "rules" });
	}, [stop, clearSession, resetGameState]);
	
	const handleOnQuitGameover = useCallback(() => {
		resetGameState();
		clearSession();
		if (
			gameOverData &&
			gameOverData.tournamentDepth != null &&
			gameOverData.didWin &&
			!gameOverData.finalTournamentWin
		)
		stop(true);
		else localStop();
		setView({ kind: "rules" });
	}, [localStop, gameOverData, stop, resetGameState, clearSession]);
	
	const handlePlayerReady = useCallback(() => {
		pongWsRef.current?.send(
			JSON.stringify({
				event: "ready",
				body: { type: "player" },
			})
		);
	}, [pongWsRef]);
	
	const handleReplayFromOverlay = useCallback(() => {
		const payload = lastStartPayloadRef.current as {
			action?: string;
			diff?: Difficulty | null;
			[k: string]: unknown;
		} | null;
		resetGameState();
		console.log(
			`session.sessionType: ${session?.sessionType}, session.sessionId: ${session?.sessionId}, user.id: ${user?.id}`
		);
		if (
			session?.sessionType === "invite" &&
			session.sessionId &&
			user?.id
		) {
			const [id1, id2] = session.sessionId.split(":").map(Number);
			const opponentId = id1 === user.id ? id2 : id1;
			pongWsRef.current?.send(
				JSON.stringify({
					event: "invitation",
					body: { action: "invite", friendId: opponentId },
				})
			);
			setView({ kind: "rules" });
			return;
		}
		if (payload && payload.action) {
			console.log("PAYLOAAAADD");
			if (payload.action === "play_offline") {
				sendStartEvent({
					action: "play_offline",
					diff: payload.diff ?? null,
					options: payload.options,
				});
				return;
			}
			sendStartEvent(payload);
			return;
		}
		localStop();
	}, [
		sendStartEvent,
		resetGameState,
		setControlsReady,
		localStop,
		user,
		setSession,
		session,
		pongWsRef,
	]);
	
	const handleContinueFromOverlay = useCallback(() => {
		activeSessionRef.current = true;
		pongWsRef.current?.send(JSON.stringify({ event: "ready" }));
	}, [pongWsRef]);
	
	const handleQuitTraining = useCallback(() => {
		pongWsRef.current?.send(
			JSON.stringify({
				event: "stop",
				body: { type: "offline" },
			})
		);
		trainingRef.current = false;
		trainingLabelsRef.current = null;
		setView({ kind: "search" });
		resetGameState();
		setControlsReady(false);
	}, [pongWsRef, resetGameState, setControlsReady]);
	
	const handleRulesContinue = useCallback(
		(selectedMode: "offline" | "online", config?: any) => {
			if (selectedMode === "offline") {
				const { gamemode, botDiff } = config;
				const diff = gamemode === "solo" ? botDiff : null;
				
				sendStartEvent({
					action: "play_offline",
					diff,
					options: { bonus: config.bonus ?? false },
				});
			} else {
				if (config.name) {
					pongWsRef.current?.send(
						JSON.stringify({
							event: "set_name",
							name: config.name,
						})
					);
				}
				if (config.type === "tournament") {
					setView({ kind: "lobby" });
				} else {
					sendStartEvent({ action: "play_online" });
				}
			}
		},
		[
			user,
			setSession,
			resetGameState,
			setControlsReady,
			sendStartEvent,
			isAuthenticated,
			pongWsRef,
		]
	);
	
	
	usePongControls({
		isEnabled: isControlsReady,
		send: (payload) => pongWsRef.current?.send(JSON.stringify(payload)),
		player:
		session?.side === 0
		? gameRef.current.players.p1
		: gameRef.current.players.p2,
		pendingInputsRef,
	});
	
	console.log(`view: ${view.kind}`);
	const isSearching = view.kind === "search";
	const isTraining = view.kind === "training";
	const showGameField = [
		"play",
		"ready",
		"countdown",
		"result",
		"wait",
		"training",
	].includes(view.kind);
	const waitingView = view.kind === "wait" ? view : null;
	const readyView = view.kind === "ready" ? view : null;
	const countdownView = view.kind === "countdown" ? view : null;
	return (
		<div className="relative w-screen h-screen flex items-center justify-center">
			<SpaceBackground />
			<GameOverlay
				play={showGameField || isSearching || isTraining}
				sessionType={
					session?.sessionType === "offline" ? "offline" : "online"
				}
				tournamentDepth={session?.tournamentDepth ?? null}
				isTournament={session?.sessionType === "tournament"}
				/>
			<GameOverOverlay
				gameOver={gameOverData}
				onQuit={handleOnQuitGameover}
				onReplay={handleReplayFromOverlay}
				onContinue={handleContinueFromOverlay}
				side={session?.side ?? 0}
				/>
			{shouldMeasurePing && <PingDisplay ping={ping} />}
			{waitingView && showGameField && (
				<WaitingOverlay opponentName={waitingView.opponentName} />
			)}
			{(isSearching ||
				isTraining ||
				(view.kind === "play" &&
					session?.sessionType === "offline")) && (
				<div className="absolute top-4 left-4 z-80">
					<BackToMenuButton onClick={handleBackToMenu} />
				</div>
			)}
			{view.kind === "rules" && (
				<PongRulesScreen
					onContinue={handleRulesContinue}
					onBack={() => navigate("/")}
					bonusEnabled={bonusEnabled}
					setBonusEnabled={setBonusEnabled}
				/>
			)}
			{view.kind === "lobby" && (
				<PongTournamentLobby onBack={handleBackToMenu} />
			)}
			{(isSearching || isTraining) && (
				<SearchingOverlay
					training={isTraining}
					onQuit={() => {
						stop();
						clearSession();
						setView({ kind: "rules" });
					}}
					onQuitTraining={handleQuitTraining}
					onTrain={(diff: Difficulty) => {
						trainingRef.current = true;
						setView({ kind: "training" });
						sendStartEvent({
							action: "play_offline",
							diff,
							options: { bonus: bonusEnabled },
						});
						trainingLabelsRef.current = {
							self: user?.name
								? `${user.name} (You)`
								: PLAYER_LABELS.self,
							opponent: `Bot (${
								diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
						};
					}}
				/>
			)}
			{readyView && (
				<ReadyButton
					remaining={readyView.remaining}
					selfReady={readyView.selfReady}
					opponentReady={readyView.opponentReady}
					sessionLabels={session?.labels}
					onReady={handlePlayerReady}
				/>
			)}
			{countdownView && <Countdown value={countdownView.value} />}
			{showGameField && (
				<PongGameArea
					labels={labels}
					gameRef={gameRef}
					side={session?.side ?? 0}
				/>
			)}
		</div>
	);
}
