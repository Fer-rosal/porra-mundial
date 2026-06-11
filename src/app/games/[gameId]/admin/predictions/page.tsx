'use client';

import { use, useState } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import MatchCard from '@/components/MatchCard';
import Link from 'next/link';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];
const PHASE_LABELS: Record<PhaseKey, string> = {
  LEAGUE: 'LEAGUE',
  R16: 'R32',
  R8: 'R8',
  R4: 'R4',
  R2: 'R2',
  FINAL: 'FINAL',
};

export default function AdminPredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getIsCreator, overridePredictions } = useGameStore();

  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [pendingScores, setPendingScores] = useState<Map<string, [number, number]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const game = getGame(gameId);
  const isCreator = getIsCreator(gameId);

  // Access guard
  if (!game || !isCreator) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700"
        data-testid="admin-access-denied"
      >
        <p className="font-semibold">Access denied</p>
        <p className="mt-1 text-sm">Only the game creator can access the admin panel.</p>
        <Link
          href={game ? `/games/${gameId}` : '/dashboard'}
          className="mt-4 inline-block rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Back to Overview
        </Link>
      </div>
    );
  }

  // Resolve selected player — default to first player if none explicitly selected
  const effectiveSessionId = selectedSessionId ?? game.players[0]?.sessionId ?? null;

  const matchesForPhase = game.matches.filter((m) => m.phaseKey === selectedPhase);

  // Existing predictions for the selected player in the current phase
  const playerPredictions = new Map(
    game.predictions
      .filter((p) => p.sessionId === effectiveSessionId)
      .map((p) => [p.matchId, [p.homeGoalsPredicted, p.awayGoalsPredicted] as [number, number]])
  );

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      next.set(matchId, [home, away]);
      return next;
    });
  };

  const handleSaveOverride = async () => {
    setError(null);

    if (!effectiveSessionId) {
      setError('No player selected.');
      return;
    }

    setIsSaving(true);
    try {
      // Admin saves the full set of displayed matches in a single batch call
      const payloads = matchesForPhase.map((match) => {
        const pending = pendingScores.get(match.id);
        const existing = playerPredictions.get(match.id);
        const [home, away] = pending ?? existing ?? [0, 0];
        return { matchId: match.id, homeGoalsPredicted: home, awayGoalsPredicted: away };
      });
      await overridePredictions(gameId, effectiveSessionId, payloads);

      setPendingScores(new Map());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save predictions');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhaseChange = (phase: PhaseKey) => {
    setSelectedPhase(phase);
    setPendingScores(new Map());
    setSaved(false);
    setError(null);
  };

  const handlePlayerChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setPendingScores(new Map());
    setSaved(false);
    setError(null);
  };

  return (
    <div className="space-y-8" data-testid="admin-predictions-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Player Predictions</h1>
        <p className="mt-2 text-gray-600">Override any player&apos;s prediction for any match</p>
      </div>

      {/* Phase selector */}
      <div className="glass-card rounded-lg p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Phase</h2>
        <div className="flex flex-wrap gap-2" data-testid="admin-predictions-phase-selector">
          {PHASE_OPTIONS.map((phase) => (
            <button
              key={phase}
              onClick={() => handlePhaseChange(phase)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedPhase === phase
                  ? 'bg-orange-500 text-white'
                  : 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
              }`}
              data-testid={`admin-predictions-phase-${phase}`}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>
      </div>

      {/* Player selector */}
      <div className="glass-card rounded-lg p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Player</h2>
        <div className="flex flex-wrap gap-2" data-testid="admin-predictions-player-selector">
          {game.players.map((player) => (
            <button
              key={player.sessionId}
              onClick={() => handlePlayerChange(player.sessionId)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                effectiveSessionId === player.sessionId
                  ? 'bg-orange-500 text-white'
                  : 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
              }`}
              data-testid={`admin-predictions-player-${player.sessionId}`}
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          data-testid="admin-predictions-error"
        >
          {error}
        </div>
      )}

      {saved && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
          data-testid="admin-predictions-saved"
        >
          Predictions updated.
        </div>
      )}

      {/* Match cards — editable for admin, no checkbox */}
      {matchesForPhase.length > 0 ? (
        <>
          <div className="space-y-4" data-testid="admin-predictions-list">
            {matchesForPhase.map((match) => {
              const pending = pendingScores.get(match.id);
              const existing = playerPredictions.get(match.id);
              const homeVal = pending?.[0] ?? existing?.[0] ?? 0;
              const awayVal = pending?.[1] ?? existing?.[1] ?? 0;

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
            onClick={handleSaveOverride}
            disabled={isSaving}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 disabled:opacity-50"
            data-testid="admin-predictions-save-btn"
          >
            {isSaving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSaving ? 'Saving...' : 'Save Override'}
          </button>
        </>
      ) : (
        <div
          className="glass-card rounded-lg p-8 text-center text-gray-600"
          data-testid="admin-predictions-empty"
        >
          No matches found for phase {selectedPhase}.
        </div>
      )}
    </div>
  );
}
