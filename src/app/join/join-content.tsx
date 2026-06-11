'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore } from '@/lib/game-store';
import { useState, useEffect } from 'react';
import CopyRecoveryLink from '@/components/CopyRecoveryLink';
import { buildPlayerRecoveryLink } from '@/lib/id-utils';
import Link from 'next/link';

interface JoinSuccess {
  gameId: string;
  playerToken: string;
}

export function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { joinGame } = useGameStore();
  const [inviteCode, setInviteCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<JoinSuccess | null>(null);

  // Pre-fill code from URL query param
  useEffect(() => {
    const code = searchParams?.get('code');
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const result = await joinGame(trimmedCode, trimmedName);

      if ('error' in result) {
        setError(result.error);
        setIsJoining(false);
        return;
      }

      // Show success screen with recovery link before navigating
      setJoinSuccess({ gameId: result.game.id, playerToken: result.playerToken });
      setIsJoining(false);
    } catch {
      setError('Failed to join game. Please try again.');
      setIsJoining(false);
    }
  };

  // Success screen — show recovery link before navigating away
  if (joinSuccess) {
    const recoveryLink =
      typeof window !== 'undefined'
        ? buildPlayerRecoveryLink(window.location.origin, joinSuccess.gameId, joinSuccess.playerToken)
        : '';

    return (
      <div className="min-h-screen" data-testid="join-success-page">
        <div className="page-shell max-w-2xl sm:px-6 lg:px-8">
          <div className="page-hero mb-8 text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900">You&apos;re in!</h1>
            <p className="mt-2 text-gray-600">Welcome to the game</p>
          </div>

          <div className="glass-card space-y-5 rounded-xl p-5" data-testid="join-success-card">
            {/* Recovery link section */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4" data-testid="join-recovery-link-section">
              <p className="mb-1 text-sm font-semibold text-orange-900">Your Recovery Link</p>
              <p className="mb-3 text-xs text-orange-700">
                Save this link to restore your session from any browser. Keep it handy!
              </p>
              {recoveryLink ? (
                <CopyRecoveryLink
                  href={recoveryLink}
                  label="Copy your recovery link"
                />
              ) : (
                <p className="text-xs text-orange-600">
                  Recovery link not available for this session (you may have rejoined with an existing name).
                </p>
              )}
            </div>

            <Link
              href={`/games/${joinSuccess.gameId}`}
              className="btn-primary block w-full rounded-xl px-6 py-3 text-center"
              data-testid="join-success-continue-btn"
            >
              Continue to game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="join-page">
      <div className="page-shell max-w-2xl sm:px-6 lg:px-8">
        <div className="page-hero mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Join a Game</h1>
          <p className="mt-2 text-gray-600">Enter the invite code from your friend</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-6 p-6" data-testid="join-form">
          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" data-testid="join-error">
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
              className="input-field mt-1 px-4 py-2 text-center text-lg font-mono tracking-widest text-gray-900"
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
              className="input-field mt-1 px-4 py-2 text-gray-900"
              data-testid="join-name-input"
              maxLength={50}
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isJoining}
              className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="btn-secondary rounded-xl px-6 py-2"
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
