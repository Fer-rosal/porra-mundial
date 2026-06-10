'use client';

import { use, useState } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import MatchCard from '@/components/MatchCard';

export default function PredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, savePredictions } = useGameStore();

  // Checkbox-driven partial save state
  const [checkedMatches, setCheckedMatches] = useState<Set<string>>(new Set());
  const [pendingScores, setPendingScores] = useState<Map<string, [number, number]>>(new Map());
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

  // Derived from store on every render — not state
  const existingPredictions = new Map(
    game.predictions
      .filter((p) => p.sessionId === mySession.sessionId)
      .map((p) => [p.matchId, [p.homeGoalsPredicted, p.awayGoalsPredicted] as [number, number]])
  );

  const handleCheck = (matchId: string, isChecked: boolean) => {
    setCheckedMatches((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        next.add(matchId);
      } else {
        next.delete(matchId);
      }
      return next;
    });
  };

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      next.set(matchId, [home, away]);
      return next;
    });
  };

  const handleSubmit = () => {
    setError(null);

    // Belt-and-suspenders guard (button is already disabled, but defensive check)
    if (checkedMatches.size === 0) {
      setError('Select at least one match to save.');
      return;
    }

    try {
      // Batch save — single persist() call avoids stale-closure issues
      const payloads = Array.from(checkedMatches).map((matchId) => {
        const pending = pendingScores.get(matchId);
        const [home, away] = pending ?? [0, 0];
        return { matchId, homeGoalsPredicted: home, awayGoalsPredicted: away };
      });
      savePredictions(gameId, payloads);

      // Clear transient state
      setCheckedMatches(new Set());
      setPendingScores(new Map());

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save predictions');
    }
  };

  return (
    <div className="space-y-8" data-testid="predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Make Your Predictions</h1>
        {activePhaseKey && (
          <p className="mt-2 text-gray-600">
            Phase: <span className="font-semibold">{activePhaseKey}</span> — Submit before it closes.
          </p>
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
          <div className="space-y-4" data-testid="predictions-list">
            {activeMatches.map((match) => {
              const isSaved = existingPredictions.has(match.id);

              if (isSaved) {
                // Mode A — already saved: read-only with Saved badge
                const [savedHome, savedAway] = existingPredictions.get(match.id)!;
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
                    readOnly={true}
                    savedBadge={true}
                    homeGoalsPredicted={savedHome}
                    awayGoalsPredicted={savedAway}
                  />
                );
              }

              // Mode B — not yet saved: checkbox-driven editable
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
                  checked={checkedMatches.has(match.id)}
                  onCheckedChange={(c) => handleCheck(match.id, c)}
                  onScoreChange={(home, away) => handleScoreChange(match.id, home, away)}
                  homeGoalsPredicted={pendingScores.get(match.id)?.[0] ?? 0}
                  awayGoalsPredicted={pendingScores.get(match.id)?.[1] ?? 0}
                />
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={checkedMatches.size === 0}
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
