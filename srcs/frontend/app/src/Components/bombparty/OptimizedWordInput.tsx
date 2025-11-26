import React, { memo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { bombPartyService } from '../../services/bombPartyService';
import { logger } from '../../utils/logger';

interface OptimizedWordInputProps {
  className?: string;
}

const OptimizedWordInput: React.FC<OptimizedWordInputProps> = memo(({ className }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submittedWord, setSubmittedWord] = useState<string | null>(null);
  const submitTimeoutRef = useRef<number | null>(null);
  const submitStateRef = useRef<{ isSubmitting: boolean; submitStatus: 'idle' | 'submitting' | 'success' | 'error'; submittedWord: string | null }>({
    isSubmitting: false,
    submitStatus: 'idle',
    submittedWord: null
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  const gameState = useBombPartyStore(state => state.gameState);
  const canSubmitWord = useBombPartyStore(state => state.canSubmitWord);
  const wordJustSubmitted = useBombPartyStore(state => state.ui.wordJustSubmitted);
  const setWordJustSubmitted = useBombPartyStore(state => state.setWordJustSubmitted);
  const lastError = useBombPartyStore(state => state.connection.lastError);
  const setLastError = useBombPartyStore(state => state.setLastError);
  const playerId = useBombPartyStore(state => state.connection.playerId);
  const roomId = useBombPartyStore(state => state.connection.roomId);
  const applyOptimisticWordSubmit = useBombPartyStore(state => state.applyOptimisticWordSubmit);
  const revertOptimisticWordSubmit = useBombPartyStore(state => state.revertOptimisticWordSubmit);
  
  useEffect(() => {
    const handleInputReceived = (event: CustomEvent) => {
      const { word } = event.detail;
      if (word === submittedWord && submitStatus === 'submitting') {
        logger.debug('Server confirmed receipt of word', { word });
      }
    };
    
    window.addEventListener('bp:game:input:received' as any, handleInputReceived as EventListener);
    return () => {
      window.removeEventListener('bp:game:input:received' as any, handleInputReceived as EventListener);
    };
  }, [submittedWord, submitStatus]);

  const currentSyllable = gameState?.currentSyllable || '';
  const isActive = gameState?.phase === 'TURN_ACTIVE';
  const canSubmit = canSubmitWord() && !isSubmitting;

  useEffect(() => {
    const canSubmitResult = canSubmitWord();
    logger.debug('OptimizedWordInput - canSubmit check', {
      canSubmitResult,
      isSubmitting,
      phase: gameState?.phase,
      currentPlayerId: gameState?.currentPlayerId,
      playerId,
      wordJustSubmitted
    });
  }, [gameState?.phase, gameState?.currentPlayerId, playerId, isSubmitting, wordJustSubmitted]);

  useEffect(() => {
    if (isActive && canSubmit) {
      inputRef.current?.focus();
      startTimeRef.current = performance.now();
    }
  }, [isActive, canSubmit]);

  useEffect(() => {
    if (lastError && isSubmitting && submittedWord) {
      logger.warn('OptimizedWordInput - Error from backend', { lastError, submittedWord });
      
      revertOptimisticWordSubmit(submittedWord);
      
      setLocalError(lastError);
      setIsSubmitting(false);
      setSubmitStatus('error');
      setWordJustSubmitted(false);
      submitStateRef.current = {
        isSubmitting: false,
        submitStatus: 'error',
        submittedWord: null
      };
      
      const timer = setTimeout(() => {
        setLocalError(null);
        setLastError(null);
        setSubmitStatus('idle');
        setSubmittedWord(null);
        submitStateRef.current.submitStatus = 'idle';
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [lastError, isSubmitting, submittedWord, revertOptimisticWordSubmit, setLastError]);

  useEffect(() => {
    if (submittedWord && isSubmitting && submitStatus === 'submitting') {
      const currentPlayerChanged = gameState?.currentPlayerId && 
        gameState.currentPlayerId !== playerId &&
        gameState.phase === 'TURN_ACTIVE';
      
      const wordConfirmed = gameState?.usedWords?.includes(submittedWord.toLowerCase());
      
      if (currentPlayerChanged || (wordConfirmed && gameState?.phase !== 'TURN_ACTIVE' && gameState?.currentPlayerId !== playerId)) {
        setSubmitStatus('success');
        submitStateRef.current.submitStatus = 'success';
        
        const timer = setTimeout(() => {
          setInputValue('');
          setIsSubmitting(false);
          setSubmitStatus('idle');
          setSubmittedWord(null);
          setWordJustSubmitted(false);
          submitStateRef.current = {
            isSubmitting: false,
            submitStatus: 'idle',
            submittedWord: null
          };
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.currentPlayerId, gameState?.phase, gameState?.usedWords, submittedWord, isSubmitting, submitStatus, playerId]);
  
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit || !inputValue.trim() || isSubmitting) {
      logger.warn('OptimizedWordInput - Cannot submit', {
        canSubmit,
        inputValue: inputValue.trim(),
        isSubmitting,
        gamePhase: gameState?.phase,
        isMyTurn: gameState?.currentPlayerId === playerId
      });
      return;
    }

    if (!roomId) {
      logger.error('OptimizedWordInput - No roomId');
      setLocalError('Erreur: Pas de room');
      return;
    }

    const word = inputValue.trim().toLowerCase();
    const msTaken = performance.now() - startTimeRef.current;

    logger.info('OptimizedWordInput - Submitting word', {
      word,
      msTaken,
      roomId,
      playerId,
      currentPlayerId: gameState?.currentPlayerId
    });

    const submitStartTime = performance.now();
    
    setIsSubmitting(true);
    setSubmitStatus('submitting');
    setLocalError(null);
    setSubmittedWord(word);
    
    submitStateRef.current = {
      isSubmitting: true,
      submitStatus: 'submitting',
      submittedWord: word
    };
    
    applyOptimisticWordSubmit(word);
    setWordJustSubmitted(true);
    
    const optimisticUpdateTime = performance.now() - submitStartTime;
    logger.debug('Optimistic update applied', { word, timeMs: optimisticUpdateTime });

    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    
    submitTimeoutRef.current = window.setTimeout(() => {
      const currentState = submitStateRef.current;
      
      if (currentState.isSubmitting && currentState.submitStatus === 'submitting' && currentState.submittedWord === word) {
        logger.warn('OptimizedWordInput - Submission timeout', { word });
        revertOptimisticWordSubmit(word);
        setLocalError('La soumission prend trop de temps. Veuillez réessayer.');
        setIsSubmitting(false);
        setSubmitStatus('error');
        setWordJustSubmitted(false);
        submitStateRef.current = {
          isSubmitting: false,
          submitStatus: 'error',
          submittedWord: null
        };
        
        setTimeout(() => {
          setSubmitStatus('idle');
          setSubmittedWord(null);
          submitStateRef.current.submitStatus = 'idle';
        }, 3000);
      }
    }, 5000);

    try {
      bombPartyService.submitWord(word, msTaken);
      
      setSubmitStatus('success');
      submitStateRef.current.submitStatus = 'success';
      
      logger.debug('OptimizedWordInput - Word sent to server', { word });
    } catch (error) {
      logger.error('OptimizedWordInput - Error submitting word', error);
      
      revertOptimisticWordSubmit(word);
      setLocalError('Erreur lors de l\'envoi du mot');
      setIsSubmitting(false);
      setSubmitStatus('error');
      setWordJustSubmitted(false);
      submitStateRef.current = {
        isSubmitting: false,
        submitStatus: 'error',
        submittedWord: null
      };
      
      setTimeout(() => {
        setSubmitStatus('idle');
        setSubmittedWord(null);
        submitStateRef.current.submitStatus = 'idle';
      }, 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const getInputPlaceholder = (): string => {
    if (!isActive) return 'Game not active';
    if (!canSubmit || isSubmitting) return 'Not your turn';
    if (submitStatus === 'submitting') return 'Envoi en cours...';
    if (submitStatus === 'success') return 'Mot soumis avec succès!';
    if (wordJustSubmitted) return 'Word submitted!';
    return `Word containing "${currentSyllable}"`;
  };

  const getInputClassName = (): string => {
    let baseClass = 'w-full px-4 py-2 text-lg border rounded-lg focus:outline-none focus:ring-2 transition-all';
    
    if (!canSubmit || isSubmitting) {
      baseClass += ' bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed';
    } else if (submitStatus === 'success' || wordJustSubmitted) {
      baseClass += ' bg-green-100 border-green-300 text-green-700';
    } else if (submitStatus === 'error') {
      baseClass += ' bg-red-100 border-red-300 text-red-700';
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
            {currentSyllable}
          </div>
          <div className="text-sm text-gray-600">
            {isActive ? t('bombParty.input.enterWordContaining') : t('bombParty.input.waitingForGame')}
          </div>
        </div>
        
        {(localError || lastError) && !wordJustSubmitted && (
          <div className="p-3 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm">
            {localError || lastError}
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={getInputPlaceholder()}
          disabled={!canSubmit || isSubmitting}
          className={getInputClassName()}
          autoComplete="off"
          spellCheck="false"
        />
        
        <button
          type="submit"
          disabled={!canSubmit || !inputValue.trim() || isSubmitting}
          className={`
            w-full py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
            ${canSubmit && inputValue.trim() && !isSubmitting
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting && submitStatus === 'submitting' && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting && submitStatus === 'submitting' && 'Envoi...'}
          {isSubmitting && submitStatus === 'success' && '✓ Envoyé!'}
          {!isSubmitting && 'Soumettre'}
        </button>
      </form>
      
      {submitStatus === 'submitting' && (
        <div className="mt-2 text-center text-blue-600 text-sm flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Envoi en cours...
        </div>
      )}
      
      {submitStatus === 'success' && !localError && !lastError && (
        <div className="mt-2 text-center text-green-600 text-sm flex items-center justify-center gap-2">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Mot soumis avec succès!
        </div>
      )}
    </div>
  );
});

OptimizedWordInput.displayName = 'OptimizedWordInput';

export default OptimizedWordInput;
