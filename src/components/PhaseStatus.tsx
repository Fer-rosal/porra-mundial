'use client';

import { DbTournamentPhase } from '@/lib/types';

interface PhaseStatusProps {
  phase: DbTournamentPhase;
}

export default function PhaseStatus({ phase }: PhaseStatusProps) {
  let statusColor = 'gray';
  let statusText = 'Not started';

  if (phase.is_locked) {
    statusColor = 'red';
    statusText = 'Locked';
  } else if (phase.is_open) {
    statusColor = 'green';
    statusText = 'Open';
  } else if (phase.locked_at) {
    statusColor = 'blue';
    statusText = 'Completed';
  }

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colorClasses[statusColor]}`}
      data-testid="phase-status"
    >
      {statusText}
    </span>
  );
}
