'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore, persistSessionId } from '@/lib/game-store';
import { useState, useEffect } from 'react';

export function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { joinGame } = useGameStore();
  const [inviteCode, setInviteCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Pre-fill code from URL query param
  useEffect(() => {
    const code = searchParams?.get('code');
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = inviteCode.trim().toUpperCase();
    const trimmedName = playerName.trim();

    if (!trimmedCode) {
      setError('Invite code is required');
      return;
    }
    if (!trimmedName) {
      setError('Player name is required');
      return;
    }
    if (trimmedName.length > 50) {
      setError('Player name must be 50 characters or fewer');
      return;
    }

    setIsJoining(true);
    try {
      const result = joinGame(trimmedCode, trimmedName);

      if ('error' in result) {
        setError(result.error);
        setIsJoining(false);
        return;
      }

      // Persist the session for this game on this device
      persistSessionId(result.game.id, result.sessionId);

      router.push(`/games/${result.game.id}`);
    } catch {
      setError('Failed to join game. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="join-page">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Join a Game</h1>
          <p className="mt-2 text-gray-600">Enter the invite code from your friend</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="join-form">
          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="join-error">
              {error}
            </div>
          )}

          {/* Invite code input */}
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-900">
              Invite Code *
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC1234"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-lg font-mono tracking-widest text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              data-testid="join-code-input"
              maxLength={7}
            />
          </div>

          {/* Player name input */}
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-900">
              Your Name *
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g., Alex"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              data-testid="join-name-input"
              maxLength={50}
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isJoining}
              className="flex-1 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="join-submit-btn"
            >
              {isJoining && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50"
              data-testid="join-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
