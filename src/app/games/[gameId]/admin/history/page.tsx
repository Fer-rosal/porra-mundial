'use client';

import { use } from 'react';
import { useGameStore } from '@/lib/game-store';

export default function HistoryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getIsCreator } = useGameStore();

  const game = getGame(gameId);

  if (!game || !getIsCreator(gameId)) {
    return (
      <div className="text-red-600" data-testid="history-access-denied">
        Access denied. Only the game creator can view game history.
      </div>
    );
  }

  // Build lookups
  const matchById = Object.fromEntries(game.matches.map((m) => [m.id, m]));
  const playerById = Object.fromEntries(game.players.map((p) => [p.sessionId, p.name]));

  const handleExportCSV = () => {
    const rows = [['Player', 'Match', 'Phase', 'Home Predicted', 'Away Predicted', 'Home Result', 'Away Result']];
    for (const pred of game.predictions) {
      const match = matchById[pred.matchId];
      if (!match) continue;
      rows.push([
        playerById[pred.sessionId] || pred.sessionId,
        `${match.homeTeam} vs ${match.awayTeam}`,
        match.phaseKey,
        String(pred.homeGoalsPredicted),
        String(pred.awayGoalsPredicted),
        match.homeGoals !== null ? String(match.homeGoals) : '',
        match.awayGoals !== null ? String(match.awayGoals) : '',
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name}-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8" data-testid="history-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Game History</h1>
        <p className="mt-2 text-gray-600">All predictions, results, and scores</p>
      </div>

      {game.predictions.length === 0 ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600"
          data-testid="history-empty"
        >
          No predictions submitted yet.
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Predictions</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Player</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Phase</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Match</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Prediction</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Result</th>
                </tr>
              </thead>
              <tbody>
                {game.predictions.map((pred, idx) => {
                  const match = matchById[pred.matchId];
                  if (!match) return null;
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">{playerById[pred.sessionId] || 'Unknown'}</td>
                      <td className="px-4 py-2 text-gray-500">{match.phaseKey}</td>
                      <td className="px-4 py-2">{match.homeTeam} vs {match.awayTeam}</td>
                      <td className="px-4 py-2 text-center font-mono">
                        {pred.homeGoalsPredicted} - {pred.awayGoalsPredicted}
                      </td>
                      <td className="px-4 py-2 text-center font-mono">
                        {match.resultEntered ? `${match.homeGoals} - ${match.awayGoals}` : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {game.scorerSelections.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Scorer Selections</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Player</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Phase</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Scorer Selected</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Point Awarded</th>
                </tr>
              </thead>
              <tbody>
                {game.scorerSelections.map((sel, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{playerById[sel.sessionId] || 'Unknown'}</td>
                    <td className="px-4 py-2 text-gray-500">{sel.phaseKey}</td>
                    <td className="px-4 py-2">{sel.playerName}</td>
                    <td className="px-4 py-2 text-center">
                      {sel.isLocked ? (
                        <span className="text-green-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleExportCSV}
        className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600"
        data-testid="history-export-btn"
      >
        Export to CSV
      </button>
    </div>
  );
}
