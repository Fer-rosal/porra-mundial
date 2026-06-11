'use client';

import { use } from 'react';
import { useGameStore } from '@/lib/game-store';
import { calculateLeaderboard } from '@/lib/local-scoring';
import LeaderboardTable from '@/components/LeaderboardTable';

export default function LeaderboardPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession } = useGameStore();

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" data-testid="leaderboard-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  const entries = calculateLeaderboard(game);

  return (
    <div className="space-y-6" data-testid="leaderboard-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-gray-600">Rankings for all players</p>
      </div>

      {entries.length === 0 ? (
        <div
          className="glass-card rounded-xl p-8 text-center text-gray-600"
          data-testid="leaderboard-empty"
        >
          No players yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <LeaderboardTable entries={entries} currentSessionId={mySession?.sessionId} />
        </div>
      )}
    </div>
  );
}
