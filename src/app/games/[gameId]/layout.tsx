'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/lib/game-store';
import { ReactNode } from 'react';

export default function GameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { getGame, getMySession, getIsCreator } = useGameStore();

  const game = getGame(gameId);
  const mySession = getMySession(gameId);
  const isAdmin = getIsCreator(gameId);

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="game-layout-not-found">
        <div className="max-w-md text-center">
          <p className="mb-4 text-xl font-semibold text-gray-900">Game not found</p>
          <p className="mb-6 text-gray-600">
            Game data not found. It may have been cleared from this browser.
          </p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="game-layout">
      {/* Game header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{game.name}</h1>
              <p className="mt-1 text-gray-600">
                {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                {mySession && (
                  <span className="ml-2 text-sm text-gray-500">
                    — Playing as <span className="font-medium">{mySession.name}</span>
                    {isAdmin && (
                      <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Creator
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Link
                  href={`/games/${gameId}/admin`}
                  className="block rounded-lg bg-orange-500 px-4 py-2 text-center font-semibold text-white hover:bg-orange-600"
                  data-testid="game-admin-link"
                >
                  Admin Panel
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto" data-testid="game-nav-tabs">
            <Link
              href={`/games/${gameId}`}
              className="whitespace-nowrap border-b-2 border-orange-500 px-4 py-3 text-sm font-medium text-orange-600"
              data-testid="game-nav-overview"
            >
              Overview
            </Link>
            <Link
              href={`/games/${gameId}/predictions`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              data-testid="game-nav-predictions"
            >
              Predictions
            </Link>
            <Link
              href={`/games/${gameId}/my-predictions`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              data-testid="game-nav-my-predictions"
            >
              My Predictions
            </Link>
            <Link
              href={`/games/${gameId}/scorer`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              data-testid="game-nav-scorer"
            >
              Scorer
            </Link>
            <Link
              href={`/games/${gameId}/leaderboard`}
              className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              data-testid="game-nav-leaderboard"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
