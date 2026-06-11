'use client';

import Link from 'next/link';
import { useGameStore } from '@/lib/game-store';
import { useState } from 'react';
import type { LocalGame } from '@/lib/game-store';
import { Copy, Check, Trash2 } from 'lucide-react';

type FilterType = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export default function DashboardPage() {
  const { games, deleteGame } = useGameStore();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allGames: LocalGame[] = Object.values(games).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredGames = allGames.filter((game) => {
    if (filter === 'ALL') return true;
    return game.status === filter;
  });

  const copyInviteLink = async (game: LocalGame) => {
    const link = `${window.location.origin}/join?code=${game.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(game.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (gameId: string) => {
    setIsDeleting(true);
    try {
      await deleteGame(gameId);
    } finally {
      setDeleteConfirmId(null);
      setIsDeleting(false);
    }
  };

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
              {f === 'ALL' ? 'All Games' : f === 'IN_PROGRESS' ? 'In Progress' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Games list */}
        {filteredGames.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center" data-testid="dashboard-empty">
            <p className="text-gray-600">
              {allGames.length === 0
                ? 'No games yet. Create or join a game to get started!'
                : `No ${filter !== 'ALL' ? filter.toLowerCase() : ''} games found.`}
            </p>
            {allGames.length === 0 && (
              <div className="mt-4 flex justify-center gap-4">
                <Link
                  href="/dashboard/create-game"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  data-testid="dashboard-empty-create-btn"
                >
                  Create Game
                </Link>
                <Link
                  href="/join"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  data-testid="dashboard-empty-join-btn"
                >
                  Join Game
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="rounded-lg border border-gray-200 p-6 shadow-sm"
                data-testid={`dashboard-game-${game.id}`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
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

                <p className="mb-1 text-sm text-gray-600">
                  {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                </p>
                <p className="mb-4 text-xs text-gray-500">
                  Created {new Date(game.createdAt).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/games/${game.id}`}
                    className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-orange-600"
                    data-testid={`dashboard-view-game-${game.id}`}
                  >
                    View Game
                  </Link>
                  <button
                    onClick={() => copyInviteLink(game)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    data-testid={`dashboard-share-${game.id}`}
                    title="Copy invite link"
                  >
                    {copiedId === game.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(game.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    data-testid={`dashboard-delete-${game.id}`}
                    title="Delete game"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="dashboard-delete-modal"
        >
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h4 className="mb-2 text-lg font-semibold text-gray-900">Delete Game?</h4>
            <p className="mb-6 text-gray-600">
              This will permanently remove this game from your browser. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                data-testid="dashboard-delete-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="dashboard-delete-confirm"
              >
                {isDeleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
