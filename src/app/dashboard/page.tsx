'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getGames } from '@/lib/api';
import { useState } from 'react';
import type { Game } from '@/lib/types';

type FilterType = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useUser();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const { data: gamesData = [], isLoading, error } = useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: getGames,
    enabled: !!user,
  });

  const games: Game[] = gamesData;

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 mx-auto" />
          <p className="text-gray-600">Loading games...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Please log in to view your games</p>
      </div>
    );
  }

  const filteredGames = games.filter((game) => {
    if (filter === 'ALL') return true;
    return game.status === filter;
  });

  return (
    <div className="min-h-screen bg-white" data-testid="dashboard-page">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Games</h1>
            <p className="mt-1 text-gray-600">Manage your World Cup 2026 betting tournaments</p>
          </div>
          <Link
            href="/dashboard/create-game"
            className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600"
            data-testid="dashboard-create-btn"
          >
            Create New Game
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid={`dashboard-filter-${f}`}
            >
              {f === 'ALL' ? 'All Games' : f === 'IN_PROGRESS' ? 'In Progress' : f}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="dashboard-error">
            Failed to load games. Please try again.
          </div>
        )}

        {/* Games list */}
        {filteredGames.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center" data-testid="dashboard-empty">
            <p className="text-gray-600">No games found. {filter !== 'ALL' && 'Try changing your filter.'}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                data-testid={`dashboard-game-${game.id}`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600">
                    {game.name}
                  </h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    game.status === 'OPEN'
                      ? 'bg-green-100 text-green-800'
                      : game.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {game.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {game.player_count || 1} player{game.player_count !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
