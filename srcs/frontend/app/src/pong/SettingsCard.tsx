import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChoiceGroup from "../Components/ChoiceGroup";
import { useGameSettings } from "../contexts/GameSettingsContext";

interface SettingsCardProps {
	onCancel: () => void;
	onUpdateGameSettings: (settings: any) => void;
}

export function SettingsCard({
	onCancel,
	onUpdateGameSettings,
}: SettingsCardProps) {
	const { t } = useTranslation();
	const { bonusEnabled, setBonusEnabled } = useGameSettings();

	const [localBonusEnabled, setLocalBonusEnabled] = useState(bonusEnabled);

	const hasChanges = localBonusEnabled !== bonusEnabled;

	const handleSave = () => {
		setBonusEnabled(localBonusEnabled);
		onUpdateGameSettings({ bonus: localBonusEnabled });
		onCancel();
	};

	return (
		<>
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl relative animate-fadeIn">
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("nav.settings") || "Settings"}
						</h1>
						<button
							onClick={onCancel}
							className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white transition-colors"
						>
							{t("common.close") || "Close"}
						</button>
					</div>

					<div className="space-y-8">
						<div className="space-y-6 animate-slideIn">
							<ChoiceGroup
								label={t("pong.settings.bonus") || "Bonus"}
								options={[
									t("common.enabled") || "Enabled",
									t("common.disabled") || "Disabled",
								]}
								value={
									localBonusEnabled
										? t("common.enabled") || "Enabled"
										: t("common.disabled") || "Disabled"
								}
								onChange={(value) =>
									setLocalBonusEnabled(
										value ===
											(t("common.enabled") || "Enabled")
									)
								}
								columns={2}
								color="purple"
								variant="md"
							/>
						</div>

						<div className="pt-6 border-t border-slate-700/50 flex justify-end gap-4">
							<button
								onClick={onCancel}
								className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all"
							>
								{t("pong.settings.cancel") || "Cancel"}
							</button>
							<button
								onClick={handleSave}
								disabled={!hasChanges}
								className={`px-6 py-2 rounded-lg font-semibold transition-all ${
									hasChanges
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-cyan-500/25"
										: "bg-slate-700 text-slate-500 cursor-not-allowed"
								}`}
							>
								{t("pong.settings.save") || "Save"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
