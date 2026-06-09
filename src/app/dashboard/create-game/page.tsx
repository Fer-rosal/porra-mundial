'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { createGame } from '@/lib/api';
import { useState } from 'react';

export default function CreateGamePage() {
  const { user, isLoading: authLoading } = useUser();
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (name: string) => createGame(name),
    onSuccess: (game) => {
      router.push(`/games/${game.id}`);
    },
    onError: (err: any) => {
      setError(err.error || 'Failed to create game');
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Please log in to create a game</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!gameName.trim()) {
      setError('Game name is required');
      return;
    }
    createMutation.mutate(gameName);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="create-game-page">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Game</h1>
          <p className="mt-2 text-gray-600">Start a new World Cup 2026 betting tournament</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-game-form">
          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="create-game-error">
              {error}
            </div>
          )}

          {/* Game name input */}
          <div>
            <label htmlFor="gameName" className="block text-sm font-medium text-gray-900">
              Game Name *
            </label>
            <input
              id="gameName"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g., Office World Cup 2026"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              data-testid="create-game-name-input"
              maxLength={100}
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="create-game-submit-btn"
            >
              {createMutation.isPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {createMutation.isPending ? 'Creating...' : 'Create Game'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50"
              data-testid="create-game-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
