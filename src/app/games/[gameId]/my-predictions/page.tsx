'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useQuery } from '@tanstack/react-query';
import { getMyPredictions } from '@/lib/api';
import MatchCard from '@/components/MatchCard';
import type { MyPredictionsResponse, Prediction } from '@/lib/types';

export default function MyPredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const { data, isLoading } = useQuery<MyPredictionsResponse>({
    queryKey: ['myPredictions', gameId],
    queryFn: () => getMyPredictions(gameId),
    enabled: !!user,
  });

  if (isLoading) return <div className="text-gray-600">Loading...</div>;

  return (
    <div className="space-y-8" data-testid="my-predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Predictions</h1>
        <p className="mt-2 text-gray-600">Your predictions for {data?.phase_key || 'this phase'}</p>
      </div>

      {data?.predictions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600" data-testid="my-predictions-empty">
          No predictions yet
        </div>
      ) : (
        <div className="space-y-4">
          {data?.predictions.map((pred: Prediction) => (
            <div key={pred.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {pred.home_team} vs {pred.away_team}
                  </p>
                  <p className="text-sm text-gray-600">Your prediction: {pred.home_goals_predicted} - {pred.away_goals_predicted}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.scorer_selection && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <h3 className="font-semibold text-orange-900">Your Goalscorer</h3>
          <p className="mt-2 text-orange-700">{data.scorer_selection.player_name}</p>
        </div>
      )}
    </div>
  );
}
