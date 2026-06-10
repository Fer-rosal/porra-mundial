'use client';

import { use } from 'react';
import { useGameStore } from '@/lib/game-store';

export default function MyPredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession } = useGameStore();

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game) {
    return (
      <div className="text-red-600" data-testid="my-predictions-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  if (!mySession) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800" data-testid="my-predictions-no-session">
        You are not in this game. Please join the game first.
      </div>
    );
  }

  const myPredictions = game.predictions.filter((p) => p.sessionId === mySession.sessionId);
  const myScorerSelections = game.scorerSelections.filter((s) => s.sessionId === mySession.sessionId);

  // Build match lookup
  const matchById = Object.fromEntries(game.matches.map((m) => [m.id, m]));

  return (
    <div className="space-y-8" data-testid="my-predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Predictions</h1>
        <p className="mt-2 text-gray-600">Your submitted predictions and scorer selections</p>
      </div>

      {myPredictions.length === 0 ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600"
          data-testid="my-predictions-empty"
        >
          No predictions yet. Go to the Predictions tab to submit your scores.
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Match Predictions</h2>
          <div className="space-y-3">
            {myPredictions.map((pred) => {
              const match = matchById[pred.matchId];
              if (!match) return null;
              return (
                <div
                  key={pred.id}
                  className="rounded-lg border border-gray-200 p-4"
                  data-testid={`my-prediction-${pred.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {match.homeTeam} vs {match.awayTeam}
                      </p>
                      <p className="text-xs text-gray-500">{match.phaseKey} • Match {match.matchNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Your prediction:{' '}
                        <span className="font-bold text-gray-900">
                          {pred.homeGoalsPredicted} - {pred.awayGoalsPredicted}
                        </span>
                      </p>
                      {match.resultEntered && (
                        <p className="text-sm text-gray-600">
                          Result:{' '}
                          <span className="font-bold text-gray-900">
                            {match.homeGoals} - {match.awayGoals}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myScorerSelections.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Goalscorer Selections</h2>
          <div className="space-y-3">
            {myScorerSelections.map((sel) => (
              <div
                key={sel.id}
                className="rounded-lg border border-orange-200 bg-orange-50 p-4"
                data-testid={`my-scorer-${sel.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-orange-900">Phase: {sel.phaseKey}</p>
                    <p className="text-orange-700">{sel.playerName}</p>
                  </div>
                  {sel.isLocked && (
                    <span className="rounded-full bg-orange-200 px-2 py-1 text-xs font-medium text-orange-800">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
