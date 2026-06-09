'use client';

import { TournamentPhase } from '@/lib/types';
import { getPhaseName } from '@/lib/scoring';
import Link from 'next/link';

interface PhaseTabProps {
  phases: TournamentPhase[];
  currentPhase: TournamentPhase;
  gameId: string;
  activeTab: string;
}

export default function PhaseTab({ phases, currentPhase, gameId, activeTab }: PhaseTabProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-2 overflow-x-auto px-4" data-testid="phase-tab">
        {phases.map((phase) => (
          <Link
            key={phase}
            href={`/games/${gameId}?phase=${phase}`}
            className={`whitespace-nowrap px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === phase
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            data-testid={`phase-tab-${phase}`}
          >
            {getPhaseName(phase)}
          </Link>
        ))}
      </div>
    </div>
  );
}
