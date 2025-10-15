import React, { memo, useState, useEffect, useRef } from 'react';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { bombPartyService } from '../../services/bombPartyService';

interface OptimizedWordInputProps {
  className?: string;
}

const OptimizedWordInput: React.FC<OptimizedWordInputProps> = memo(({ className }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  const gameState = useBombPartyStore(state => state.gameState);
  const canSubmitWord = useBombPartyStore(state => state.canSubmitWord);
  const wordJustSubmitted = useBombPartyStore(state => state.ui.wordJustSubmitted);
  const setWordJustSubmitted = useBombPartyStore(state => state.setWordJustSubmitted);

  const currentTrigram = gameState?.currentTrigram || '';
  const isActive = gameState?.phase === 'TURN_ACTIVE';
  const canSubmit = canSubmitWord() && !isSubmitting;

  useEffect(() => {
    if (isActive && canSubmit) {
      inputRef.current?.focus();
      startTimeRef.current = performance.now();
    }
  }, [isActive, canSubmit]);

  useEffect(() => {
    if (wordJustSubmitted) {
      setInputValue('');
      setIsSubmitting(false);
      const timer = setTimeout(() => {
        setWordJustSubmitted(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [wordJustSubmitted, setWordJustSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit || !inputValue.trim()) return;

    const word = inputValue.trim().toLowerCase();
    const msTaken = performance.now() - startTimeRef.current;

    setIsSubmitting(true);
    setWordJustSubmitted(true);

    try {
      bombPartyService.submitWord(word, msTaken);
    } catch (error) {
      console.error('Error submitting word:', error);
      setIsSubmitting(false);
      setWordJustSubmitted(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const getInputPlaceholder = (): string => {
    if (!isActive) return 'Game not active';
    if (!canSubmit) return 'Not your turn';
    if (wordJustSubmitted) return 'Word submitted!';
    return `Word containing "${currentTrigram}"`;
  };

  const getInputClassName = (): string => {
    let baseClass = 'w-full px-4 py-2 text-lg border rounded-lg focus:outline-none focus:ring-2 transition-all';
    
    if (!canSubmit) {
      baseClass += ' bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed';
    } else if (wordJustSubmitted) {
      baseClass += ' bg-green-100 border-green-300 text-green-700';
    } else {
      baseClass += ' bg-white border-blue-300 focus:ring-blue-500';
    }
    
    return baseClass;
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {currentTrigram}
          </div>
          <div className="text-sm text-gray-600">
            {isActive ? 'Enter a word containing these letters' : 'Waiting for game to start'}
          </div>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={getInputPlaceholder()}
          disabled={!canSubmit}
          className={getInputClassName()}
          autoComplete="off"
          spellCheck="false"
        />
        
        <button
          type="submit"
          disabled={!canSubmit || !inputValue.trim()}
          className={`
            w-full py-2 px-4 rounded-lg font-semibold transition-all
            ${canSubmit && inputValue.trim() 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Word'}
        </button>
      </form>
      
      {wordJustSubmitted && (
        <div className="mt-2 text-center text-green-600 text-sm">
          Word submitted successfully!
        </div>
      )}
    </div>
  );
});

OptimizedWordInput.displayName = 'OptimizedWordInput';

export default OptimizedWordInput;
