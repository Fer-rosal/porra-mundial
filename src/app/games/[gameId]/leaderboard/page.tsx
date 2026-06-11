'use client';

import { use, useEffect, useState } from 'react';
import { useGameStore } from '@/lib/game-store';
import { calculateLeaderboard, calculatePlayerPointsLog } from '@/lib/local-scoring';
import LeaderboardTable from '@/components/LeaderboardTable';

const PHASE_LABELS = {
  LEAGUE: 'LEAGUE',
  R16: 'R32',
  R8: 'R16',
  R4: 'QF',
  R2: 'SF',
  FINAL: 'FINAL',
} as const;

export default function LeaderboardPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession } = useGameStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedSessionId) return;
    if (mySession?.sessionId) {
      setSelectedSessionId(mySession.sessionId);
      return;
    }
    if (entries.length > 0) {
      setSelectedSessionId(entries[0].sessionId);
    }
  }, [entries, mySession, selectedSessionId]);

  const selectedEntry = entries.find((e) => e.sessionId === selectedSessionId) ?? null;
  const selectedPointsLog = selectedSessionId ? calculatePlayerPointsLog(game, selectedSessionId) : [];
  const selectedPointsTotal = selectedPointsLog.reduce((sum, item) => sum + item.awardedPoints, 0);

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
          <LeaderboardTable
            entries={entries}
            currentSessionId={mySession?.sessionId}
            creatorSessionId={game.creatorSessionId}
            selectedSessionId={selectedSessionId ?? undefined}
            onSelectPlayer={setSelectedSessionId}
          />
        </div>
      )}

      <div className="glass-card rounded-xl p-5" data-testid="leaderboard-points-log">
        <h2 className="text-lg font-semibold text-gray-900">Player Points Breakdown</h2>
        {selectedEntry && (
          <p className="mt-1 text-sm text-gray-600">
            Showing details for <span className="font-semibold text-gray-900">{selectedEntry.playerName}</span>
          </p>
        )}
        {!selectedEntry ? (
          <p className="mt-2 text-sm text-gray-600">Select a player from ranking to view their points log.</p>
        ) : selectedPointsLog.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No awarded points yet for this player.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">Total from log: <span className="font-semibold text-gray-900">{selectedPointsTotal}</span></p>
            <ul className="mt-4 space-y-2" data-testid="leaderboard-points-log-list">
              {selectedPointsLog.map((item) => (
                <li key={item.id} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-orange-900">{item.label}</p>
                      <p className="text-xs text-orange-700">
                        {PHASE_LABELS[item.phaseKey]} · {item.source === 'prediction' ? 'Prediction' : item.source === 'scorer' ? 'Scorer' : 'Winner Bonus'} · {item.basePoints} x {item.multiplier}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-orange-800">
                      +{item.awardedPoints}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
