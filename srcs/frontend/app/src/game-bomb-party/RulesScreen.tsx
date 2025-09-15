import React from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";

interface RulesScreenProps {
	onContinue: () => void;
}

export default function RulesScreen({ onContinue }: RulesScreenProps) {
	const { t } = useTranslation();

	return (
		<BackgroundSurface game="bombparty">
		<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
					<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
						{t("bombParty.rules.title")}
					</h1>
					<div className="text-amber-300 text-sm mb-3">
						{t("bombParty.rules.languageNotice")}
					</div>
					<ul className="text-slate-300 space-y-2 list-disc list-inside">
						<li>{t("bombParty.rules.rule1")}</li>
						<li>{t("bombParty.rules.rule2")}</li>
						<li>{t("bombParty.rules.rule3")}</li>
						<li>{t("bombParty.rules.rule4")}</li>
					</ul>
					<button
						type="button"
						onClick={onContinue}
						className="mt-6 w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
						aria-label={t('bombParty.rules.continueAria')}
					>
						{t("bombParty.rules.continue")}
					</button>
				</div>
			</div>

			{/* Background picker modal removed */}
		</BackgroundSurface>
	);
}