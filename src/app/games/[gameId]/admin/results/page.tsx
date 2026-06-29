'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import { useEffect, useState } from 'react';
import MatchCard from '@/components/MatchCard';
import { getHighestOpenUnlockedPhase } from '@/lib/phase-utils';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];
const PHASE_LABELS: Record<PhaseKey, string> = {
  LEAGUE: 'LEAGUE',
  R16: 'R16',
  R8: 'R8',
  R4: 'R4',
  R2: 'R2',
  FINAL: 'FINAL',
};
type ResultFilter = 'ALL' | 'PENDING' | 'ENTERED';

export default function ResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getIsCreator, saveResults, lockPhase, blockMatches } = useGameStore();
  const [results, setResults] = useState<Record<string, [number, number]>>({});
  const [checkedMatches, setCheckedMatches] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [blockedSaved, setBlockedSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');
  const [teamSearch, setTeamSearch] = useState('');

  const game = getGame(gameId);

  if (!game || !getIsCreator(gameId)) {
    return (
      <div className="text-red-600" data-testid="results-access-denied">
        Access denied. Only the game creator can enter results.
      </div>
    );
  }

  const selectedPhaseData = game.phases.find((p) => p.phaseKey === selectedPhase);
  const highestOpenPhase = getHighestOpenUnlockedPhase(game.phases);

  useEffect(() => {
    // When a new phase opens, follow it automatically if current selection is already locked.
    if (highestOpenPhase && selectedPhaseData?.isLocked && selectedPhase !== highestOpenPhase) {
      setSelectedPhase(highestOpenPhase);
      setResults({});
      setCheckedMatches(new Set());
      setBlockedSaved(false);
    }
  }, [highestOpenPhase, selectedPhase, selectedPhaseData?.isLocked]);

  const matchesForPhase = game.matches
    .filter((m) => m.phaseKey === selectedPhase)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const searchTerm = teamSearch.trim().toLowerCase();
  const visibleMatches = matchesForPhase.filter((m) => {
    const passesResultFilter =
      resultFilter === 'ALL'
        ? true
        : resultFilter === 'PENDING'
          ? !m.resultEntered
          : m.resultEntered;

    const passesSearch =
      !searchTerm
      || m.homeTeam.toLowerCase().includes(searchTerm)
      || m.awayTeam.toLowerCase().includes(searchTerm);

    return passesResultFilter && passesSearch;
  });

  const handleScoreChange = (matchId: string, home: number, away: number) => {
    setResults((prev) => ({
      ...prev,
      [matchId]: [home, away],
    }));
  };

  const handleCheckMatch = (matchId: string, isChecked: boolean) => {
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

  const handleSubmit = async () => {
    setError(null);
    if (Object.keys(results).length === 0) {
      setError('No results entered. Please fill in at least one score.');
      return;
    }
    setIsSaving(true);
    try {
      const formattedResults = Object.entries(results).map(([matchId, [home, away]]) => ({
        matchId,
        homeGoals: home,
        awayGoals: away,
      }));
      await saveResults(gameId, selectedPhase, formattedResults);
      setSaved(true);
      setResults({});
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save results');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockPredictions = async () => {
    setError(null);
    setIsLocking(true);
    try {
      await lockPhase(gameId, selectedPhase);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock predictions for this phase');
    } finally {
      setIsLocking(false);
    }
  };

  const handleBlockCheckedMatches = async () => {
    setError(null);
    if (checkedMatches.size === 0) {
      setError('Select at least one match to block.');
      return;
    }

    setIsBlocking(true);
    try {
      const matchIds = Array.from(checkedMatches);
      await blockMatches(gameId, matchIds);
      setCheckedMatches(new Set());
      setBlockedSaved(true);
      setTimeout(() => setBlockedSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to block selected matches');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="results-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enter Match Results</h1>
        <p className="mt-2 text-gray-600">Input final scores for all matches in this phase</p>
      </div>

      <div className="glass-card rounded-xl p-4" data-testid="results-round-search-controls">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="results-round-select" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Round
            </label>
            <select
              id="results-round-select"
              value={selectedPhase}
              onChange={(e) => {
                const nextPhase = e.target.value as PhaseKey;
                setSelectedPhase(nextPhase);
                setResults({});
                setCheckedMatches(new Set());
                setBlockedSaved(false);
              }}
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-gray-900"
              data-testid="results-round-select"
            >
              {PHASE_OPTIONS.map((phase) => (
                <option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="results-team-search" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Search Team
            </label>
            <input
              id="results-team-search"
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Type home or away team name"
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-gray-900"
              data-testid="results-team-search"
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4" data-testid="results-phase-controls">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" data-testid="results-filter-controls">
            {(['ALL', 'PENDING', 'ENTERED'] as ResultFilter[]).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setResultFilter(filterKey)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  resultFilter === filterKey
                    ? 'bg-orange-500 text-white'
                    : 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
                }`}
                data-testid={`results-filter-${filterKey}`}
              >
                {filterKey === 'ALL' ? 'All Matches' : filterKey === 'PENDING' ? 'Pending' : 'Entered'}
              </button>
            ))}
          </div>

          <button
            onClick={handleLockPredictions}
            disabled={Boolean(selectedPhaseData?.isLocked) || isLocking}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="results-lock-phase-btn"
          >
            {selectedPhaseData?.isLocked ? 'Predictions Locked' : isLocking ? 'Locking...' : `Lock ${PHASE_LABELS[selectedPhase]} Predictions`}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" data-testid="results-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="results-saved">
          Results saved successfully!
        </div>
      )}

      {blockedSaved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700" data-testid="results-blocked-saved">
          Selected matches are now blocked for predictions.
        </div>
      )}

      <div className="space-y-4" data-testid="results-match-list">
        {visibleMatches.map((match) => {
          const pending = results[match.id];
          return (
            <div key={match.id} className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-orange-800">
                  <input
                    type="checkbox"
                    checked={checkedMatches.has(match.id)}
                    onChange={(e) => handleCheckMatch(match.id, e.target.checked)}
                    className="h-4 w-4 accent-orange-500"
                    data-testid={`results-block-checkbox-${match.id}`}
                  />
                  Select to block
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    match.predictionsLocked
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                  data-testid={`results-match-lock-status-${match.id}`}
                >
                  {match.predictionsLocked ? 'Blocked' : 'Open for predictions'}
                </span>
              </div>

              <MatchCard
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
                homeGoalsPredicted={pending?.[0] ?? match.homeGoals ?? undefined}
                awayGoalsPredicted={pending?.[1] ?? match.awayGoals ?? undefined}
              />
            </div>
          );
        })}
        {visibleMatches.length === 0 && (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-gray-600" data-testid="results-empty">
            No matches found for this round/filter/search.
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={Object.keys(results).length === 0 || isSaving}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 disabled:opacity-50"
        data-testid="results-submit-btn"
      >
        {isSaving && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isSaving ? 'Saving...' : 'Save Results'}
      </button>

      <button
        onClick={handleBlockCheckedMatches}
        disabled={checkedMatches.size === 0 || isBlocking}
        className="w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="results-block-checked-btn"
      >
        {isBlocking ? 'Blocking...' : `Block Selected Matches (${checkedMatches.size})`}
      </button>
    </div>
  );
}
