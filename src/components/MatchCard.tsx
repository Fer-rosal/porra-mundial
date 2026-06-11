'use client';

import { Match } from '@/lib/types';
import { useState } from 'react';

interface MatchCardProps {
  match: Match;
  editable?: boolean;
  onScoreChange?: (homeGoals: number, awayGoals: number) => void;
  homeGoalsPredicted?: number;
  awayGoalsPredicted?: number;
  // New props for predictions form
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  readOnly?: boolean;
  savedBadge?: boolean;
}

export default function MatchCard({
  match,
  editable = false,
  onScoreChange,
  homeGoalsPredicted,
  awayGoalsPredicted,
  checked,
  onCheckedChange,
  readOnly = false,
  savedBadge = false,
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

  // Checkbox is shown when new props are used (readOnly OR onCheckedChange is provided)
  const showCheckbox = readOnly || onCheckedChange !== undefined || checked !== undefined;

  // When readOnly: scores shown as text; when unchecked: inputs disabled + opacity-50; when checked: inputs active
  // If checkbox UI is not shown (showCheckbox=false), inputs are always enabled when editable.
  const inputsDisabled = readOnly || (showCheckbox && !readOnly && !checked);
  const inputsOpacity = showCheckbox && !readOnly && !checked ? 'opacity-50' : '';

  return (
    <div
      className="glass-card rounded-xl p-4"
      data-testid={`match-card-${match.id}`}
    >
      {/* Checkbox row — only shown when new props are in use */}
      {showCheckbox && (
        <div className="mb-3 flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 min-h-[44px]">
            <input
              type="checkbox"
              className="h-4 w-4 flex-shrink-0 accent-orange-500"
              checked={readOnly ? false : (checked ?? false)}
              disabled={readOnly}
              onChange={(e) => onCheckedChange?.(e.target.checked)}
              data-testid={`match-checkbox-${match.id}`}
            />
            {savedBadge && (
              <span
                className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"
                data-testid={`match-saved-badge-${match.id}`}
              >
                Saved
              </span>
            )}
          </label>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Home</p>
          <p className="text-base font-bold text-gray-900 truncate">{match.home_team}</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          {readOnly ? (
            // readOnly: show saved scores as plain text
            <div className="text-3xl font-bold tabular-nums text-gray-900" data-testid={`match-readonly-score-${match.id}`}>
              {homeGoalsPredicted ?? 0} <span className="text-gray-400">:</span> {awayGoalsPredicted ?? 0}
            </div>
          ) : editable ? (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="99"
                value={home}
                onChange={handleHomeChange}
                disabled={inputsDisabled}
                className={`w-12 rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-center text-xl font-bold tabular-nums text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-opacity ${inputsOpacity}`}
                data-testid={`match-home-input-${match.id}`}
              />
              <span className="text-xl font-bold text-gray-300">:</span>
              <input
                type="number"
                min="0"
                max="99"
                value={away}
                onChange={handleAwayChange}
                disabled={inputsDisabled}
                className={`w-12 rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-center text-xl font-bold tabular-nums text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-opacity ${inputsOpacity}`}
                data-testid={`match-away-input-${match.id}`}
              />
            </div>
          ) : (
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {resultEntered ? (
                <>{match.home_goals} <span className="text-gray-400">:</span> {match.away_goals}</>
              ) : (
                <span className="text-gray-300">? : ?</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400">
            {new Date(match.scheduled_at).toLocaleDateString()} {new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Away</p>
          <p className="text-base font-bold text-gray-900 truncate">{match.away_team}</p>
        </div>
      </div>

      {resultEntered && !readOnly && (
        <div className="border-t border-gray-100 pt-2 text-center">
          <p className="text-xs font-semibold text-green-700">Result Entered</p>
        </div>
      )}
    </div>
  );
}
