'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState } from 'react';

export default function ScorerPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, saveScorerSelection, saveWinnerPick } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [winnerTeamName, setWinnerTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [winnerSaved, setWinnerSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWinner, setIsSavingWinner] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  if (!mySession) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800" data-testid="scorer-no-session">
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

  const existingWinnerPick = (game.winnerPicks ?? []).find((w) => w.sessionId === mySession.sessionId) ?? null;
  const winnerPickClosed = game.matches.some((m) => m.predictionsLocked || m.resultEntered);

  const handleWinnerPickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!winnerTeamName.trim()) {
      setError('Winning team is required');
      return;
    }

    setIsSavingWinner(true);
    try {
      await saveWinnerPick(gameId, winnerTeamName.trim());
      setWinnerSaved(true);
      setWinnerTeamName('');
      setTimeout(() => setWinnerSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save winner pick');
    } finally {
      setIsSavingWinner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSaving(true);
    try {
      await saveScorerSelection(gameId, phaseKey, playerName.trim());
      setSaved(true);
      setPlayerName('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save scorer selection');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="scorer-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Select a Goalscorer</h1>
        <p className="mt-1 text-gray-600">Pick one player who will score in this phase</p>
      </div>

      {!openPhase && (
        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-600"
          data-testid="scorer-no-phase"
        >
          No active phase. Waiting for the game creator to open a phase.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" data-testid="scorer-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700" data-testid="scorer-saved">
          Scorer selection saved!
        </div>
      )}

      {winnerSaved && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700" data-testid="winner-pick-saved">
          Winner pick saved!
        </div>
      )}

      <div className="glass-card rounded-xl p-5" data-testid="winner-pick-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tournament Winner Pick (+10 bonus)</p>
        {existingWinnerPick ? (
          <>
            <p className="mt-2 text-2xl font-bold text-gray-900">{existingWinnerPick.teamName}</p>
            <p className="mt-2 text-sm text-gray-500">Your winner pick is locked and cannot be changed.</p>
            {existingWinnerPick.isLocked && (
              <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Bonus Awarded: +{existingWinnerPick.awardedPoints || 10}
              </span>
            )}
          </>
        ) : winnerPickClosed ? (
          <p className="mt-2 text-sm text-gray-600">Winner picks are closed after the first match is blocked or has a result.</p>
        ) : (
          <form onSubmit={handleWinnerPickSubmit} className="mt-3 space-y-3" data-testid="winner-pick-form">
            <input
              type="text"
              value={winnerTeamName}
              onChange={(e) => setWinnerTeamName(e.target.value)}
              placeholder="e.g., Argentina"
              className="input-field w-full px-4 py-2 text-gray-900"
              data-testid="winner-pick-input"
            />
            <button
              type="submit"
              disabled={isSavingWinner}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="winner-pick-submit-btn"
            >
              {isSavingWinner && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isSavingWinner ? 'Saving...' : 'Confirm Winner Pick'}
            </button>
          </form>
        )}
      </div>

      {existingSelection ? (
        <div
          className="glass-card rounded-xl p-5"
          data-testid="scorer-locked"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Your scorer for {phaseKey}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{existingSelection.playerName}</p>
          <p className="mt-3 text-sm text-gray-500">
            Your selection is locked and cannot be changed.
          </p>
          {existingSelection.isLocked && (
            <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Point Awarded
            </span>
          )}
        </div>
      ) : (
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
              className="input-field mt-1 px-4 py-2 text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="scorer-name-input"
            />
          </div>

          <button
            type="submit"
            disabled={!openPhase || isSaving}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="scorer-submit-btn"
          >
            {isSaving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSaving ? 'Saving...' : 'Confirm Selection'}
          </button>
        </form>
      )}
    </div>
  );
}
