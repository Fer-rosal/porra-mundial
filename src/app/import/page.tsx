'use client';

import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/game-store';
import { useState } from 'react';
import Link from 'next/link';

export default function ImportPage() {
  const router = useRouter();
  const { importGame } = useGameStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importedGameId, setImportedGameId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Paste your export code first.');
      return;
    }
    setIsImporting(true);
    try {
      const result = await importGame(trimmed);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setImportedGameId(result.game.id);
    } finally {
      setIsImporting(false);
    }
  };

  if (importedGameId) {
    return (
      <div className="min-h-screen bg-white" data-testid="import-page">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center" data-testid="import-success">
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-2 text-2xl font-bold text-green-900">Game Imported!</h1>
            <p className="mb-6 text-green-700">Your game data has been loaded into this browser.</p>
            <Link
              href={`/games/${importedGameId}`}
              className="inline-block rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
              data-testid="import-go-to-game-btn"
            >
              Go to Game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="import-page">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Game</h1>
          <p className="mt-2 text-gray-600">
            Paste the export code from another browser to load a game here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="import-form">
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
              data-testid="import-error"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="importCode" className="block text-sm font-medium text-gray-900">
              Export Code *
            </label>
            <textarea
              id="importCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the export code here…"
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              data-testid="import-code-input"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isImporting}
              className="flex-1 rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="import-submit-btn"
            >
              {isImporting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isImporting ? 'Importing...' : 'Import Game'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50"
              data-testid="import-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
