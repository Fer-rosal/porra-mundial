'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import MatchCard from '@/components/MatchCard';
import { useState } from 'react';

export default function PredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, savePrediction } = useGameStore();
  const [predictions, setPredictions] = useState<Record<string, [number, number]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game) {
    return (
      <div className="text-red-600" data-testid="predictions-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  if (!mySession) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800" data-testid="predictions-no-session">
        You are not in this game. Please join the game first.
      </div>
    );
  }

  // Find the open, unlocked phase
  const openPhase = game.phases.find((p) => p.isOpen && !p.isLocked);
  const lockedPhase = game.phases.find((p) => p.isLocked);

  // Determine current phase for display
  const activePhaseKey: PhaseKey | null = openPhase?.phaseKey ?? null;

  // Get matches for the active phase
  const activeMatches = activePhaseKey
    ? game.matches.filter((m) => m.phaseKey === activePhaseKey)
    : [];

  // Pre-fill from existing predictions for this session
  const existingPredictions = game.predictions.filter((p) => p.sessionId === mySession.sessionId)
  const predictionsByMatchId: Record<string, [number, number]> = {}
  for (const pred of existingPredictions) {
    predictionsByMatchId[pred.matchId] = [pred.homeGoalsPredicted, pred.awayGoalsPredicted]
  }

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: [home, away],
    }));
  };

  const handleSubmit = () => {
    setError(null);
    if (Object.keys(predictions).length === 0) {
      setError('No predictions entered. Please fill in at least one score.');
      return;
    }
    try {
      for (const [matchId, [home, away]] of Object.entries(predictions)) {
        savePrediction(gameId, {
          matchId,
          homeGoalsPredicted: home,
          awayGoalsPredicted: away,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setPredictions({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save predictions');
    }
  };

  return (
    <div className="space-y-8" data-testid="predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Make Your Predictions</h1>
        {activePhaseKey ? (
          <p className="mt-2 text-gray-600">
            Phase: <span className="font-semibold">{activePhaseKey}</span> — Submit before it closes.
          </p>
        ) : lockedPhase ? (
          <p className="mt-2 text-gray-600">
            This phase is locked. Predictions are no longer accepted.
          </p>
        ) : (
          <p className="mt-2 text-gray-600">Waiting for a phase to open...</p>
        )}
      </div>

      {!activePhaseKey && (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600"
          data-testid="predictions-waiting"
        >
          {lockedPhase
            ? 'This phase is locked. You cannot submit predictions.'
            : 'Waiting for phase to open. Check back soon!'}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="predictions-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="predictions-saved">
          Predictions saved!
        </div>
      )}

      {activePhaseKey && activeMatches.length > 0 && (
        <>
          <div className="space-y-4">
            {activeMatches.map((match) => {
              // Merge saved predictions with unsaved changes
              const pending = predictions[match.id]
              const existing = predictionsByMatchId[match.id]
              const homeVal = pending?.[0] ?? existing?.[0]
              const awayVal = pending?.[1] ?? existing?.[1]

              return (
                <MatchCard
                  key={match.id}
                  match={{
                    id: match.id,
                    match_number: match.matchNumber,
                    home_team: match.homeTeam,
                    away_team: match.awayTeam,
                    scheduled_at: match.scheduledAt,
                    result_entered: match.resultEntered,
                    home_goals: match.homeGoals ?? undefined,
                    away_goals: match.awayGoals ?? undefined,
                  }}
                  editable={true}
                  onScoreChange={(home, away) => handleScoreChange(match.id, home, away)}
                  homeGoalsPredicted={homeVal}
                  awayGoalsPredicted={awayVal}
                />
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={Object.keys(predictions).length === 0}
            className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="predictions-submit-btn"
          >
            Save Predictions
          </button>
        </>
      )}
    </div>
  );
}
