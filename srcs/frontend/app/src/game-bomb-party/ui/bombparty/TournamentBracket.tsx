import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TournamentMatchCard from './TournamentMatchCard';
import type { TournamentBracket as TournamentBracketType } from '../../../store/useBombPartyStore';

interface TournamentBracketProps {
  bracket: TournamentBracketType;
  currentRound: number | null;
  onJoinMatch?: (roomId: string) => void;
  currentPlayerId?: string | null;
  onToggleReady?: (matchId: string, ready: boolean) => void;
}

export default function TournamentBracket({
  bracket,
  currentRound,
  onJoinMatch,
  currentPlayerId,
  onToggleReady
}: TournamentBracketProps) {
  const { t } = useTranslation();

  console.log('[TournamentBracket] Rendering with:', {
    bracket,
    matchCount: bracket.matches?.length,
    rounds: bracket.rounds,
    currentRound
  });

  // Organiser les matchs par round
  const matchesByRound = useMemo(() => {
    const rounds: { [round: number]: typeof bracket.matches } = {};
    if (!bracket.matches || bracket.matches.length === 0) {
      console.warn('[TournamentBracket] No matches in bracket');
      return rounds;
    }
    bracket.matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });
    console.log('[TournamentBracket] Matches by round:', rounds);
    return rounds;
  }, [bracket.matches]);

  const rounds = Array.from({ length: bracket.rounds }, (_, i) => i + 1);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max px-4">
        {rounds.map((roundNum) => {
          const roundMatches = matchesByRound[roundNum] || [];
          const isCurrentRound = currentRound === roundNum;

          return (
            <div key={roundNum} className="flex flex-col gap-4 min-w-[280px]">
              <div className="text-center mb-2">
                <h3 className={`text-lg font-bold ${
                  isCurrentRound 
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400' 
                    : 'text-slate-400'
                }`}>
                  {roundNum === bracket.rounds 
                    ? t('bombParty.tournament.bracket.final', 'Finale')
                    : t('bombParty.tournament.bracket.round', 'Tour {round}', { round: roundNum })}
                </h3>
              </div>

              <div className="space-y-4">
                {roundMatches.length > 0 ? (
                  roundMatches.map((match) => (
                    <TournamentMatchCard
                      key={match.id}
                      match={match}
                      isCurrentRound={isCurrentRound}
                      onJoinMatch={onJoinMatch}
                      currentPlayerId={currentPlayerId}
                      onToggleReady={onToggleReady}
                    />
                  ))
                ) : (
                  <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/20 text-center">
                    <span className="text-xs text-slate-500 italic">
                      {t('bombParty.tournament.bracket.noMatchesInRound', 'Aucun match dans ce tour')}
                    </span>
                  </div>
                )}
              </div>

              {/* Lignes de connexion vers le round suivant */}
              {roundNum < bracket.rounds && (
                <div className="flex items-center justify-center mt-4">
                  <div className="w-px h-8 bg-slate-600"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(!bracket.matches || bracket.matches.length === 0) && (
        <div className="text-center py-12 text-slate-400">
          <p>{t('bombParty.tournament.bracket.noMatches', 'Aucun match disponible')}</p>
        </div>
      )}
    </div>
  );
}
