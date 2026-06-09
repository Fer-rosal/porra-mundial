'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentPhase, submitPredictions } from '@/lib/api';
import MatchCard from '@/components/MatchCard';
import { useState } from 'react';
import type { CurrentPhaseResponse, Match } from '@/lib/types';

export default function PredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const [predictions, setPredictions] = useState<Record<string, [number, number]>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: phase, isLoading } = useQuery<CurrentPhaseResponse>({
    queryKey: ['currentPhase', gameId],
    queryFn: () => getCurrentPhase(gameId),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!phase) throw new Error('Phase not loaded');
      const data = Object.entries(predictions).map(([matchId, [home, away]]) => ({
        match_id: matchId,
        home_goals_predicted: home,
        away_goals_predicted: away,
      }));
      return submitPredictions(gameId, data);
    },
    onSuccess: () => {
      setError(null);
      alert('Predictions submitted!');
      setPredictions({});
    },
    onError: (err: any) => {
      if (err.status === 403) {
        setError('Phase is locked. Wait for next phase.');
      } else {
        setError(err.error || 'Failed to submit predictions');
      }
    },
  });

  if (isLoading) return <div className="text-gray-600">Loading phase...</div>;
  if (!phase) return <div className="text-red-600">Phase not found</div>;

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: [home, away],
    }));
  };

  return (
    <div className="space-y-8" data-testid="predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Make Your Predictions</h1>
        <p className="mt-2 text-gray-600">
          {phase.is_locked
            ? 'This phase is locked. You cannot submit predictions.'
            : phase.is_open
            ? 'Phase is open. Submit your predictions before it closes.'
            : 'Waiting for phase to open...'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="predictions-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {phase?.matches?.map((match: Match) => (
          <MatchCard
            key={match.id}
            match={match}
            editable={phase.is_open && !phase.is_locked}
            onScoreChange={(home, away) => handleScoreChange(match.id, home, away)}
            homeGoalsPredicted={predictions[match.id]?.[0]}
            awayGoalsPredicted={predictions[match.id]?.[1]}
          />
        ))}
      </div>

      {phase.is_open && !phase.is_locked && (
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || Object.keys(predictions).length === 0}
          className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          data-testid="predictions-submit-btn"
        >
          {submitMutation.isPending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {submitMutation.isPending ? 'Submitting...' : 'Submit Predictions'}
        </button>
      )}
    </div>
  );
}
