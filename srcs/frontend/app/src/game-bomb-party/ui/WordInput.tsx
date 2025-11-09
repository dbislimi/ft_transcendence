import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getWordSuggestions } from '../data/validator';
import type { PlayerBonuses, BonusKey } from '../core/types';

interface WordInputProps {
  syllable: string;
  usedWords: string[];
  onSubmit: (word: string) => void;
  isActive: boolean;
  engine?: any;
  bonuses?: PlayerBonuses;
  onActivateBonus?: (bonus: BonusKey) => boolean;
  hasDoubleChance?: boolean;
}

export default function WordInput({ syllable, usedWords, onSubmit, isActive, engine, bonuses, onActivateBonus, hasDoubleChance }: WordInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [syllableInfo, setSyllableInfo] = useState<{ availableWords: number; totalWords: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cooldown, setCooldown] = useState(false);
  const [processingKey, setProcessingKey] = useState<BonusKey | null>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (syllable && syllable.length >= 2) {
      if (engine && engine.getWordSuggestions) {
        const newSuggestions = engine.getWordSuggestions(5);
        const info = engine.getCurrentSyllableInfo();
        setSuggestions(newSuggestions);
        setSyllableInfo(info);
      } else {
        const newSuggestions = getWordSuggestions(syllable, 5);
        setSuggestions(newSuggestions);
        setSyllableInfo(null);
      }
    }
  }, [syllable, engine]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    const trimmedWord = word.trim();
    
    if (trimmedWord.length < 3) {
      setError(t('bombParty.input.errors.tooShort'));
      return;
    }

    if (syllable && !trimmedWord.toLowerCase().includes(syllable.toLowerCase())) {
      setError(t('bombParty.input.errors.noTrigram', { trigram: syllable }));
      return;
    }

    if (usedWords.includes(trimmedWord.toLowerCase())) {
      setError(t('bombParty.input.errors.duplicate'));
      return;
    }

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
    setTimeout(() => setProcessingKey(null), 600);
  };

  const bonusStyles: Record<BonusKey, { gradient: string; glow: string; hover: string }> = {
    inversion: { 
      gradient: 'from-purple-500/20 to-indigo-500/20', 
      glow: 'shadow-purple-500/50',
      hover: 'hover:from-purple-500/30 hover:to-indigo-500/30 hover:shadow-purple-500/70'
    },
    plus5sec: { 
      gradient: 'from-green-500/20 to-emerald-500/20', 
      glow: 'shadow-green-500/50',
      hover: 'hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-green-500/70'
    },
    vitesseEclair: { 
      gradient: 'from-yellow-500/20 to-orange-500/20', 
      glow: 'shadow-yellow-500/50',
      hover: 'hover:from-yellow-500/30 hover:to-orange-500/30 hover:shadow-yellow-500/70'
    },
    doubleChance: { 
      gradient: 'from-blue-500/20 to-cyan-500/20', 
      glow: 'shadow-blue-500/50',
      hover: 'hover:from-blue-500/30 hover:to-cyan-500/30 hover:shadow-blue-500/70'
    },
    extraLife: { 
      gradient: 'from-pink-500/20 to-rose-500/20', 
      glow: 'shadow-pink-500/50',
      hover: 'hover:from-pink-500/30 hover:to-rose-500/30 hover:shadow-pink-500/70'
    },
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
          const styles = bonusStyles[it.key];
          const isProcessing = processingKey === it.key;
          
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => tryActivate(it.key)}
              disabled={disabled}
              title={`${t(it.nameKey)} — ${t(it.descKey)}`}
              className={`relative w-12 h-12 rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 transform ${
                disabled 
                  ? 'border-slate-600 text-slate-400 opacity-40 cursor-not-allowed' 
                  : `border-cyan-400/50 bg-gradient-to-br ${styles.gradient} ${styles.hover} ${styles.glow} cursor-pointer hover:scale-110 active:scale-95`
              } ${
                isProcessing ? 'animate-bonus-activate scale-125' : ''
              }`}
            >
              {/* Effet de lueur au hover */}
              {!disabled && (
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${styles.gradient} opacity-0 hover:opacity-100 transition-opacity duration-300 blur-sm -z-10`}></div>
              )}
              
              {/* Icône avec animation */}
              <span className={`relative z-10 transform transition-transform duration-300 ${
                isProcessing ? 'animate-spin-bonus' : ''
              }`}>
                {it.icon}
              </span>
              
              {/* Badge de compteur */}
              {count > 0 && (
                <span className={`absolute -top-1 -right-1 text-[10px] font-bold bg-gradient-to-br ${styles.gradient} text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white/30 shadow-lg transform transition-all duration-300 ${
                  !disabled ? 'hover:scale-125' : ''
                }`}>
                  {count}
                </span>
              )}
              
              {/* Effet de particules lors de l'activation */}
              {isProcessing && (
                <>
                  <div className={`absolute inset-0 rounded-xl ${styles.glow} animate-ping`}></div>
                  <div className={`absolute inset-0 rounded-xl ${styles.glow} animate-ping`} style={{ animationDelay: '150ms' }}></div>
                </>
              )}
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
            "{(syllable || '...').toUpperCase()}"
          </p>
          {/* Informations de la syllabe */}
          {syllableInfo && (
            <div className="mt-2 text-xs text-slate-400">
              {syllableInfo.availableWords} mots disponibles sur {syllableInfo.totalWords}
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
            <div className={`text-sm font-medium transition-all duration-300 ${
              hasDoubleChance 
                ? 'text-blue-400 animate-pulse flex items-center gap-2' 
                : 'text-slate-400'
            }`}>
              {hasDoubleChance && (
                <>
                  <span className="text-lg animate-spin-slow">♢</span>
                  <span>{t('bombParty.bonus.doubleChance.name')}</span>
                </>
              )}
            </div>
            <BonusBar />
          </div>
          
          <style>{`
            @keyframes spin-bonus {
              0% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(180deg) scale(1.2); }
              100% { transform: rotate(360deg) scale(1); }
            }
            @keyframes bonus-activate {
              0%, 100% { transform: scale(1); }
              25% { transform: scale(1.3) rotate(5deg); }
              50% { transform: scale(1.2) rotate(-5deg); }
              75% { transform: scale(1.25) rotate(3deg); }
            }
            .animate-spin-bonus {
              animation: spin-bonus 0.6s ease-in-out;
            }
            .animate-bonus-activate {
              animation: bonus-activate 0.6s ease-out;
            }
            .animate-spin-slow {
              animation: spin 3s linear infinite;
            }
          `}</style>

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
