'use client';

import { LeaderboardEntry } from '@/lib/types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto" data-testid="leaderboard-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Player</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">League</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">1/16</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">1/8</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">1/4</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">1/2</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Final</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.game_player_id}
              className={`border-b border-gray-200 ${
                entry.game_player_id === currentUserId ? 'bg-orange-50' : ''
              }`}
              data-testid={`leaderboard-row-${entry.game_player_id}`}
            >
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{idx + 1}</td>
              <td className={`px-4 py-3 text-sm font-medium ${
                entry.game_player_id === currentUserId ? 'text-orange-700' : 'text-gray-900'
              }`}>
                {entry.player_name}
                {entry.game_player_id === currentUserId && ' (you)'}
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{entry.league_score || 0}</td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{entry.round_of_16_score || 0}</td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{entry.quarter_finals_score || 0}</td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{entry.semi_finals_score || 0}</td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">{entry.finals_score || 0}</td>
              <td className="px-4 py-3 text-center text-sm text-gray-600">-</td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{entry.total_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
