import Database from "sqlite3";
import type {
	BadgeType,
	UserProgress,
	Badge,
	BadgeRarity,
} from './shared-types.js';

export interface DBResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

const LEVEL_XP_REQUIREMENTS: number[] = [
	0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000,
];

function getXpForLevel(level: number): number {
	if (level <= 1) return 0;
	if (level <= LEVEL_XP_REQUIREMENTS.length) {
		return LEVEL_XP_REQUIREMENTS[level - 1];
	}
	// formule exponentielle pour niveaux > 10
	const baseXp = LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];
	const levelDiff = level - LEVEL_XP_REQUIREMENTS.length;
	return baseXp + levelDiff * levelDiff * 2000;
}

function calculateLevel(totalXp: number): {
	level: number;
	currentXp: number;
	xpToNext: number;
} {
	let level = 1;
	let xpForCurrentLevel = 0;
	let xpForNextLevel = getXpForLevel(2);

	while (totalXp >= xpForNextLevel && level < 100) {
		level++;
		xpForCurrentLevel = xpForNextLevel;
		xpForNextLevel = getXpForLevel(level + 1);
	}

	const currentXp = totalXp - xpForCurrentLevel;
	const xpToNext = xpForNextLevel - totalXp;

	return { level, currentXp, xpToNext };
}

const BADGE_DEFINITIONS: Record<
	BadgeType,
	{ name: string; description: string; icon: string; rarity: string }
> = {
	first_win: {
		name: "Premiere Victoire",
		description: "Gagnez votre premiere partie",
		icon: "🏆",
		rarity: "common",
	},
	streak_10: {
		name: "Serie de 10",
		description: "Gagnez 10 parties consecutives",
		icon: "🔥",
		rarity: "uncommon",
	},
	streak_20: {
		name: "Serie de 20",
		description: "Gagnez 20 parties consecutives",
		icon: "💥",
		rarity: "rare",
	},
	perfect_game: {
		name: "Partie Parfaite",
		description: "Gagnez une partie sans perdre de vie",
		icon: "✨",
		rarity: "rare",
	},
	speed_demon: {
		name: "Demon de la Vitesse",
		description: "Temps de reponse moyen inferieur à 2 secondes",
		icon: "⚡",
		rarity: "uncommon",
	},
	word_master: {
		name: "Maître des Mots",
		description: "Soumettez 1000 mots valides",
		icon: "📚",
		rarity: "epic",
	},
	survivor: {
		name: "Survivant",
		description: "Gagnez avec seulement 1 vie restante",
		icon: "🛡️",
		rarity: "uncommon",
	},
	centurion: {
		name: "Centurion",
		description: "Jouez 100 parties",
		icon: "💯",
		rarity: "epic",
	},
	undefeated: {
		name: "Invincible",
		description: "Gagnez 50 parties",
		icon: "👑",
		rarity: "legendary",
	},
	trigram_expert: {
		name: "Expert en Trigrammes",
		description: "Taux de reussite superieur à 90%",
		icon: "🎯",
		rarity: "rare",
	},
};

export class BombPartyStatsService {
	private db: Database.Database;

	constructor(database: Database.Database) {
		this.db = database;
	}

	// Calculer le XP gagne apres une partie
	calculateXpGain(matchData: {
		isWin: boolean;
		wordsSubmitted: number;
		validWords: number;
		bestStreak: number;
		matchDuration: number;
	}): number {
		let xp = 0;

		xp += 10;

		if (matchData.isWin) {
			xp += 50;
		}

		xp += matchData.validWords * 2;

		xp += matchData.bestStreak * 5;

		// bonus rapidite: moins de temps = plus de xp
		const avgTimePerWord =
			matchData.matchDuration / Math.max(matchData.wordsSubmitted, 1);
		if (avgTimePerWord < 3) {
			xp += 20;
		}

		return Math.floor(xp);
	}

	async getUserProgress(userId: number): Promise<DBResult<UserProgress>> {
		return new Promise((resolve) => {
			this.db.get(
				"SELECT * FROM bp_user_progress WHERE user_id = ?",
				[userId],
				(err, row: any) => {
					if (err) {
						console.error(
							"[StatsService] Error fetching user progress:",
							err
						);
						resolve({ success: false, error: err.message });
						return;
					}

					if (!row) {
						this.db.run(
							`INSERT INTO bp_user_progress (user_id) VALUES (?)`,
							[userId],
							(insertErr) => {
								if (insertErr) {
									console.error(
										"[StatsService] Error creating default progress:",
										insertErr
									);
									resolve({
										success: false,
										error: insertErr.message,
									});
									return;
								}

								const levelInfo = calculateLevel(0);
								resolve({
									success: true,
									data: {
										userId,
										level: 1,
										currentXp: 0,
										totalXp: 0,
										xpToNextLevel: levelInfo.xpToNext,
										badges: [],
										unlockedThemes: ["default"],
										unlockedAvatars: ["default"],
										currentTheme: "default",
										currentAvatar: "default",
										streak: 0,
										longestStreak: 0,
										lastWinStreak: 0,
									},
								});
							}
						);
						return;
					}

					const badges: Badge[] = JSON.parse(row.badges || "[]");
					const unlockedThemes: string[] = JSON.parse(
						row.unlocked_themes || '["default"]'
					);
					const unlockedAvatars: string[] = JSON.parse(
						row.unlocked_avatars || '["default"]'
					);
					const levelInfo = calculateLevel(row.total_xp);

					resolve({
						success: true,
						data: {
							userId: row.user_id,
							level: row.level,
							currentXp: levelInfo.currentXp,
							totalXp: row.total_xp,
							xpToNextLevel: levelInfo.xpToNext,
							badges,
							unlockedThemes,
							unlockedAvatars,
							currentTheme: row.current_theme || "default",
							currentAvatar: row.current_avatar || "default",
							streak: row.streak || 0,
							longestStreak: row.longest_streak || 0,
							lastWinStreak: row.last_win_streak || 0,
						},
					});
				}
			);
		});
	}

	async updateProgress(
		userId: number,
		matchData: {
			isWin: boolean;
			wordsSubmitted: number;
			validWords: number;
			bestStreak: number;
			matchDuration: number;
			finalLives?: number;
		},
		userStats: {
			totalWins: number;
			totalMatches: number;
			totalValidWords: number;
			averageResponseTime: number;
			bestStreak: number;
		}
	): Promise<DBResult<{ newBadges: Badge[]; levelUp: boolean }>> {
		return new Promise(async (resolve) => {
			try {
				const progressResult = await this.getUserProgress(userId);
				if (!progressResult.success || !progressResult.data) {
					resolve({
						success: false,
						error: "Could not fetch user progress",
					});
					return;
				}

				const currentProgress = progressResult.data;
				const xpGain = this.calculateXpGain(matchData);
				const newTotalXp = currentProgress.totalXp + xpGain;
				const oldLevel = currentProgress.level;
				const newLevelInfo = calculateLevel(newTotalXp);
				const levelUp = newLevelInfo.level > oldLevel;

				// Mettre à jour le streak
				let newStreak = currentProgress.streak;
				let newLongestStreak = currentProgress.longestStreak;
				if (matchData.isWin) {
					newStreak += 1;
					newLongestStreak = Math.max(newLongestStreak, newStreak);
				} else {
					newStreak = 0;
				}

				// Verifier les nouveaux badges
				const currentBadges = currentProgress.badges;
				const newBadges: Badge[] = [];
				const badgeTypes = Object.keys(
					BADGE_DEFINITIONS
				) as BadgeType[];

				for (const badgeType of badgeTypes) {
					if (currentBadges.some((b) => b.type === badgeType)) {
						continue;
					}

					let shouldUnlock = false;
					switch (badgeType) {
						case "first_win":
							shouldUnlock = userStats.totalWins >= 1;
							break;
						case "streak_10":
							shouldUnlock = newStreak >= 10;
							break;
						case "streak_20":
							shouldUnlock = newStreak >= 20;
							break;
						case "perfect_game":
							shouldUnlock =
								matchData.isWin && matchData.finalLives === 3;
							break;
						case "speed_demon":
							shouldUnlock = userStats.averageResponseTime < 2000;
							break;
						case "word_master":
							shouldUnlock = userStats.totalValidWords >= 1000;
							break;
						case "survivor":
							shouldUnlock =
								matchData.isWin && matchData.finalLives === 1;
							break;
						case "centurion":
							shouldUnlock = userStats.totalMatches >= 100;
							break;
						case "undefeated":
							shouldUnlock = userStats.totalWins >= 50;
							break;
						case "trigram_expert":
							const accuracy =
								userStats.totalValidWords > 0
									? (userStats.totalValidWords /
											(userStats.totalValidWords +
												userStats.totalMatches * 2)) *
									  100
									: 0;
							shouldUnlock = accuracy > 90;
							break;
					}

					if (shouldUnlock) {
						const badgeDef = BADGE_DEFINITIONS[badgeType];
						const newBadge: Badge = {
							id: `${badgeType}_${Date.now()}`,
							type: badgeType,
							name: badgeDef.name,
							description: badgeDef.description,
							icon: badgeDef.icon,
							rarity: badgeDef.rarity as BadgeRarity,
							unlockedAt: new Date(),
						};
						newBadges.push(newBadge);
						currentBadges.push(newBadge);
					}
				}

				this.db.run(
					`UPDATE bp_user_progress 
           SET level = ?, 
               total_xp = ?, 
               current_xp = ?,
               badges = ?, 
               streak = ?, 
               longest_streak = ?,
               last_win_streak = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
					[
						newLevelInfo.level,
						newTotalXp,
						newLevelInfo.currentXp,
						JSON.stringify(currentBadges),
						newStreak,
						newLongestStreak,
						matchData.isWin
							? newStreak
							: currentProgress.lastWinStreak,
						userId,
					],
					(err) => {
						if (err) {
							console.error(
								"[StatsService] Error updating progress:",
								err
							);
							resolve({ success: false, error: err.message });
							return;
						}

						resolve({
							success: true,
							data: { newBadges, levelUp },
						});
					}
				);
			} catch (error) {
				console.error("[StatsService] Error in updateProgress:", error);
				resolve({
					success: false,
					error:
						error instanceof Error
							? error.message
							: "Unknown error",
				});
			}
		});
	}

	async updateUserPreferences(
		userId: number,
		preferences: { theme?: string; avatar?: string }
	): Promise<DBResult<void>> {
		return new Promise((resolve) => {
			const updates: string[] = [];
			const values: any[] = [];

			if (preferences.theme !== undefined) {
				updates.push("current_theme = ?");
				values.push(preferences.theme);
			}

			if (preferences.avatar !== undefined) {
				updates.push("current_avatar = ?");
				values.push(preferences.avatar);
			}

			if (updates.length === 0) {
				resolve({ success: true });
				return;
			}

			updates.push("updated_at = CURRENT_TIMESTAMP");
			values.push(userId);

			const sql = `UPDATE bp_user_progress SET ${updates.join(
				", "
			)} WHERE user_id = ?`;

			this.db.run(sql, values, (err) => {
				if (err) {
					console.error(
						"[StatsService] Error updating preferences:",
						err
					);
					resolve({ success: false, error: err.message });
					return;
				}

				resolve({ success: true });
			});
		});
	}
}
