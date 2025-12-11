import i18n from "../i18n";

export type PlayerLabels = {
	self: string;
	opponent: string;
};

export type Difficulty = "easy" | "medium" | "hard";

export interface LabelOptions {
	sessionLabels?: PlayerLabels;
	botDifficulty?: string;
	gameOverOpponent?: string;
}

const translateLabel = (label: string, difficulty?: string): string => {
	if (label === "@opponent") return i18n.t("pong.labels.defaultOpponent");
	if (label === "@player1") return i18n.t("pong.labels.player1");
	if (label === "@player2") return i18n.t("pong.labels.player2");
	if (label === "@bot" && difficulty) {
		return i18n.t("pong.labels.bot", {
			difficulty: i18n.t(`pong.difficulty.${difficulty}`),
		});
	}
	return label;
};

export function getPlayerLabels({
	sessionLabels,
	botDifficulty,
	gameOverOpponent,
}: LabelOptions): PlayerLabels {
	if (sessionLabels) {
		return {
			self: translateLabel(sessionLabels.self),
			opponent: translateLabel(sessionLabels.opponent, botDifficulty),
		};
	}
	if (gameOverOpponent) {
		return {
			self: i18n.t("pong.labels.defaultSelf"),
			opponent: translateLabel(gameOverOpponent, botDifficulty),
		};
	}
	return {
		self: i18n.t("pong.labels.defaultSelf"),
		opponent: i18n.t("pong.labels.defaultOpponent"),
	};
}
