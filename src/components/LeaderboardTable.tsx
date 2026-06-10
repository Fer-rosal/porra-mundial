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

export default function LeaderboardTable({ entries, currentSessionId }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto" data-testid="leaderboard-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Player</th>
            {PHASE_ORDER.map((phase) => (
              <th key={phase} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                {PHASE_LABELS[phase]}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.sessionId}
              className={`border-b border-gray-200 ${
                entry.sessionId === currentSessionId ? 'bg-orange-50' : ''
              }`}
              data-testid={`leaderboard-row-${entry.sessionId}`}
            >
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{idx + 1}</td>
              <td className={`px-4 py-3 text-sm font-medium ${
                entry.sessionId === currentSessionId ? 'text-orange-700' : 'text-gray-900'
              }`}>
                {entry.playerName}
                {entry.sessionId === currentSessionId && ' (you)'}
              </td>
              {PHASE_ORDER.map((phase) => (
                <td key={phase} className="px-4 py-3 text-center text-sm text-gray-600">
                  {entry.phaseScores[phase] ?? 0}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{entry.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
