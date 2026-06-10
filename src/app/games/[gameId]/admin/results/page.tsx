'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState } from 'react';
import MatchCard from '@/components/MatchCard';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];

export default function ResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, saveResults } = useGameStore();
  const [results, setResults] = useState<Record<string, [number, number]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game || !mySession || mySession.sessionId !== game.creatorSessionId) {
    return (
      <div className="text-red-600" data-testid="results-access-denied">
        Access denied. Only the game creator can enter results.
      </div>
    );
  }

  const matchesForPhase = game.matches.filter((m) => m.phaseKey === selectedPhase);

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setResults((prev) => ({
      ...prev,
      [matchId]: [home, away],
    }));
  };

  const handleSubmit = () => {
    setError(null);
    if (Object.keys(results).length === 0) {
      setError('No results entered. Please fill in at least one score.');
      return;
    }
    try {
      const formattedResults = Object.entries(results).map(([matchId, [home, away]]) => ({
        matchId,
        homeGoals: home,
        awayGoals: away,
      }));
      saveResults(gameId, selectedPhase, formattedResults);
      setSaved(true);
      setResults({});
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save results');
    }
  };

  return (
    <div className="space-y-8" data-testid="results-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enter Match Results</h1>
        <p className="mt-2 text-gray-600">Input final scores for all matches in this phase</p>
      </div>

      {/* Phase selector */}
      <div className="flex flex-wrap gap-2">
        {PHASE_OPTIONS.map((phase) => (
          <button
            key={phase}
            onClick={() => { setSelectedPhase(phase); setResults({}); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPhase === phase
                ? 'bg-orange-500 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            data-testid={`results-phase-${phase}`}
          >
            {phase}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="results-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="results-saved">
          Results saved successfully!
        </div>
      )}

      <div className="space-y-4">
        {matchesForPhase.map((match) => {
          const pending = results[match.id];
          return (
            <MatchCard
              key={match.id}
              match={{
                id: match.id,
                match_number: match.matchNumber,
                home_team: match.homeTeam,
                away_team: match.awayTeam,
                scheduled_at: match.scheduledAt,
                result_entered: match.resultEntered,
                home_goals: match.homeGoals ?? undefined,
                away_goals: match.awayGoals ?? undefined,
              }}
              editable={true}
              onScoreChange={(home, away) => handleScoreChange(match.id, home, away)}
              homeGoalsPredicted={pending?.[0] ?? match.homeGoals ?? undefined}
              awayGoalsPredicted={pending?.[1] ?? match.awayGoals ?? undefined}
            />
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={Object.keys(results).length === 0}
        className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
        data-testid="results-submit-btn"
      >
        Save Results
      </button>
    </div>
  );
}
