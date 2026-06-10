'use client';

import { useRouter } from 'next/navigation';
import { useGameStore, persistSessionId, type LocalGame } from '@/lib/game-store';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function CreateGamePage() {
  const router = useRouter();
  const { createGame } = useGameStore();
  const [gameName, setGameName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdGame, setCreatedGame] = useState<LocalGame | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = gameName.trim();
    if (!trimmed) {
      setError('Game name is required');
      return;
    }
    if (trimmed.length > 100) {
      setError('Game name must be 100 characters or fewer');
      return;
    }
    try {
      const game = createGame(trimmed);
      // Persist the creator's session so they can be identified on this device
      persistSessionId(game.id, game.creatorSessionId);
      setCreatedGame(game);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  const copyInviteLink = async () => {
    if (!createdGame) return;
    const link = `${window.location.origin}/join?code=${createdGame.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Success state — show invite link
  if (createdGame) {
    const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${createdGame.inviteCode}`;
    return (
      <div className="min-h-screen bg-white" data-testid="create-game-page">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900">Game Created!</h1>
            <p className="mt-2 text-gray-600">Share the invite link with your friends to get started</p>
          </div>

          <div className="rounded-lg border border-gray-200 p-6 shadow-sm" data-testid="create-game-success-card">
            <h2 className="mb-4 text-xl font-bold text-gray-900">{createdGame.name}</h2>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Invite Code</p>
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-gray-900">
                {createdGame.inviteCode}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-700">Invite Link</p>
              <div className="flex gap-2">
                <div className="flex-1 truncate rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {inviteLink}
                </div>
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
                  data-testid="create-game-copy-link-btn"
                >
                  {codeCopied ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/games/${createdGame.id}`}
                className="flex-1 rounded-lg bg-orange-500 px-6 py-3 text-center font-semibold text-white hover:bg-orange-600"
                data-testid="create-game-start-btn"
              >
                Start Playing
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold text-gray-900 hover:bg-gray-50"
                data-testid="create-game-dashboard-btn"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              className="flex-1 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 flex items-center justify-center gap-2"
              data-testid="create-game-submit-btn"
            >
              Create Game
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
