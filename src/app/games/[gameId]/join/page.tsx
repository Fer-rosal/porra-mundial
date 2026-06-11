'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore, persistSessionId } from '@/lib/game-store';
import Link from 'next/link';

/**
 * Player token redemption page.
 * Route: /games/[gameId]/join?token=<playerToken>
 *
 * Validates the token against the Supabase DB, writes the session,
 * and redirects to /games/[gameId]/predictions.
 */
export default function PlayerTokenRedemptionPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { redeemPlayerToken } = useGameStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<'invalid' | 'no-game' | 'no-token'>('invalid');

  useEffect(() => {
    if (!gameId) {
      router.replace('/dashboard');
      return;
    }

    const token = searchParams?.get('token');
    if (!token) {
      setErrorType('no-token');
      setErrorMessage('No recovery token found in this link. Please use a valid recovery link.');
      setStatus('error');
      return;
    }

    async function tryRedeem() {
      const result = await redeemPlayerToken(gameId, token!);

      if ('error' in result) {
        if (result.error === 'no_game') {
          setErrorType('no-game');
          setErrorMessage('Game data not found. You may need to import the game first.');
        } else {
          setErrorType('invalid');
          setErrorMessage('This recovery link is not valid or has already been used.');
        }
        setStatus('error');
        return;
      }

      // Success — persist session and redirect
      persistSessionId(gameId, result.sessionId);
      router.replace(`/games/${gameId}/predictions`);
    }

    tryRedeem();
  }, [gameId, searchParams, redeemPlayerToken, router]);

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        data-testid="join-token-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-gray-600">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      data-testid="join-token-page"
    >
      <div className="max-w-md w-full space-y-4">
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
          data-testid="join-token-error"
        >
          <p className="font-semibold text-red-800 mb-2">Unable to restore session</p>
          <p className="text-sm">{errorMessage}</p>
        </div>

        <div className="flex flex-col gap-3">
          {errorType === 'invalid' && (
            <Link
              href="/join"
              className="w-full rounded-xl bg-orange-500 px-6 py-3 text-center font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 transition-all"
              data-testid="join-token-join-link"
            >
              Join with an invite code
            </Link>
          )}
          {errorType === 'no-game' && (
            <Link
              href="/import"
              className="w-full rounded-xl bg-orange-500 px-6 py-3 text-center font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 transition-all"
              data-testid="join-token-import-link"
            >
              Import game data
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 transition-all"
            data-testid="join-token-dashboard-link"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
