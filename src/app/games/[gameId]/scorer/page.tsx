'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState } from 'react';

export default function ScorerPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, saveScorerSelection } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game) {
    return (
      <div className="text-red-600" data-testid="scorer-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  if (!mySession) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800" data-testid="scorer-no-session">
        You are not in this game. Please join the game first.
      </div>
    );
  }

  const openPhase = game.phases.find((p) => p.isOpen && !p.isLocked);
  const phaseKey = openPhase?.phaseKey as PhaseKey | undefined;

  const existingSelection = phaseKey
    ? game.scorerSelections.find(
        (s) => s.phaseKey === phaseKey && s.sessionId === mySession.sessionId
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phaseKey) {
      setError('No active phase. Wait for the creator to open a phase.');
      return;
    }
    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }

    try {
      saveScorerSelection(gameId, phaseKey, playerName.trim());
      setSaved(true);
      setPlayerName('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save scorer selection');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl" data-testid="scorer-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Select a Goalscorer</h1>
        <p className="mt-2 text-gray-600">Pick one player who will score in this phase</p>
      </div>

      {!openPhase && (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-600"
          data-testid="scorer-no-phase"
        >
          No active phase. Waiting for the game creator to open a phase.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="scorer-saved">
          Scorer selection saved!
        </div>
      )}

      {existingSelection && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4" data-testid="scorer-existing">
          <p className="text-sm font-medium text-orange-900">Current selection for {phaseKey}:</p>
          <p className="mt-1 font-bold text-orange-700">{existingSelection.playerName}</p>
          <p className="mt-1 text-xs text-orange-600">Submit a new name to update your selection.</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="scorer-form"
      >
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-900">
            Player Name *
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Mbappé, Haaland"
            disabled={!openPhase}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
            data-testid="scorer-name-input"
          />
        </div>

        <button
          type="submit"
          disabled={!openPhase}
          className="w-full rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="scorer-submit-btn"
        >
          Confirm Selection
        </button>
      </form>
    </div>
  );
}
