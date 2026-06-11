'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/lib/game-store';
import GameNavBar from '@/components/GameNavBar';
import { ReactNode } from 'react';

export default function GameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { getGame, getMySession, getIsCreator, fetchGame, isLoading, error } = useGameStore();

  // Fetch game on mount if not already in cache
  useEffect(() => {
    if (!getGame(gameId)) {
      fetchGame(gameId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  const game = getGame(gameId);
  const mySession = getMySession(gameId);
  const isAdmin = getIsCreator(gameId);

  if (isLoading && !game) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="game-layout-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !game) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="game-layout-not-found">
        <div className="max-w-md text-center">
          <p className="mb-4 text-xl font-semibold text-gray-900">Game not found</p>
          <p className="mb-6 text-gray-600">
            {error ?? 'This game does not exist or could not be loaded.'}
          </p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!game) return null

  return (
    <div className="min-h-screen" data-testid="game-layout">
      {/* Game header */}
      <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50/70 to-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{game.name}</h1>
              <p className="mt-0.5 text-sm text-gray-600">
                {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                {mySession && (
                  <span className="ml-2 text-gray-500">
                    — Playing as <span className="font-medium text-gray-700">{mySession.name}</span>
                    {isAdmin && (
                      <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Creator
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation — GameNavBar handles both mobile (fixed bottom) and desktop (inline top) */}
      <GameNavBar gameId={gameId} isAdmin={isAdmin} />

      {/* Content — pb-20 ensures content is not hidden behind fixed mobile tab bar */}
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
