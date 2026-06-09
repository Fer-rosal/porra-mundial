'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentPhase, submitScorerPoints } from '@/lib/api';
import { useState } from 'react';

export default function ScorerPointsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: phase, isLoading } = useQuery({
    queryKey: ['currentPhase', gameId],
    queryFn: () => getCurrentPhase(gameId),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!phase) throw new Error('Phase not loaded');
      const data = Object.entries(goals).map(([playerId, count]) => ({
        game_player_id: playerId,
        goals_count: count,
      }));
      return submitScorerPoints(gameId, phase.phase_key, data);
    },
    onSuccess: () => {
      alert('Scorer points awarded!');
      setGoals({});
      setError(null);
    },
    onError: (err: any) => {
      setError(err.error || 'Failed to award scorer points');
    },
  });

  if (isLoading) return <div className="text-gray-600">Loading...</div>;

  return (
    <div className="space-y-8 max-w-2xl" data-testid="scorer-points-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Award Scorer Points</h1>
        <p className="mt-2 text-gray-600">Enter the number of goals each scorer achieved</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-points-error">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitMutation.mutate();
        }}
        className="space-y-4"
        data-testid="scorer-points-form"
      >
        <p className="text-gray-600">Add scorer entries...</p>

        <button
          type="submit"
          disabled={submitMutation.isPending || Object.keys(goals).length === 0}
          className="w-full rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="scorer-points-submit-btn"
        >
          {submitMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {submitMutation.isPending ? 'Saving...' : 'Save Scorer Points'}
        </button>
      </form>
    </div>
  );
}
