'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/lib/api';
import LeaderboardTable from '@/components/LeaderboardTable';

export default function LeaderboardPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', gameId],
    queryFn: () => getLeaderboard(gameId),
    enabled: !!user,
  });

  if (isLoading) return <div className="text-gray-600">Loading leaderboard...</div>;

  return (
    <div className="space-y-8" data-testid="leaderboard-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="mt-2 text-gray-600">Rankings for all players</p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600" data-testid="leaderboard-empty">
          No players yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <LeaderboardTable entries={entries} currentUserId={user?.sub} />
        </div>
      )}
    </div>
  );
}
