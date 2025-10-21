import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";
import BackgroundPicker from "../Components/BackgroundPicker";
import GameCard from "../Components/GameCard";
import { useNavigate } from "react-router-dom";

interface RulesScreenProps {
	onContinue: () => void;
}

export default function RulesScreen({ onContinue }: RulesScreenProps) {
	const { t } = useTranslation();
	const [openPicker, setOpenPicker] = useState(false);
	const navigate = useNavigate();

	return (
		<BackgroundSurface game="bombparty">
			<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="max-w-2xl w-full">
					<GameCard
						title={t("bombParty.rules.title")}
						subtitle={undefined}
						confirmLabel={t("bombParty.rules.continue")}
						onConfirm={onContinue}
						cancelLabel={t("common.back")}
						onCancel={() => navigate("/")}
						actionsDirection="vertical"
					>
						<div className="flex justify-end mb-2">
							<button
								type="button"
								onClick={() => setOpenPicker(true)}
								className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
								aria-label={t("ui.background.openAria")}
							>
								{t("ui.background.open")}
							</button>
						</div>
						<div className="text-amber-300 text-sm mb-3">
							{t("bombParty.rules.languageNotice")}
						</div>
						<ul className="text-slate-300 space-y-2 list-disc list-inside">
							<li>{t("bombParty.rules.rule1")}</li>
							<li>{t("bombParty.rules.rule2")}</li>
							<li>{t("bombParty.rules.rule3")}</li>
							<li>{t("bombParty.rules.rule4")}</li>
						</ul>
					</GameCard>
				</div>
			</div>

			{openPicker && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-slate-800 rounded-2xl p-6 max-w-3xl w-full mx-4">
						<h3 className="text-xl font-bold text-white mb-4">
							{t("ui.background.title")}
						</h3>
						<BackgroundPicker game="bombparty" />
						<button
							onClick={() => setOpenPicker(false)}
							className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							{t("common.close")}
						</button>
					</div>
				</div>
			)}
		</BackgroundSurface>
	);
}
