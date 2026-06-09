'use client';

import { use } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useQuery } from '@tanstack/react-query';
import { getGame } from '@/lib/api';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function GameOverviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = useUser();
  const [codeCopied, setCodeCopied] = useState(false);
  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(gameId),
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="text-gray-600">Loading...</div>;
  }

  if (!game) {
    return <div className="text-red-600">Game not found</div>;
  }

  const isAdmin = user?.sub === game.admin_id;

  const copyInviteCode = async () => {
    const inviteLink = `${window.location.origin}/join?code=${game.invite_code}`;
    await navigator.clipboard.writeText(inviteLink);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="space-y-8" data-testid="game-overview-page">
      {/* Game status */}
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Game Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status</span>
            <span className="font-semibold text-gray-900">{game.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Players</span>
            <span className="font-semibold text-gray-900">{game.player_count || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Created</span>
            <span className="font-semibold text-gray-900">
              {new Date(game.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Invite code section (admin only) */}
      {isAdmin && (
        <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Invite Players</h2>
          <p className="mb-4 text-gray-600">
            Share this code with players to let them join the game:
          </p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
              <p className="font-mono text-lg font-semibold tracking-widest text-gray-900">
                {game.invite_code}
              </p>
            </div>
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
              data-testid="game-copy-invite-btn"
            >
              {codeCopied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Rules section */}
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">How to Play</h2>
        <div className="space-y-4 text-gray-600">
          <div>
            <h3 className="font-semibold text-gray-900">Predict Match Results</h3>
            <p>For each match, predict the exact final score.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Select a Goalscorer</h3>
            <p>Choose one player who will score in the phase.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Scoring</h3>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Exact match: 3 points</li>
              <li>Correct goalscorer: 1 point</li>
              <li>Final phase multiplier: 3x points</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
