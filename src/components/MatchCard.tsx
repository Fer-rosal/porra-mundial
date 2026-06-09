'use client';

import { Match } from '@/lib/types';
import { useState } from 'react';

interface MatchCardProps {
  match: Match;
  editable?: boolean;
  onScoreChange?: (homeGoals: number, awayGoals: number) => void;
  homeGoalsPredicted?: number;
  awayGoalsPredicted?: number;
}

export default function MatchCard({
  match,
  editable = false,
  onScoreChange,
  homeGoalsPredicted,
  awayGoalsPredicted,
}: MatchCardProps) {
  const [home, setHome] = useState(homeGoalsPredicted ?? 0);
  const [away, setAway] = useState(awayGoalsPredicted ?? 0);

  const handleHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setHome(val);
    onScoreChange?.(val, away);
  };

  const handleAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setAway(val);
    onScoreChange?.(home, val);
  };

  const resultEntered = match.result_entered && match.home_goals !== undefined;

  return (
    <div
      className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`match-card-${match.id}`}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* Home team */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Home</p>
          <p className="text-lg font-bold text-gray-900">{match.home_team}</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-2">
          {editable ? (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="99"
                value={home}
                onChange={handleHomeChange}
                className="w-12 rounded border border-gray-300 bg-white px-2 py-1 text-center text-lg font-bold text-gray-900 focus:border-orange-500 focus:outline-none"
                data-testid={`match-home-input-${match.id}`}
              />
              <span className="text-lg font-bold text-gray-400">:</span>
              <input
                type="number"
                min="0"
                max="99"
                value={away}
                onChange={handleAwayChange}
                className="w-12 rounded border border-gray-300 bg-white px-2 py-1 text-center text-lg font-bold text-gray-900 focus:border-orange-500 focus:outline-none"
                data-testid={`match-away-input-${match.id}`}
              />
            </div>
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {resultEntered ? `${match.home_goals} : ${match.away_goals}` : '?  :  ?'}
            </div>
          )}
          <p className="text-xs text-gray-500">
            {new Date(match.scheduled_at).toLocaleDateString()} {new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Away team */}
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-gray-600">Away</p>
          <p className="text-lg font-bold text-gray-900">{match.away_team}</p>
        </div>
      </div>

      {resultEntered && (
        <div className="border-t border-gray-200 pt-3 text-center">
          <p className="text-xs font-semibold text-green-700">Result Entered</p>
        </div>
      )}
    </div>
  );
}
