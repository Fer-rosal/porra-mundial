'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentPhase, selectScorer } from '@/lib/api';
import { useState } from 'react';

export default function ScorerPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: phase, isLoading } = useQuery({
    queryKey: ['currentPhase', gameId],
    queryFn: () => getCurrentPhase(gameId),
    enabled: !!user,
  });

  const selectMutation = useMutation({
    mutationFn: () => selectScorer(gameId, phase!.phase_key, playerName),
    onSuccess: () => {
      setError(null);
      setPlayerName('');
      alert('Scorer selected!');
    },
    onError: (err: any) => {
      if (err.status === 403) {
        setError('Phase is locked.');
      } else {
        setError(err.error || 'Failed to select scorer');
      }
    },
  });

  if (isLoading) return <div className="text-gray-600">Loading...</div>;
  if (!phase) return <div className="text-red-600">Phase not found</div>;

  return (
    <div className="space-y-8 max-w-2xl" data-testid="scorer-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Select a Goalscorer</h1>
        <p className="mt-2 text-gray-600">Pick one player who will score in this phase</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-error">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          selectMutation.mutate();
        }}
        className="space-y-4"
        data-testid="scorer-form"
      >
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-900">
            Player Name *
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Mbappé, Haaland"
            disabled={!phase.is_open || phase.is_locked}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
            data-testid="scorer-name-input"
          />
        </div>

        <button
          type="submit"
          disabled={selectMutation.isPending || !phase.is_open || phase.is_locked}
          className="w-full rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="scorer-submit-btn"
        >
          {selectMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {selectMutation.isPending ? 'Selecting...' : 'Confirm Selection'}
        </button>
      </form>
    </div>
  );
}
