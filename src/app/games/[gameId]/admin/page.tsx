'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getGame, openPhase, lockPhase } from '@/lib/api';
import AdminControls from '@/components/AdminControls';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(gameId),
    enabled: !!user,
  });

  const [selectedPhase, setSelectedPhase] = useState<string>('LEAGUE');

  const openMutation = useMutation({
    mutationFn: () => openPhase(gameId, selectedPhase),
  });

  const lockMutation = useMutation({
    mutationFn: () => lockPhase(gameId, selectedPhase),
  });

  if (isLoading) return <div className="text-gray-600">Loading...</div>;
  if (!game || user?.sub !== game.admin_id) return <div className="text-red-600">Access denied</div>;

  return (
    <div className="space-y-8" data-testid="admin-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">Manage game phases and results</p>
      </div>

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

      <AdminControls
        gameId={gameId}
        phaseKey={selectedPhase}
        isOpen={false}
        isLocked={false}
        onOpen={() => openMutation.mutateAsync()}
        onLock={() => lockMutation.mutateAsync()}
      />
    </div>
  );
}
