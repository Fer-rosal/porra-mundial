'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState } from 'react';
import { supabaseWithSession } from '@/lib/supabase';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];
const PHASE_LABELS: Record<PhaseKey, string> = {
  LEAGUE: 'LEAGUE',
  R16: 'R16',
  R8: 'R8',
  R4: 'R4',
  R2: 'R2',
  FINAL: 'FINAL',
};

export default function ScorerPointsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getIsCreator, fetchGame } = useGameStore();
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');
  const [goalsBySelection, setGoalsBySelection] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [awardingWinnerId, setAwardingWinnerId] = useState<string | null>(null);

  const game = getGame(gameId);

  if (!game || !getIsCreator(gameId)) {
    return (
      <div className="text-red-600" data-testid="scorer-points-access-denied">
        Access denied. Only the game creator can award scorer points.
      </div>
    );
  }

  // Get scorer selections for the selected phase
  const selectionsForPhase = game.scorerSelections.filter(
    (s) => s.phaseKey === selectedPhase
  );

  // Find player name by sessionId
  const playerById = Object.fromEntries(game.players.map((p) => [p.sessionId, p.name]));
  const winnerPicks = game.winnerPicks ?? [];

  const resolveGoalsScored = (selectionId: string): number => {
    const raw = goalsBySelection[selectionId];
    if (raw === undefined) {
      const existing = selectionsForPhase.find((s) => s.id === selectionId);
      return existing?.goalsScored ?? 0;
    }
    return Math.max(0, raw);
  };

  // Lock scorer selection and persist goals scored (1 point per goal)
  const handleLockScorer = async (selectionId: string) => {
    setError(null);
    setLockingId(selectionId);
    try {
      const creatorKey = `porra_mundial_creator_${gameId}`;
      const creatorSessionId =
        typeof window !== 'undefined' ? localStorage.getItem(creatorKey) ?? '' : '';
      const client = supabaseWithSession(creatorSessionId);

      const goalsScored = resolveGoalsScored(selectionId);

      const { error: updateErr } = await client
        .from('scorer_selections')
        .update({
          is_locked: true,
          goals_scored: goalsScored,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectionId);

      if (updateErr) {
        setError('Failed to save scorer goals. Please try again.');
        return;
      }

      // Refresh game cache
      await fetchGame(gameId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save scorer goals. Please try again.');
    } finally {
      setLockingId(null);
    }
  };

  const handleGoalsChange = (selectionId: string, nextValue: string) => {
    const parsed = Number.parseInt(nextValue, 10);
    setGoalsBySelection((prev) => ({
      ...prev,
      [selectionId]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  };

  const handleAwardWinnerBonus = async (winnerPickId: string) => {
    setError(null);
    setAwardingWinnerId(winnerPickId);
    try {
      const creatorKey = `porra_mundial_creator_${gameId}`;
      const creatorSessionId =
        typeof window !== 'undefined' ? localStorage.getItem(creatorKey) ?? '' : '';
      const client = supabaseWithSession(creatorSessionId);

      const { error: updateErr } = await client
        .from('winner_picks')
        .update({
          is_locked: true,
          awarded_points: 20,
          updated_at: new Date().toISOString(),
        })
        .eq('id', winnerPickId);

      if (updateErr) {
        setError('Failed to award winner bonus. Please try again.');
        return;
      }

      await fetchGame(gameId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to award winner bonus. Please try again.');
    } finally {
      setAwardingWinnerId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl" data-testid="scorer-points-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Award Scorer Points</h1>
        <p className="mt-2 text-gray-600">
          Enter goals scored and lock each selection. Players receive 1 point per goal.
        </p>
      </div>

      {/* Phase selector */}
      <div className="flex flex-wrap gap-2">
        {PHASE_OPTIONS.map((phase) => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPhase === phase
                ? 'bg-orange-500 text-white'
                : 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
            }`}
            data-testid={`scorer-points-phase-${phase}`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-points-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="scorer-points-saved">
          Scorer goals saved!
        </div>
      )}

      {selectionsForPhase.length === 0 ? (
        <div
          className="glass-card rounded-lg p-8 text-center text-gray-600"
          data-testid="scorer-points-empty"
        >
          No scorer selections for {PHASE_LABELS[selectedPhase]} yet.
        </div>
      ) : (
        <div className="space-y-3" data-testid="scorer-points-list">
          {selectionsForPhase.map((sel) => (
            <div
              key={sel.id}
              className="glass-card flex items-center justify-between rounded-lg p-4"
              data-testid={`scorer-selection-${sel.id}`}
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {playerById[sel.sessionId] || 'Unknown Player'}
                </p>
                <p className="text-sm text-gray-600">Selected: {sel.playerName}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Goals</span>
                  <input
                    type="number"
                    min={0}
                    value={goalsBySelection[sel.id] ?? sel.goalsScored}
                    onChange={(e) => handleGoalsChange(sel.id, e.target.value)}
                    className="w-20 rounded-lg border border-orange-200 bg-white px-2 py-1 text-sm text-gray-900"
                    data-testid={`scorer-goals-${sel.id}`}
                  />
                </label>
                {sel.isLocked && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800" data-testid={`scorer-awarded-${sel.id}`}>
                    Locked: {sel.goalsScored} pts
                  </span>
                )}
                <button
                  onClick={() => handleLockScorer(sel.id)}
                  disabled={lockingId === sel.id}
                  className="rounded-lg bg-green-500 px-3 py-1 text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                  data-testid={`scorer-award-${sel.id}`}
                >
                  {lockingId === sel.id && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {sel.isLocked ? 'Update Points' : 'Lock Points'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-lg p-5" data-testid="winner-bonus-admin-card">
        <h2 className="text-lg font-semibold text-gray-900">Tournament Winner Bonus (+20)</h2>
        <p className="mt-1 text-sm text-gray-600">Award +20 to players who picked the champion correctly.</p>

        {winnerPicks.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600" data-testid="winner-bonus-empty">No winner picks submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3" data-testid="winner-bonus-list">
            {winnerPicks.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">{playerById[pick.sessionId] || 'Unknown Player'}</p>
                  <p className="text-sm text-gray-600">Picked: {pick.teamName}</p>
                </div>
                <div className="flex items-center gap-3">
                  {pick.isLocked && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800" data-testid={`winner-bonus-awarded-${pick.id}`}>
                      Awarded +{pick.awardedPoints || 10}
                    </span>
                  )}
                  <button
                    onClick={() => handleAwardWinnerBonus(pick.id)}
                    disabled={awardingWinnerId === pick.id}
                    className="rounded-lg bg-green-500 px-3 py-1 text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-50"
                    data-testid={`winner-bonus-award-${pick.id}`}
                  >
                    {awardingWinnerId === pick.id
                      ? 'Saving...'
                      : pick.isLocked
                        ? 'Update Bonus'
                        : 'Award +20'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
