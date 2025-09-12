import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";
import BackgroundPicker from "../Components/BackgroundPicker";

interface RulesScreenProps {
	onContinue: () => void;
}

export default function RulesScreen({ onContinue }: RulesScreenProps) {
	const { t } = useTranslation();
  const [openPicker, setOpenPicker] = useState(false);

	return (
		<BackgroundSurface game="bombparty">
		<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
					<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
						{t("bombParty.rules.title")}
					</h1>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setOpenPicker(true)}
              className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
              aria-label={t('ui.background.openAria')}
            >
              {t('ui.background.open')}
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

      {openPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-3xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">{t('ui.background.title')}</h3>
            <BackgroundPicker game="bombparty" />
            <button
              onClick={() => setOpenPicker(false)}
              className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
		</BackgroundSurface>
	);
}