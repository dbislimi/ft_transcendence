import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getWordSuggestions } from '../data/validator';
import type { PlayerBonuses, BonusKey } from '../core/types';

interface WordInputProps {
  trigram: string;
  usedWords: string[];
  onSubmit: (word: string) => void;
  isActive: boolean;
  engine?: any; // Ajout de l'engine pour accéder aux nouvelles méthodes
  bonuses?: PlayerBonuses;
  onActivateBonus?: (bonus: BonusKey) => boolean;
  hasDoubleChance?: boolean;
}

export default function WordInput({ trigram, usedWords, onSubmit, isActive, engine, bonuses, onActivateBonus, hasDoubleChance }: WordInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trigramInfo, setTrigramInfo] = useState<{ availableWords: number; totalWords: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cooldown, setCooldown] = useState(false);
  const [processingKey, setProcessingKey] = useState<BonusKey | null>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Charger les suggestions et informations du trigramme quand il change
  useEffect(() => {
    if (trigram && trigram.length >= 3) {
      // Utiliser l'engine si disponible, sinon fallback sur l'ancienne méthode
      if (engine && engine.getWordSuggestions) {
        const newSuggestions = engine.getWordSuggestions(5);
        const info = engine.getCurrentTrigramInfo();
        setSuggestions(newSuggestions);
        setTrigramInfo(info);
      } else {
        const newSuggestions = getWordSuggestions(trigram, 5);
        setSuggestions(newSuggestions);
        setTrigramInfo(null);
      }
    }
  }, [trigram, engine]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    const trimmedWord = word.trim();
    
    // Validation basique
    if (trimmedWord.length < 3) {
      setError(t('bombParty.input.errors.tooShort'));
      return;
    }

    if (!trimmedWord.toLowerCase().includes(trigram.toLowerCase())) {
      setError(t('bombParty.input.errors.noTrigram', { trigram }));
      return;
    }

    if (usedWords.includes(trimmedWord.toLowerCase())) {
      setError(t('bombParty.input.errors.duplicate'));
      return;
    }

    // Mot valide
    setError(null);
    onSubmit(trimmedWord);
    setWord('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
    setTimeout(() => setProcessingKey(null), 200);
  };

  const BonusBar = () => {
    const items: Array<{ key: BonusKey; icon: string; nameKey: string; descKey: string }> = [
      { key: 'inversion', icon: '🔁', nameKey: 'bombParty.bonus.inversion.name', descKey: 'bombParty.bonus.inversion.desc' },
      { key: 'plus5sec', icon: '➕', nameKey: 'bombParty.bonus.plus5sec.name', descKey: 'bombParty.bonus.plus5sec.desc' },
      { key: 'vitesseEclair', icon: '⚡', nameKey: 'bombParty.bonus.vitesseEclair.name', descKey: 'bombParty.bonus.vitesseEclair.desc' },
      { key: 'doubleChance', icon: '♢', nameKey: 'bombParty.bonus.doubleChance.name', descKey: 'bombParty.bonus.doubleChance.desc' },
      { key: 'extraLife', icon: '❤️', nameKey: 'bombParty.bonus.extraLife.name', descKey: 'bombParty.bonus.extraLife.desc' },
    ];
    return (
      <div className="flex gap-2 items-center justify-end">
        {items.map((it) => {
          const count = (bonuses as any)?.[it.key] ?? 0;
          const disabled = cooldown || count <= 0 || !isActive;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => tryActivate(it.key)}
              disabled={disabled}
              title={`${t(it.nameKey)} — ${t(it.descKey)}`}
              className={`relative w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition disabled:opacity-40 ${processingKey === it.key ? 'animate-pulse' : ''} ${disabled ? 'border-slate-600 text-slate-400' : 'border-cyan-500/50 hover:border-cyan-400'}`}
            >
              <span>{it.icon}</span>
              <span className="absolute -top-1 -right-1 text-[10px] bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="w-full max-w-md px-6">
      <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-500/30 p-6 shadow-2xl">
        {/* Instructions */}
        <div className="text-center mb-4">
          <p className="text-slate-300 text-sm mb-2">
            {t('bombParty.input.instruction')}
          </p>
          <p className="text-cyan-400 font-mono text-lg">
            "{trigram.toUpperCase()}"
          </p>
          {/* Informations du trigramme */}
          {trigramInfo && (
            <div className="mt-2 text-xs text-slate-400">
              {trigramInfo.availableWords} mots disponibles sur {trigramInfo.totalWords}
            </div>
          )}
        </div>

        {/* Formulaire */}
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
              placeholder={t('bombParty.input.placeholder')}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
              disabled={!isActive}
            />
          </div>

          {/* Bonus bar */}
          <div className="flex justify-between items-center">
            <div className="text-slate-400 text-xs">
              {hasDoubleChance ? '♢ ' + t('bombParty.bonus.doubleChance.name') : null}
            </div>
            <BonusBar />
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={!word.trim() || !isActive}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('bombParty.input.submit')}
          </button>
        </form>

        {/* Affichage des erreurs */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Suggestions retirées de l'input central pour éviter le double affichage */}

        {/* Mots récents */}
        {usedWords.length > 0 && (
          <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
            <h4 className="text-slate-300 text-sm font-medium mb-2">
              {t('bombParty.input.recentWords')}
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
  );
}
