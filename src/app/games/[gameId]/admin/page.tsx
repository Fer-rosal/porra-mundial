'use client';

import { use } from 'react';
import { useGameStore, type PhaseKey } from '@/lib/game-store';
import AdminControls from '@/components/AdminControls';
import Link from 'next/link';
import { useState } from 'react';

const PHASE_OPTIONS: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL'];

export default function AdminPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, openPhase, lockPhase } = useGameStore();
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey>('LEAGUE');

  const game = getGame(gameId);
  const mySession = getMySession(gameId);

  if (!game || !mySession || mySession.sessionId !== game.creatorSessionId) {
    return (
      <div className="text-red-600" data-testid="admin-access-denied">
        Access denied. Only the game creator can access the admin panel.
      </div>
    );
  }

  const selectedPhaseData = game.phases.find((p) => p.phaseKey === selectedPhase);

  return (
    <div className="space-y-8" data-testid="admin-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">Manage game phases and results</p>
      </div>

      {/* Phase selector */}
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Phase</h2>
        <div className="flex flex-wrap gap-2">
          {PHASE_OPTIONS.map((phase) => {
            const phaseData = game.phases.find((p) => p.phaseKey === phase);
            return (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
        onOpen={async () => { openPhase(gameId, selectedPhase); }}
        onLock={async () => { lockPhase(gameId, selectedPhase); }}
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/games/${gameId}/admin/results`}
          className="rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-enter-results-card"
        >
          <h3 className="text-lg font-semibold text-gray-900">Enter Results</h3>
          <p className="mt-1 text-gray-600">Input match results</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/scorer-points`}
          className="rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-scorer-points-card"
        >
          <h3 className="text-lg font-semibold text-gray-900">Scorer Points</h3>
          <p className="mt-1 text-gray-600">Award goalscorer points</p>
        </Link>

        <Link
          href={`/games/${gameId}/admin/history`}
          className="rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          data-testid="admin-history-card"
        >
          <h3 className="text-lg font-semibold text-gray-900">History</h3>
          <p className="mt-1 text-gray-600">View all predictions and results</p>
        </Link>
      </div>
    </div>
  );
}
