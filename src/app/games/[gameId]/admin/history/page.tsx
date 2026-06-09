'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '@/lib/api';
import type { Prediction } from '@/lib/types';

interface HistoryData {
  predictions?: Array<Prediction & { player_name: string }>;
}

export default function HistoryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ['history', gameId],
    queryFn: () => getHistory(gameId),
    enabled: !!user,
  });

  if (isLoading) return <div className="text-gray-600">Loading history...</div>;

  return (
    <div className="space-y-8" data-testid="history-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Game History</h1>
        <p className="mt-2 text-gray-600">All predictions, results, and scores</p>
      </div>

      {data?.predictions && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Predictions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-4 py-2 text-left">Match</th>
                  <th className="px-4 py-2 text-center">Prediction</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions?.map((p: Prediction & { player_name: string }, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-2">{p.player_name}</td>
                    <td className="px-4 py-2">{p.home_team} vs {p.away_team}</td>
                    <td className="px-4 py-2 text-center">{p.home_goals_predicted} - {p.away_goals_predicted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          const csv = 'CSV export coming soon...';
          console.log(csv);
        }}
        className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600"
        data-testid="history-export-btn"
      >
        Export to CSV
      </button>
    </div>
  );
}
