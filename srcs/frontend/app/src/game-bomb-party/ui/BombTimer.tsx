import React from "react";
import { useTranslation } from "react-i18next";
import type { SyllableDifficulty } from "../../types/bombparty";
import bombeImg from "../../../img/bombparty/bombe.png?url";

interface BombTimerProps {
	syllable: string;
	remainingMs: number;
	isActive: boolean;
	usageCount?: number;
	totalPlayers?: number;
	currentPlayerName?: string;
	flashExtend?: boolean;
	difficulty?: SyllableDifficulty;
}

export default function BombTimer({
	syllable,
	remainingMs,
	isActive,
	usageCount,
	totalPlayers,
	currentPlayerName,
	flashExtend = false,
	difficulty,
}: BombTimerProps) {
	const { t } = useTranslation();
	const formatTime = (ms: number): string => {
		const seconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const isDanger = false;
	const timeDisplay = formatTime(remainingMs);
	const displaySyllable = syllable || "...";

	const getDifficultyInfo = (diff?: SyllableDifficulty) => {
		switch (diff) {
			case "easy":
				return {
					color: "text-green-400",
					bgColor: "bg-green-500/20",
					borderColor: "border-green-500/30",
					label: t("bombParty.difficulty.easy"),
					icon: "⭐",
				};
			case "hard":
				return {
					color: "text-red-400",
					bgColor: "bg-red-500/20",
					borderColor: "border-red-500/30",
					label: t("bombParty.difficulty.hard"),
					icon: "🔥",
				};
			case "medium":
			default:
				return {
					color: "text-yellow-400",
					bgColor: "bg-yellow-500/20",
					borderColor: "border-yellow-500/30",
					label: t("bombParty.difficulty.medium"),
					icon: "⚡",
				};
		}
	};

	const difficultyInfo = getDifficultyInfo(difficulty);

	if (isActive && remainingMs <= 0) {
		console.warn("[BombTimer] Timer actif mais remainingMs <= 0", {
			isActive,
			remainingMs,
			syllable,
			phase: "TURN_ACTIVE",
		});
	}

	if (!isActive || remainingMs <= 0) {
		return (
			<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
				<div className="mb-6">
					<img src={bombeImg} alt="Bombe" className="w-32 h-32" />
				</div>

				<div className="text-5xl font-bold tracking-wider text-slate-400">
					{displaySyllable.toUpperCase()}
				</div>

				{difficulty && (
					<div
						className={`text-sm font-semibold mt-2 ${difficultyInfo.bgColor} ${difficultyInfo.borderColor} px-3 py-1 rounded-full border ${difficultyInfo.color}`}
					>
						{difficultyInfo.icon} {difficultyInfo.label}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
			<div className="relative mb-6">
				<div className="animate-bomb-pulse">
					<img src={bombeImg} alt="Bombe" className="w-32 h-32" />
				</div>
				<div
					className={`absolute inset-0 flex items-center justify-center blur-sm opacity-50 ${
						isDanger ? "animate-modern-ping" : ""
					}`}
				>
					<img src={bombeImg} alt="Bombe" className="w-32 h-32" />
				</div>
			</div>

			<div
				className={`text-6xl font-bold mb-4 transition-colors duration-200 ${
					flashExtend
						? "text-green-400 animate-timer-flash"
						: "text-cyan-400"
				}`}
			>
				{timeDisplay}
			</div>

			<div
				className={`text-5xl font-bold tracking-wider transition-colors duration-300 ${
					isActive ? "text-yellow-400" : "text-slate-400"
				}`}
			>
				{syllable.toUpperCase()}
			</div>

			{difficulty && (
				<div
					className={`text-sm mt-3 px-3 py-1 rounded-full border ${difficultyInfo.bgColor} ${difficultyInfo.borderColor} ${difficultyInfo.color}`}
				>
					{difficultyInfo.icon} {difficultyInfo.label}
				</div>
			)}

			{currentPlayerName && (
				<div className="text-xl text-yellow-300 mt-4 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
					⏳ {currentPlayerName}
				</div>
			)}
		</div>
	);
}
