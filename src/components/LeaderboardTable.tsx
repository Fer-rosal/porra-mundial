'use client';

import type { LeaderboardEntry as LocalLeaderboardEntry, PhaseKey } from '@/lib/game-store'

interface LeaderboardTableProps {
  entries: LocalLeaderboardEntry[];
  currentSessionId?: string;
  creatorSessionId?: string;
  selectedSessionId?: string;
  onSelectPlayer?: (sessionId: string) => void;
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

export default function LeaderboardTable({
  entries,
  currentSessionId,
  creatorSessionId,
  selectedSessionId,
  onSelectPlayer,
}: LeaderboardTableProps) {
  return (
    <div className="glass-card overflow-x-auto rounded-xl" data-testid="leaderboard-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-orange-100 bg-orange-50/60">
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
            const isCreator = entry.sessionId === creatorSessionId;
            const isSelected = entry.sessionId === selectedSessionId;
            return (
              <tr
                key={entry.sessionId}
                className={`border-b border-gray-100 transition-colors ${
                  isCurrentPlayer
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'hover:bg-orange-50/40'
                }`}
                data-testid={`leaderboard-row-${entry.sessionId}`}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={idx + 1} />
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${
                  isCurrentPlayer ? 'text-orange-700' : 'text-gray-900'
                }`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPlayer?.(entry.sessionId)}
                      className={`mr-1 rounded px-1 py-0.5 text-left font-medium transition-colors ${
                        isSelected
                          ? 'bg-orange-100 text-orange-800'
                          : 'hover:bg-orange-50 hover:text-orange-700'
                      }`}
                      data-testid={`leaderboard-player-select-${entry.sessionId}`}
                    >
                      {entry.playerName}
                    </button>
                    {isCreator && (
                      <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                        Creator
                      </span>
                    )}
                    {isCurrentPlayer && (
                      <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                        You
                      </span>
                    )}
                  </div>
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
