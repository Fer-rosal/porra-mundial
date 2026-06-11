'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore, type PhaseKey, persistCreatorSessionId } from '@/lib/game-store';
import AdminControls from '@/components/AdminControls';
import CopyRecoveryLink from '@/components/CopyRecoveryLink';
import { buildAdminRecoveryLink } from '@/lib/id-utils';
import Link from 'next/link';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];

export default function AdminPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getGame, getIsCreator, openPhase, lockPhase, redeemAdminToken } = useGameStore();
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');
  const [tokenRedeemed, setTokenRedeemed] = useState(false);

  // Token redemption — fires before access-denied guard renders
  useEffect(() => {
    const token = searchParams?.get('token');
    if (!token) return;

    async function tryRedeemToken() {
      const result = await redeemAdminToken(gameId, token!);
      if ('sessionId' in result) {
        persistCreatorSessionId(gameId, result.sessionId);
        setTokenRedeemed(true);
        // Remove token from URL without full reload
        router.replace(`/games/${gameId}/admin`);
      }
    }
    tryRedeemToken();
  }, [gameId, searchParams, redeemAdminToken, router]);

  const game = getGame(gameId);
  const isCreator = getIsCreator(gameId) || tokenRedeemed;

  if (!game || !isCreator) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"
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

  const adminRecoveryLink =
    typeof window !== 'undefined'
      ? buildAdminRecoveryLink(window.location.origin, gameId, game.adminToken)
      : '';

  const selectedPhaseData = game.phases.find((p) => p.phaseKey === selectedPhase);
  const selectedPhaseMatches = game.matches.filter((m) => m.phaseKey === selectedPhase);
  const hasTbdMatches = selectedPhase !== 'LEAGUE' && selectedPhaseMatches.some((m) => !m.teamsConfirmed);

  return (
    <div className="space-y-8" data-testid="admin-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">Manage game phases and results</p>
        {/* Admin Recovery Link */}
        <div className="mt-3" data-testid="admin-recovery-link-section">
          <CopyRecoveryLink
            href={adminRecoveryLink}
            label="Copy Admin Recovery Link"
          />
        </div>
      </div>

      {/* Phase selector */}
      <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Select Phase</h2>
        <div className="flex flex-wrap gap-2">
          {PHASE_OPTIONS.map((phase) => {
            const phaseData = game.phases.find((p) => p.phaseKey === phase);
            return (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 ${
                  selectedPhase === phase
                    ? 'bg-orange-500 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                data-testid={`admin-phase-${phase}`}
              >
                {phase}
                {phaseData?.isLocked && ' 🔒'}
                {phaseData?.isOpen && !phaseData.isLocked && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>

      <AdminControls
        gameId={gameId}
        phaseKey={selectedPhase}
        isOpen={selectedPhaseData?.isOpen ?? false}
        isLocked={selectedPhaseData?.isLocked ?? false}
        onOpen={async () => { await openPhase(gameId, selectedPhase); }}
        onLock={async () => { await lockPhase(gameId, selectedPhase); }}
        hasTbdMatches={hasTbdMatches}
        manageMatchesHref={`/games/${gameId}/admin/matches?phase=${selectedPhase}`}
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/games/${gameId}/admin/results`}
          className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-enter-results-card"
        >
          <h3 className="text-base font-semibold text-gray-900">Enter Results</h3>
          <p className="mt-1 text-gray-600">Input match results</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/scorer-points`}
          className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-scorer-points-card"
        >
          <h3 className="text-base font-semibold text-gray-900">Scorer Points</h3>
          <p className="mt-1 text-gray-600">Award goalscorer points</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/history`}
          className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-history-card"
        >
          <h3 className="text-base font-semibold text-gray-900">History</h3>
          <p className="mt-1 text-gray-600">View all predictions and results</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/matches?phase=${selectedPhase}`}
          className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-manage-matches-card"
        >
          <h3 className="text-base font-semibold text-gray-900">Manage Matches</h3>
          <p className="mt-1 text-gray-600">Edit team names for knockout rounds</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/predictions`}
          className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-edit-predictions-card"
        >
          <h3 className="text-base font-semibold text-gray-900">Edit Predictions</h3>
          <p className="mt-1 text-gray-600">Override any player&apos;s prediction</p>
        </Link>
      </div>
    </div>
  );
}
