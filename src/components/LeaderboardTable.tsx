'use client';

import type { LeaderboardEntry as LocalLeaderboardEntry, PhaseKey } from '@/lib/game-store'

interface LeaderboardTableProps {
  entries: LocalLeaderboardEntry[];
  currentSessionId?: string;
}

const PHASE_LABELS: Record<PhaseKey, string> = {
  LEAGUE: 'League',
  R16: 'R16',
  R8: 'QF',
  R4: 'SF',
  R2: '3rd/F',
  FINAL: 'Final',
}

const PHASE_ORDER: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-900">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-800">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center text-sm font-semibold text-gray-500">
      {rank}
    </span>
  );
}

export default function LeaderboardTable({ entries, currentSessionId }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto" data-testid="leaderboard-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Player</th>
            {PHASE_ORDER.map((phase) => (
              <th key={phase} className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
                {PHASE_LABELS[phase]}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isCurrentPlayer = entry.sessionId === currentSessionId;
            return (
              <tr
                key={entry.sessionId}
                className={`border-b border-gray-100 transition-colors ${
                  isCurrentPlayer
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'hover:bg-gray-50'
                }`}
                data-testid={`leaderboard-row-${entry.sessionId}`}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={idx + 1} />
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${
                  isCurrentPlayer ? 'text-orange-700' : 'text-gray-900'
                }`}>
                  {entry.playerName}
                  {isCurrentPlayer && (
                    <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      you
                    </span>
                  )}
                </td>
                {PHASE_ORDER.map((phase) => (
                  <td key={phase} className="px-3 py-3 text-center text-sm text-gray-600">
                    {entry.phaseScores[phase] ?? 0}
                  </td>
                ))}
                <td className={`px-4 py-3 text-right text-sm font-bold ${
                  isCurrentPlayer ? 'text-orange-700' : 'text-gray-900'
                }`}>
                  {entry.totalScore}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
