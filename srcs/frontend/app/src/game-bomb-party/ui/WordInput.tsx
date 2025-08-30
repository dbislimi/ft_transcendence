import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getWordSuggestions } from '../data/validator';

interface WordInputProps {
  trigram: string;
  usedWords: string[];
  onSubmit: (word: string) => void;
  isActive: boolean;
  engine?: any; // Ajout de l'engine pour accéder aux nouvelles méthodes
}

export default function WordInput({ trigram, usedWords, onSubmit, isActive, engine }: WordInputProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trigramInfo, setTrigramInfo] = useState<{ availableWords: number; totalWords: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (!isActive) {
    return null;
  }

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6">
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

        {/* Suggestions de mots améliorées */}
        {suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
            <h4 className="text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
              💡 Suggestions pour "{trigram.toUpperCase()}"
              <span className="text-xs text-slate-400">({suggestions.length})</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setWord(suggestion);
                    setError(null);
                  }}
                  className="px-2 py-1 bg-cyan-600/50 hover:bg-cyan-500/70 text-cyan-200 text-xs rounded transition-colors cursor-pointer hover:scale-105 transform"
                  title={`Cliquer pour utiliser "${suggestion}"`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

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
