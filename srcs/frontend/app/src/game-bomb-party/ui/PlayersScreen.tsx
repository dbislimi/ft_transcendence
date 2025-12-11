import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface Player {
	id: string;
	name: string;
}

interface PlayersScreenProps {
	roomId: string;
	players: Player[];
	maxPlayers: number;
	isHost: boolean;
	onStart: () => void;
	onLeave: () => void;
}

export default function PlayersScreen({
	roomId,
	players,
	maxPlayers,
	isHost,
	onStart,
	onLeave,
}: PlayersScreenProps) {
	const { t } = useTranslation();
	const [countdown, setCountdown] = useState(0);
	const [isCountingDown, setIsCountingDown] = useState(false);
	const intervalRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);
	const canStart = players.length >= 2 && isHost;
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, []);
	const handleStart = () => {
		if (!canStart || isCountingDown || hasStartedRef.current) {
			return;
		}
		hasStartedRef.current = true;
		setIsCountingDown(true);
		setCountdown(3);
		intervalRef.current = window.setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					setIsCountingDown(false);
					onStart();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	return (
		<>
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("bombParty.players.title")}
						</h1>
						<div className="text-slate-400 text-sm">
							{players.length}/{maxPlayers}{" "}
							{t("bombParty.players.players")}
						</div>
					</div>
					<div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
						<div className="text-slate-300 text-sm mb-1">
							{t("bombParty.players.roomId")}
						</div>
						<div className="text-cyan-400 font-mono text-lg">
							{roomId}
						</div>
					</div>
					<div className="mb-6">
						<h2 className="text-lg font-semibold text-slate-300 mb-4">
							{t("bombParty.players.waiting")}
						</h2>
						<div className="space-y-2">
							{players.map((player, index) => (
								<div
									key={player.id}
									className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
											{index + 1}
										</div>
										<span className="text-slate-300">
											{player.name}
										</span>
									</div>
									{index === 0 && (
										<span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
											{t("bombParty.players.host")}
										</span>
									)}
								</div>
							))}
						</div>
					</div>
					{players.length < maxPlayers && (
						<div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
							<div className="text-yellow-400 text-center">
								{t("bombParty.players.waitingForPlayers")} (
								{players.length}/{maxPlayers})
							</div>
						</div>
					)}
					<div className="flex gap-4">
						{isHost && (
							<button
								onClick={handleStart}
								disabled={!canStart || isCountingDown}
								className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isCountingDown
									? `${countdown}...`
									: t("bombParty.players.start")}
							</button>
						)}
						<button
							onClick={onLeave}
							className="px-6 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg transition-all duration-200"
						>
							{t("bombParty.players.leave")}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
