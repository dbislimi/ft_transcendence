import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerBonuses, BonusKey } from "../core/types";
import { SuccessAnimation, ErrorAnimation } from "./Animations";
import { useSoundEffects } from "./useSoundEffects";
import { useSettings } from "../../contexts/SettingsContext";
import { BONUS_RARITY, MAX_BONUS_PER_TYPE } from "../../types/bombparty";
import { bombPartyApiService } from "../../services/bombPartyApiService";

interface WordInputProps {
	syllable: string;
	usedWords: string[];
	onSubmit: (word: string) => void;
	isActive: boolean;
	engine?: any;
	bonuses?: PlayerBonuses;
	onActivateBonus?: (bonus: BonusKey) => boolean;
	hasDoubleChance?: boolean;
}

export default function WordInput({
	syllable,
	usedWords,
	onSubmit,
	isActive,
	engine,
	bonuses,
	onActivateBonus,
	hasDoubleChance,
}: WordInputProps) {
	const { t } = useTranslation();
	const [word, setWord] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [syllableInfo, setSyllableInfo] = useState<{
		availableWords: number;
		totalWords: number;
	} | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [cooldown, setCooldown] = useState(false);
	const [processingKey, setProcessingKey] = useState<BonusKey | null>(null);
	const [successTrigger, setSuccessTrigger] = useState<number | null>(null);
	const [errorTrigger, setErrorTrigger] = useState<{
		timestamp: number;
		message: string;
	} | null>(null);
	const { playSound } = useSoundEffects();
	const { settings } = useSettings();
	const previousUsedWordsRef = useRef<string[]>(usedWords);
	const lastSubmittedWordRef = useRef<string | null>(null);

	useEffect(() => {
		if (isActive && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isActive]);

	useEffect(() => {
		if (syllable && syllable.length >= 2) {
			(async () => {
				try {
					if (engine && engine.getWordSuggestions) {
						const newSuggestions = await engine.getWordSuggestions(
							5
						);
						const info = await engine.getCurrentSyllableInfo();
						setSuggestions(newSuggestions);
						setSyllableInfo(info);
					} else {
						const newSuggestions =
							await bombPartyApiService.getWordSuggestions(
								syllable,
								5
							);
						setSuggestions(newSuggestions);
						setSyllableInfo(null);
					}
				} catch (error) {
					console.error(
						"[WordInput] Error fetching suggestions:",
						error
					);
					setSuggestions([]);
				}
			})();
		}
	}, [syllable, engine]);

	useEffect(() => {
		if (
			lastSubmittedWordRef.current &&
			usedWords.length > previousUsedWordsRef.current.length
		) {
			const newWord = usedWords.find(
				(w) =>
					!previousUsedWordsRef.current.includes(w) &&
					w.toLowerCase() === lastSubmittedWordRef.current
			);

			if (newWord) {
				setSuccessTrigger(Date.now());
				playSound("success");
				lastSubmittedWordRef.current = null;
			}
		}

		if (lastSubmittedWordRef.current) {
			const timeout = setTimeout(() => {
				if (!usedWords.includes(lastSubmittedWordRef.current!)) {
					lastSubmittedWordRef.current = null;
				}
			}, 2000);

			return () => clearTimeout(timeout);
		}

		previousUsedWordsRef.current = usedWords;
	}, [usedWords, playSound]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!word.trim()) return;

		const trimmedWord = word.trim();
		if (trimmedWord.length < 3) {
			const errorMsg = t("bombParty.input.errors.tooShort");
			setError(errorMsg);
			setErrorTrigger({ timestamp: Date.now(), message: errorMsg });
			playSound("error");
			return;
		}

		if (
			syllable &&
			!trimmedWord.toLowerCase().includes(syllable.toLowerCase())
		) {
			const errorMsg = t("bombParty.input.errors.missingSyllable", {
				syllable: syllable.toUpperCase(),
			});
			setError(errorMsg);
			setErrorTrigger({ timestamp: Date.now(), message: errorMsg });
			playSound("error");
			return;
		}

		if (usedWords.includes(trimmedWord.toLowerCase())) {
			const errorMsg = t("bombParty.input.errors.duplicate");
			setError(errorMsg);
			setErrorTrigger({ timestamp: Date.now(), message: errorMsg });
			playSound("error");
			return;
		}

		setError(null);
		lastSubmittedWordRef.current = trimmedWord.toLowerCase();
		onSubmit(trimmedWord);
		setWord("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSubmit(e as any);
		}
	};

	const tryActivate = (key: BonusKey) => {
		if (!onActivateBonus || cooldown) return;
		if (!bonuses || (bonuses as any)[key] <= 0) return;
		setProcessingKey(key);
		const ok = onActivateBonus(key);
		setCooldown(true);
		setTimeout(() => setCooldown(false), 500);
		setTimeout(() => setProcessingKey(null), 600);
	};

	const bonusStyles: Record<
		BonusKey,
		{ gradient: string; glow: string; hover: string }
	> = {
		inversion: {
			gradient: "from-purple-500/20 to-indigo-500/20",
			glow: "shadow-purple-500/50",
			hover: "hover:from-purple-500/30 hover:to-indigo-500/30 hover:shadow-purple-500/70",
		},
		plus5sec: {
			gradient: "from-green-500/20 to-emerald-500/20",
			glow: "shadow-green-500/50",
			hover: "hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-green-500/70",
		},
		vitesseEclair: {
			gradient: "from-yellow-500/20 to-orange-500/20",
			glow: "shadow-yellow-500/50",
			hover: "hover:from-yellow-500/30 hover:to-orange-500/30 hover:shadow-yellow-500/70",
		},
		doubleChance: {
			gradient: "from-blue-500/20 to-cyan-500/20",
			glow: "shadow-blue-500/50",
			hover: "hover:from-blue-500/30 hover:to-cyan-500/30 hover:shadow-blue-500/70",
		},
		extraLife: {
			gradient: "from-pink-500/20 to-rose-500/20",
			glow: "shadow-pink-500/50",
			hover: "hover:from-pink-500/30 hover:to-rose-500/30 hover:shadow-pink-500/70",
		},
	};

	const getRarityStyles = (rarity: "common" | "uncommon" | "rare") => {
		switch (rarity) {
			case "rare":
				return {
					border: "border-yellow-400/70 border-2",
					glow: "shadow-yellow-500/60 shadow-lg",
					pulse: "animate-double-chance-glow",
					badge: "bg-gradient-to-br from-yellow-400 to-orange-500 text-yellow-900",
				};
			case "uncommon":
				return {
					border: "border-blue-400/70 border-2",
					glow: "shadow-blue-500/50 shadow-md",
					pulse: "",
					badge: "bg-gradient-to-br from-blue-400 to-cyan-500 text-blue-900",
				};
			case "common":
			default:
				return {
					border: "border-cyan-400/50 border-2",
					glow: "shadow-cyan-500/40 shadow-sm",
					pulse: "",
					badge: "bg-gradient-to-br from-cyan-400 to-blue-500 text-cyan-900",
				};
		}
	};

	const BonusBar = () => {
		const items: Array<{
			key: BonusKey;
			icon: string;
			nameKey: string;
			descKey: string;
		}> = [
			{
				key: "inversion",
				icon: "🔁",
				nameKey: "bombParty.bonus.inversion.name",
				descKey: "bombParty.bonus.inversion.desc",
			},
			{
				key: "plus5sec",
				icon: "➕",
				nameKey: "bombParty.bonus.plus5sec.name",
				descKey: "bombParty.bonus.plus5sec.desc",
			},
			{
				key: "vitesseEclair",
				icon: "⚡",
				nameKey: "bombParty.bonus.vitesseEclair.name",
				descKey: "bombParty.bonus.vitesseEclair.desc",
			},
			{
				key: "doubleChance",
				icon: "♢",
				nameKey: "bombParty.bonus.doubleChance.name",
				descKey: "bombParty.bonus.doubleChance.desc",
			},
			{
				key: "extraLife",
				icon: "❤️",
				nameKey: "bombParty.bonus.extraLife.name",
				descKey: "bombParty.bonus.extraLife.desc",
			},
		];
		return (
			<div className="flex gap-2 items-center justify-end">
				{items.map((it) => {
					const count = (bonuses as any)?.[it.key] ?? 0;
					const disabled = cooldown || count <= 0 || !isActive;
					const styles = bonusStyles[it.key];
					const isProcessing = processingKey === it.key;
					const rarity = BONUS_RARITY[it.key];
					const rarityStyles = getRarityStyles(rarity);
					const isAtMax = count >= MAX_BONUS_PER_TYPE;
					return (
						<button
							key={it.key}
							type="button"
							onClick={() => tryActivate(it.key)}
							disabled={disabled}
							title={`${t(it.nameKey)} — ${t(it.descKey)}${
								isAtMax
									? ` (${count}/${MAX_BONUS_PER_TYPE})`
									: ""
							}`}
							className={`relative w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-300 transform ${
								disabled
									? "border-slate-600 text-slate-400 opacity-40 cursor-not-allowed border-2"
									: `${rarityStyles.border} bg-gradient-to-br ${styles.gradient} ${styles.hover} ${styles.glow} ${rarityStyles.glow} cursor-pointer hover:scale-110 active:scale-95 ${rarityStyles.pulse}`
							} ${
								isProcessing
									? "animate-bonus-activate scale-125"
									: ""
							}`}
						>
							{!disabled && (
								<div
									className={`absolute inset-0 rounded-xl bg-gradient-to-br ${styles.gradient} opacity-0 hover:opacity-100 transition-opacity duration-300 blur-sm -z-10`}
								></div>
							)}

							<span
								className={`relative z-10 transform transition-transform duration-300 ${
									isProcessing ? "animate-spin-bonus" : ""
								}`}
							>
								{it.icon}
							</span>

							{count > 0 && (
								<span
									className={`absolute -top-1 -right-1 text-[10px] font-bold ${
										rarityStyles.badge
									} rounded-full w-6 h-6 flex items-center justify-center border-2 border-white/30 shadow-lg transform transition-all duration-300 ${
										!disabled ? "hover:scale-125" : ""
									} ${
										isAtMax
											? "ring-2 ring-yellow-300 ring-opacity-75"
											: ""
									}`}
								>
									{count}
								</span>
							)}

							{isProcessing && (
								<>
									<div
										className={`absolute inset-0 rounded-xl ${styles.glow} animate-modern-ping`}
									></div>
									<div
										className={`absolute inset-0 rounded-xl ${styles.glow} animate-modern-ping`}
										style={{ animationDelay: "150ms" }}
									></div>
								</>
							)}
						</button>
					);
				})}
			</div>
		);
	};

	const animationsDisabled =
		settings.game?.preferences?.reducedMotion ||
		!settings.display.animations;

	if (!isActive) {
		return null;
	}

	return (
		<>
			<SuccessAnimation
				trigger={successTrigger}
				disabled={animationsDisabled}
			/>
			<ErrorAnimation
				trigger={errorTrigger?.timestamp}
				disabled={animationsDisabled}
				message={errorTrigger?.message}
			/>
			<div className="w-full max-w-md px-6">
				<div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-500/30 p-6 shadow-2xl">
					<div className="text-center mb-4">
						<p className="text-slate-300 text-sm mb-2">
							{t("bombParty.input.instruction")}
						</p>
						<p className="text-cyan-400 font-mono text-lg">
							"{(syllable || "...").toUpperCase()}"
						</p>
						{syllableInfo && (
							<div className="mt-2 text-xs text-slate-400">
								{syllableInfo.availableWords}{" "}
								{t("bombParty.input.availableWords")}{" "}
								{syllableInfo.totalWords}
							</div>
						)}
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="relative">
							<input
								ref={inputRef}
								type="text"
								value={word}
								onChange={(e) => {
									setWord(e.target.value);
									setError(null);
								}}
								onKeyPress={handleKeyPress}
								placeholder={t("bombParty.input.placeholder")}
								className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
								disabled={!isActive}
							/>
						</div>

						<div className="flex justify-between items-center">
							<div
								className={`text-sm font-medium transition-colors duration-300 ${
									hasDoubleChance
										? "text-blue-400 animate-double-chance-glow flex items-center gap-2"
										: "text-slate-400"
								}`}
							>
								{hasDoubleChance && (
									<>
										<span className="text-lg animate-spin-slow">
											♢
										</span>
										<span>
											{t(
												"bombParty.bonus.doubleChance.name"
											)}
										</span>
									</>
								)}
							</div>
							<BonusBar />
						</div>

						<button
							type="submit"
							disabled={!word.trim() || !isActive}
							className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t("bombParty.input.submit")}
						</button>
					</form>

					{error && (
						<div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
							<p className="text-red-400 text-sm text-center">
								{error}
							</p>
						</div>
					)}

					{usedWords.length > 0 && (
						<div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
							<h4 className="text-slate-300 text-sm font-medium mb-2">
								{t("bombParty.input.recentWords")}
							</h4>
							<div className="flex flex-wrap gap-2">
								{usedWords.slice(-5).map((usedWord, index) => (
									<span
										key={index}
										className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded"
									>
										{usedWord}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
