'use client';

import { use } from 'react';
import { useGameStore } from '@/lib/game-store';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function GameOverviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { getGame, getMySession, exportGame } = useGameStore();
  const [codeCopied, setCodeCopied] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exportCopied, setExportCopied] = useState(false);

  const game = getGame(gameId);
  const mySession = getMySession(gameId);
  const isAdmin = !!(game && mySession && game.creatorSessionId === mySession.sessionId);

  if (!game) {
    return (
      <div className="text-red-600" data-testid="game-overview-not-found">
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

  const handleExport = () => {
    try {
      const code = exportGame(gameId);
      setExportCode(code);
    } catch {
      // game not found — shouldn't happen here
    }
  };

  const copyExportCode = async () => {
    if (!exportCode) return;
    await navigator.clipboard.writeText(exportCode);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // Find currently open phase
  const openPhase = game.phases.find((p) => p.isOpen && !p.isLocked);
  const currentPhaseLabel = openPhase ? openPhase.phaseKey : 'No active phase';

  return (
    <div className="space-y-8" data-testid="game-overview-page">
      {/* Game status */}
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Game Status</h2>
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
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm" data-testid="game-invite-section">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Invite Players</h2>
        <p className="mb-4 text-gray-600">
          Share this code with players to let them join the game:
        </p>
        <div className="mb-3 rounded-lg bg-gray-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-gray-900">
          {game.inviteCode}
        </div>
        <button
          onClick={copyInviteCode}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
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
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Players</h2>
        {game.players.length === 0 ? (
          <p className="text-gray-600" data-testid="game-players-empty">No players yet</p>
        ) : (
          <ul className="space-y-2" data-testid="game-players-list">
            {game.players.map((player) => (
              <li
                key={player.sessionId}
                className="flex items-center gap-2 rounded-lg border border-gray-100 px-4 py-2"
                data-testid={`game-player-${player.sessionId}`}
              >
                <span className="text-gray-900">{player.name}</span>
                {player.sessionId === game.creatorSessionId && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Creator
                  </span>
                )}
                {mySession && player.sessionId === mySession.sessionId && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
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
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <h2 className="mb-2 text-lg font-bold text-orange-900">Creator Controls</h2>
          <p className="mb-4 text-orange-700">Open phases, lock predictions, and enter results.</p>
          <Link
            href={`/games/${gameId}/admin`}
            className="inline-block rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600"
            data-testid="game-overview-admin-link"
          >
            Go to Admin Panel
          </Link>
        </div>
      )}

      {/* Export section */}
      <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Take Game to Another Browser</h2>
        <p className="mb-4 text-sm text-gray-600">
          Export your game data so you (or another player) can load it in a different browser.
        </p>
        {!exportCode ? (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white hover:bg-gray-900"
            data-testid="game-export-btn"
          >
            <Download size={16} />
            Generate Export Code
          </button>
        ) : (
          <div className="space-y-3" data-testid="game-export-section">
            <textarea
              readOnly
              value={exportCode}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
              data-testid="game-export-code"
            />
            <div className="flex gap-2">
              <button
                onClick={copyExportCode}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
                data-testid="game-export-copy-btn"
              >
                {exportCopied ? <><Check size={16} />Copied!</> : <><Copy size={16} />Copy Code</>}
              </button>
              <button
                onClick={() => setExportCode(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                data-testid="game-export-close-btn"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-500">
              On the other browser, go to <strong>/import</strong> and paste this code.
            </p>
          </div>
        )}
      </div>

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
