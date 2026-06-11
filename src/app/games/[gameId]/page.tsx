'use client';

import { use } from 'react';
import { useGameStore, persistCreatorSessionId } from '@/lib/game-store';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import CopyRecoveryLink from '@/components/CopyRecoveryLink';
import { buildAdminRecoveryLink, buildPlayerRecoveryLink } from '@/lib/id-utils';

export default function GameOverviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, getIsCreator } = useGameStore();
  const [codeCopied, setCodeCopied] = useState(false);
  const [adminReclaimed, setAdminReclaimed] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);
  const isAdmin = getIsCreator(gameId) || adminReclaimed;

  if (!game) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" data-testid="game-overview-not-found">
        Game data not found. It may have been cleared from this browser.
      </div>
    );
  }

  const copyInviteCode = async () => {
    const inviteLink = `${window.location.origin}/join?code=${game.inviteCode}`;
    await navigator.clipboard.writeText(inviteLink);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleReclaimAdmin = () => {
    if (!game) return;
    persistCreatorSessionId(gameId, game.creatorSessionId);
    setAdminReclaimed(true);
  };

  const currentPlayer = mySession
    ? game.players.find((p) => p.sessionId === mySession.sessionId)
    : null;
  const playerRecoveryLink =
    currentPlayer?.playerToken && typeof window !== 'undefined'
      ? buildPlayerRecoveryLink(window.location.origin, gameId, currentPlayer.playerToken)
      : '';
  const adminRecoveryLink =
    isAdmin && typeof window !== 'undefined'
      ? buildAdminRecoveryLink(window.location.origin, gameId, game.adminToken)
      : '';

  // Find currently open phase
  const openPhase = game.phases.find((p) => p.isOpen && !p.isLocked);
  const currentPhaseLabel = openPhase ? openPhase.phaseKey : 'No active phase';

  return (
    <div className="space-y-6" data-testid="game-overview-page">
      {/* Game status */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Game Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
              game.status === 'OPEN'
                ? 'bg-green-100 text-green-800'
                : game.status === 'IN_PROGRESS'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {game.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Players</span>
            <span className="font-semibold text-gray-900">{game.players.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Phase</span>
            <span className="font-semibold text-gray-900">{currentPhaseLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Created</span>
            <span className="font-semibold text-gray-900">
              {new Date(game.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Invite section — visible to all players */}
      <div className="glass-card rounded-xl p-5" data-testid="game-invite-section">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Invite Players</h2>
        <p className="mb-4 text-gray-600">
          Share this code with players to let them join the game:
        </p>
        <div className="invite-code mb-3 rounded-xl px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-gray-900">
          {game.inviteCode}
        </div>
        <button
          onClick={copyInviteCode}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5"
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
              Copy Invite Link
            </>
          )}
        </button>
      </div>

      {/* Players list */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Players</h2>
        {game.players.length === 0 ? (
          <p className="text-gray-600" data-testid="game-players-empty">No players yet</p>
        ) : (
          <ul className="space-y-2" data-testid="game-players-list">
            {game.players.map((player) => (
              <li
                key={player.sessionId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-4 py-2.5"
                data-testid={`game-player-${player.sessionId}`}
              >
                <span className="mr-1 font-medium text-gray-900">{player.name}</span>
                {player.sessionId === game.creatorSessionId && (
                  <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                    Creator
                  </span>
                )}
                {mySession && player.sessionId === mySession.sessionId && (
                  <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {!mySession && (
          <p className="mt-4 text-sm text-gray-500">
            Not in this game?{' '}
            <Link
              href={`/join?code=${game.inviteCode}`}
              className="text-orange-600 hover:underline"
              data-testid="game-join-link"
            >
              Join now
            </Link>
          </p>
        )}
      </div>

      {/* Admin shortcut */}
      {isAdmin && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="mb-2 text-base font-semibold text-orange-900">Creator Controls</h2>
          <p className="mb-4 text-orange-700">Open phases, lock predictions, and enter results.</p>
          <Link
            href={`/games/${gameId}/admin`}
            className="btn-primary inline-block rounded-xl px-6 py-2.5"
            data-testid="game-overview-admin-link"
          >
            Go to Admin Panel
          </Link>
        </div>
      )}

      {/* Reclaim Admin Access — shown when no creator key is present in this browser */}
      {!getIsCreator(gameId) && !adminReclaimed && (
        <div
          className="rounded-xl border border-orange-200 bg-orange-50 p-5"
          data-testid="game-reclaim-admin-card"
        >
          <h2 className="mb-2 text-base font-semibold text-orange-900">Lost Admin Access?</h2>
          <p className="mb-4 text-orange-700">
            If you created this game on this browser, you can reclaim admin access.
          </p>
          <button
            onClick={handleReclaimAdmin}
            className="btn-primary rounded-xl px-6 py-2.5"
            data-testid="game-reclaim-admin-btn"
          >
            Reclaim Admin Access
          </button>
        </div>
      )}

      {/* Recovery links */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Recovery Links</h2>
        <p className="mb-4 text-sm text-gray-600">
          Save your recovery link so you can restore your session from any device.
        </p>
        <div className="space-y-3" data-testid="game-recovery-links-section">
          {playerRecoveryLink ? (
            <CopyRecoveryLink href={playerRecoveryLink} label="Copy your recovery link" />
          ) : (
            <p className="text-sm text-gray-500" data-testid="game-recovery-links-no-player-session">
              Join this game as a player to generate your recovery link.
            </p>
          )}

          {adminRecoveryLink && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="game-admin-recovery-link-section">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-700">Creator access</p>
              <CopyRecoveryLink href={adminRecoveryLink} label="Copy admin recovery link" />
            </div>
          )}
        </div>
      </div>

      {/* Rules section */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">How to Play</h2>
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
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Exact match: 3 points</li>
              <li>Correct outcome only: 1 point</li>
              <li>Correct goalscorer: 1 point</li>
              <li>Final phase multiplier: 3x points</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
