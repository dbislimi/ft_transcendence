import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PlayerNameModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export default function PlayerNameModal({ isOpen, onSubmit }: PlayerNameModalProps) {
  const { t } = useTranslation();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Focus sur l'input quand le modal s'ouvre
      const input = document.getElementById('player-name-input');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = playerName.trim();
    
    if (!trimmedName) {
      setError(t('bombParty.playerName.required', 'Le nom est requis'));
      return;
    }
    
    if (trimmedName.length < 2) {
      setError(t('bombParty.playerName.tooShort', 'Le nom doit contenir au moins 2 caractères'));
      return;
    }
    
    if (trimmedName.length > 20) {
      setError(t('bombParty.playerName.tooLong', 'Le nom ne peut pas dépasser 20 caractères'));
      return;
    }
    
    // verifie les caracteres valides
    if (!/^[a-zA-Z0-9_\-À-ÿ\s]+$/.test(trimmedName)) {
      setError(t('bombParty.playerName.invalidChars', 'Le nom contient des caractères invalides'));
      return;
    }
    
    setError('');
    onSubmit(trimmedName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
            {t('bombParty.playerName.title', 'Bienvenue !')}
          </h2>
          <p className="text-slate-300 text-sm">
            {t('bombParty.playerName.subtitle', 'Choisissez votre nom de joueur')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="player-name-input" className="block text-sm font-medium text-slate-300 mb-2">
              {t('bombParty.playerName.label', 'Nom de joueur')}
            </label>
            <input
              id="player-name-input"
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              placeholder={t('bombParty.playerName.placeholder', 'Entrez votre nom...')}
              className="w-full px-4 py-3 rounded-lg bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              maxLength={20}
              autoComplete="off"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <span>⚠️</span>
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {t('bombParty.playerName.hint', '2-20 caractères, lettres, chiffres, espaces, - et _')}
            </p>
          </div>

          <button
            type="submit"
            disabled={!playerName.trim()}
            className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
              playerName.trim()
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            {t('bombParty.playerName.submit', 'Continuer')}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            {t('bombParty.playerName.notice', 'Ce nom sera visible par les autres joueurs')}
          </p>
        </div>
      </div>
    </div>
  );
}
