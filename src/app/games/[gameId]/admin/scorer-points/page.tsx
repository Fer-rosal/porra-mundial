'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState } from 'react';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];

export default function ScorerPointsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, games } = useGameStore();
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game || !mySession || mySession.sessionId !== game.creatorSessionId) {
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

  // Lock a scorer selection to award the point
  const handleLockScorer = (selectionId: string) => {
    setError(null);
    try {
      // We mutate via the store's games object — find and update
      const gameData = games[gameId];
      if (!gameData) return;
      const updatedSelections = gameData.scorerSelections.map((s) =>
        s.id === selectionId ? { ...s, isLocked: true } : s
      );
      // Direct write — use a workaround via the store context
      // ARCHITECT_NOTE: The spec defines saveScorerSelection for player use, but admin locking
      // of scorer selections needs a separate action. We write directly to localStorage here
      // as an interim measure since the spec doesn't define lockScorerSelection.
      // Flagging for review.
      const updated = { ...gameData, scorerSelections: updatedSelections };
      const store = JSON.parse(localStorage.getItem('porra_mundial_store') || '{"version":1,"games":{}}')
      store.games[gameId] = updated
      localStorage.setItem('porra_mundial_store', JSON.stringify(store))
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Force re-render by causing a re-read
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to award scorer point');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl" data-testid="scorer-points-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Award Scorer Points</h1>
        <p className="mt-2 text-gray-600">
          Lock a scorer selection to award 1 point to that player for this phase.
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
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            data-testid={`scorer-points-phase-${phase}`}
          >
            {phase}
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
          Scorer point awarded!
        </div>
      )}

      {selectionsForPhase.length === 0 ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600"
          data-testid="scorer-points-empty"
        >
          No scorer selections for {selectedPhase} yet.
        </div>
      ) : (
        <div className="space-y-3" data-testid="scorer-points-list">
          {selectionsForPhase.map((sel) => (
            <div
              key={sel.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              data-testid={`scorer-selection-${sel.id}`}
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {playerById[sel.sessionId] || 'Unknown Player'}
                </p>
                <p className="text-sm text-gray-600">Selected: {sel.playerName}</p>
              </div>
              <div className="flex items-center gap-3">
                {sel.isLocked ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Point Awarded
                  </span>
                ) : (
                  <button
                    onClick={() => handleLockScorer(sel.id)}
                    className="rounded-lg bg-green-500 px-3 py-1 text-sm font-semibold text-white hover:bg-green-600"
                    data-testid={`scorer-award-${sel.id}`}
                  >
                    Award Point
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
