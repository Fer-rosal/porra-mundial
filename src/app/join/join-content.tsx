'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { joinGame } from '@/lib/api';
import { useState, useEffect } from 'react';

export function JoinContent() {
  const { user, isLoading: authLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-fill code from URL query param
  useEffect(() => {
    const code = searchParams?.get('code');
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinGame(code),
    onSuccess: (data) => {
      router.push(`/games/${data.game_id}`);
    },
    onError: (err: any) => {
      if (err.status === 409) {
        setError('You already joined this game.');
      } else if (err.status === 400) {
        setError('Invite code not found. Check spelling.');
      } else {
        setError(err.error || 'Failed to join game');
      }
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
        <p className="text-gray-600">Please log in to join a game</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }
    joinMutation.mutate(inviteCode.toUpperCase());
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
              placeholder="e.g., ABC123"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-lg font-mono tracking-widest text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              data-testid="join-code-input"
              maxLength={10}
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={joinMutation.isPending}
              className="flex-1 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="join-submit-btn"
            >
              {joinMutation.isPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {joinMutation.isPending ? 'Joining...' : 'Join Game'}
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
