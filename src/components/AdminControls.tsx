'use client';

import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface AdminControlsProps {
  gameId: string;
  phaseKey: string;
  isOpen: boolean;
  isLocked: boolean;
  onOpen: () => Promise<void>;
  onLock: () => Promise<void>;
}

export default function AdminControls({
  gameId,
  phaseKey,
  isOpen,
  isLocked,
  onOpen,
  onLock,
}: AdminControlsProps) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'open' | 'lock' | null>(null);

  const handleOpenPhase = async () => {
    setLoading(true);
    try {
      await onOpen();
      setConfirmAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLockPhase = async () => {
    setLoading(true);
    try {
      await onLock();
      setConfirmAction(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-6 bg-gray-50" data-testid="admin-controls">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Phase Controls</h3>

      <div className="mb-4 flex items-center gap-4">
        <span className="inline-block rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800">
          {isOpen && !isLocked ? 'OPEN' : isLocked ? 'LOCKED' : 'CLOSED'}
        </span>
      </div>

      <div className="space-y-2">
        {!isOpen && !isLocked && (
          <button
            onClick={() => setConfirmAction('open')}
            className="w-full flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            disabled={loading}
            data-testid="admin-open-phase-btn"
          >
            <Unlock size={16} />
            Open Phase
          </button>
        )}

        {isOpen && !isLocked && (
          <button
            onClick={() => setConfirmAction('lock')}
            className="w-full flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            disabled={loading}
            data-testid="admin-lock-phase-btn"
          >
            <Lock size={16} />
            Lock Phase
          </button>
        )}

        {isLocked && (
          <div className="rounded-lg bg-yellow-100 p-3 text-yellow-800 text-sm">
            This phase is locked. Players can no longer submit predictions.
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="admin-confirm-modal">
          <div className="max-w-sm rounded-lg bg-white p-6">
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              {confirmAction === 'open' ? 'Open Phase?' : 'Lock Phase?'}
            </h4>
            <p className="mb-6 text-gray-600">
              {confirmAction === 'open'
                ? 'This will allow players to submit predictions for this phase.'
                : 'This will prevent players from submitting or editing predictions for this phase.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
                data-testid="admin-confirm-cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === 'open' ? handleOpenPhase : handleLockPhase}
                disabled={loading}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                data-testid="admin-confirm-action"
              >
                {loading ? 'Loading...' : confirmAction === 'open' ? 'Open' : 'Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
