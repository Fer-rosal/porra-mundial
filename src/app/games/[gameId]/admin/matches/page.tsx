'use client';

import { use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useState, useEffect } from 'react';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];
const PHASE_LABELS: Record<PhaseKey, string> = {
  LEAGUE: 'LEAGUE',
  R16: 'R32',
  R8: 'R8',
  R4: 'R4',
  R2: 'R2',
  FINAL: 'FINAL',
};

interface MatchEdit {
  matchId: string
  homeTeam: string
  awayTeam: string
  scheduledAt: string
  matchNumber: number
}

export default function AdminMatchesPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getGame, getIsCreator, savePhaseMatches } = useGameStore();

  const phaseParam = (searchParams?.get('phase') ?? 'R16') as PhaseKey;
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>(phaseParam);
  const [edits, setEdits] = useState<Record<string, { home: string; away: string }>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const game = getGame(gameId);

  // Reset edits when phase changes
  useEffect(() => {
    setEdits({});
    setSaved(false);
  }, [selectedPhase]);

  if (!game || !getIsCreator(gameId)) {
    return (
      <div className="text-red-600" data-testid="admin-matches-access-denied">
        Access denied. Only the game creator can manage matches.
      </div>
    );
  }

  const phaseMatches: MatchEdit[] = game.matches
    .filter((m) => m.phaseKey === selectedPhase)
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((m) => ({
      matchId: m.id,
      homeTeam: edits[m.id]?.home ?? m.homeTeam,
      awayTeam: edits[m.id]?.away ?? m.awayTeam,
      scheduledAt: m.scheduledAt,
      matchNumber: m.matchNumber,
    }));

  const handleChange = (matchId: string, side: 'home' | 'away', value: string) => {
    setEdits((prev) => ({
      ...prev,
      [matchId]: {
        home: side === 'home' ? value : (prev[matchId]?.home ?? phaseMatches.find(m => m.matchId === matchId)?.homeTeam ?? ''),
        away: side === 'away' ? value : (prev[matchId]?.away ?? phaseMatches.find(m => m.matchId === matchId)?.awayTeam ?? ''),
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Single atomic write for all matches in the phase so teamsConfirmed is set for every match
      await savePhaseMatches(
        gameId,
        phaseMatches.map((m) => ({
          matchId: m.matchId,
          homeTeam: edits[m.matchId]?.home ?? m.homeTeam,
          awayTeam: edits[m.matchId]?.away ?? m.awayTeam,
        }))
      );
      setEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="admin-matches-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Matches</h1>
        <p className="mt-2 text-gray-600">Edit team names for each phase when the bracket is set.</p>
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
            data-testid={`admin-matches-phase-${phase}`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {saved && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
          data-testid="admin-matches-saved"
        >
          Match teams updated successfully.
        </div>
      )}

      {/* Match list */}
      <div className="space-y-3" data-testid="admin-matches-list">
        {phaseMatches.map((m) => (
          <div
            key={m.matchId}
            className="glass-card rounded-lg p-4"
            data-testid={`admin-match-row-${m.matchId}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500">
                Match {m.matchNumber}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(m.scheduledAt).toLocaleDateString()} {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={edits[m.matchId]?.home ?? m.homeTeam}
                onChange={(e) => handleChange(m.matchId, 'home', e.target.value)}
                placeholder="Home team"
                className="input-field flex-1 px-3 py-1.5 text-sm text-gray-900"
                data-testid={`admin-match-${m.matchId}-home`}
              />
              <span className="font-bold text-gray-400">vs</span>
              <input
                type="text"
                value={edits[m.matchId]?.away ?? m.awayTeam}
                onChange={(e) => handleChange(m.matchId, 'away', e.target.value)}
                placeholder="Away team"
                className="input-field flex-1 px-3 py-1.5 text-sm text-gray-900"
                data-testid={`admin-match-${m.matchId}-away`}
              />
            </div>
          </div>
        ))}
        {phaseMatches.length === 0 && (
          <p className="text-gray-500">No matches found for this phase.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 rounded-lg px-6 py-2 disabled:opacity-50"
          data-testid="admin-matches-save-btn"
        >
          {isSaving && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isSaving ? 'Saving...' : 'Confirm Teams'}
        </button>
        <button
          onClick={() => router.back()}
          className="btn-secondary rounded-lg px-6 py-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}
