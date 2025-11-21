import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBombPartyStore, type UserPreferences } from '../../store/useBombPartyStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const { userPreferences, setUserPreferences, resetUserPreferences } = useBombPartyStore();
  if (!isOpen) 
    return null;
  const handleToggleSuggestions = (enabled: boolean) => {
    setUserPreferences({ suggestionsEnabled: enabled });
  };
  const handleSuggestionsCountChange = (count: 0 | 3 | 5 | 10) => {
    setUserPreferences({ suggestionsCount: count });
  };
  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard' | 'all') => {
    setUserPreferences({ suggestionsDifficulty: difficulty });
  };
  const handleReset = () => {
    resetUserPreferences();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-purple-500/30 p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {t('bombParty.settings.title', 'Paramètres')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
            aria-label={t('bombParty.settings.close', 'Fermer')}
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-200 font-medium">
                {t('bombParty.settings.suggestionsEnabled', 'Afficher les suggestions')}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={userPreferences.suggestionsEnabled}
                  onChange={(e) => handleToggleSuggestions(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors duration-200 ${
                    userPreferences.suggestionsEnabled
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                      : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                      userPreferences.suggestionsEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </label>
            <p className="text-xs text-slate-400 mt-2">
              {t('bombParty.settings.suggestionsEnabledDesc', 'Active ou désactive l\'affichage des suggestions de mots')}
            </p>
          </div>
          {userPreferences.suggestionsEnabled && (
            <div>
              <label className="block text-slate-200 font-medium mb-3">
                {t('bombParty.settings.suggestionsCount', 'Nombre de suggestions')}
              </label>
              <div className="flex gap-2">
                {([0, 3, 5, 10] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => handleSuggestionsCountChange(count)}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                      userPreferences.suggestionsCount === count
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {count === 0 ? t('bombParty.settings.none', 'Aucune') : count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {t('bombParty.settings.suggestionsCountDesc', 'Choisissez le nombre de suggestions à afficher')}
              </p>
            </div>
          )}
          {userPreferences.suggestionsEnabled && userPreferences.suggestionsCount > 0 && (
            <div>
              <label className="block text-slate-200 font-medium mb-3">
                {t('bombParty.settings.suggestionsDifficulty', 'Difficulté des suggestions')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'easy', 'medium', 'hard'] as const).map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => handleDifficultyChange(difficulty)}
                    className={`py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                      userPreferences.suggestionsDifficulty === difficulty
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {difficulty === 'all'
                      ? t('bombParty.settings.difficultyAll', 'Toutes')
                      : difficulty === 'easy'
                      ? t('bombParty.settings.difficultyEasy', 'Faciles')
                      : difficulty === 'medium'
                      ? t('bombParty.settings.difficultyMedium', 'Moyennes')
                      : t('bombParty.settings.difficultyHard', 'Difficiles')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {t('bombParty.settings.suggestionsDifficultyDesc', 'Filtrez les suggestions selon leur difficulté')}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors duration-200 font-medium"
          >
            {t('bombParty.settings.reset', 'Réinitialiser les paramètres')}
          </button>
        </div>
      </div>
    </div>
  );
}
