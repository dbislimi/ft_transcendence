import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameSettingsModal({ isOpen, onClose }: GameSettingsModalProps) {
  const { t } = useTranslation();
  const { settings, updateGameSettings } = useSettings();

  if (!isOpen) return null;

  const handleSoundsEnabledChange = (enabled: boolean) => {
    updateGameSettings({
      preferences: {
        ...settings.game.preferences,
        soundsEnabled: enabled,
      },
    });
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    updateGameSettings({
      preferences: {
        ...settings.game.preferences,
        reducedMotion: enabled,
      },
    });
  };

  const handleShowFPSChange = (enabled: boolean) => {
    updateGameSettings({
      preferences: {
        ...settings.game.preferences,
        showFPS: enabled,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {t('settings.game.title') || 'Reglages de jeu'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label={t('settings.close') || 'Fermer'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="settings-section rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-white">
                    {t('settings.game.soundsEnabled') || 'Sons actives'}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {t('settings.game.soundsEnabledDesc') || 'Activer les effets sonores du jeu'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.game.preferences.soundsEnabled}
                    onChange={(e) => handleSoundsEnabledChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="settings-section rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-white">
                    {t('settings.game.reducedMotion') || 'Reduire les animations'}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {t('settings.game.reducedMotionDesc') || 'Reduire les animations pour ameliorer les performances'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.game.preferences.reducedMotion}
                    onChange={(e) => handleReducedMotionChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="settings-section rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-white">
                    {t('settings.game.showFPS') || 'Afficher FPS'}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {t('settings.game.showFPSDesc') || 'Afficher le nombre d\'images par seconde'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.game.preferences.showFPS}
                    onChange={(e) => handleShowFPSChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-600/30">
          <div className="text-sm text-gray-400">
            {t('settings.game.autoSave') || 'Les modifications sont sauvegardees automatiquement'}
          </div>
          <button
            onClick={onClose}
            className="action-btn-aesthetic"
          >
            <span className="btn-text-aesthetic">{t('settings.game.close') || 'Fermer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

