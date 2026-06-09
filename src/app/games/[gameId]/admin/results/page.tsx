'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentPhase, submitResults } from '@/lib/api';
import { useState } from 'react';
import MatchCard from '@/components/MatchCard';
import type { CurrentPhaseResponse, Match } from '@/lib/types';

export default function ResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const [results, setResults] = useState<Record<string, [number, number]>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: phase, isLoading } = useQuery<CurrentPhaseResponse>({
    queryKey: ['currentPhase', gameId],
    queryFn: () => getCurrentPhase(gameId),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!phase) throw new Error('Phase not loaded');
      const data = Object.entries(results).map(([matchId, [home, away]]) => ({
        match_id: matchId,
        home_goals: home,
        away_goals: away,
      }));
      return submitResults(gameId, phase.phase_key, data);
    },
    onSuccess: () => {
      alert('Results submitted!');
      setResults({});
      setError(null);
    },
    onError: (err: any) => {
      setError(err.error || 'Failed to submit results');
    },
  });

  if (isLoading) return <div className="text-gray-600">Loading...</div>;
  if (!phase) return <div className="text-red-600">Phase not found</div>;

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setResults((prev) => ({
      ...prev,
      [matchId]: [home, away],
    }));
  };

  return (
    <div className="space-y-8" data-testid="results-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enter Match Results</h1>
        <p className="mt-2 text-gray-600">Input final scores for all matches in this phase</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="results-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {phase?.matches?.map((match: Match) => (
          <MatchCard
            key={match.id}
            match={match}
            editable={true}
            onScoreChange={(home, away) => handleScoreChange(match.id, home, away)}
            homeGoalsPredicted={results[match.id]?.[0]}
            awayGoalsPredicted={results[match.id]?.[1]}
          />
        ))}
      </div>

      <button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || Object.keys(results).length === 0}
        className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
        data-testid="results-submit-btn"
      >
        {submitMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {submitMutation.isPending ? 'Saving...' : 'Save Results'}
      </button>
    </div>
  );
}
