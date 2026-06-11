'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen" data-testid="landing-page">
      <div className="page-shell sm:px-6 lg:px-8">
        <div className="page-hero mb-12 text-center">
          <div className="mb-5 text-6xl">🏆</div>
          <h1 className="mb-2 text-4xl font-extrabold text-gray-900 sm:text-5xl">World Cup 2026</h1>
          <p className="mb-4 text-xl font-semibold text-orange-700">Betting Hub</p>
          <p className="mx-auto max-w-2xl text-gray-600">
            Predict match results, select goalscorers, and compete with your friends during the FIFA World Cup 2026.
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-4xl rounded-2xl border border-orange-100 bg-white/70 p-4 shadow-[0_18px_45px_rgba(194,65,12,0.1)] backdrop-blur sm:p-6">
          <div className="grid gap-6 sm:grid-cols-2">
          {/* Create Game Card */}
          <Link
            href="/dashboard/create-game"
            className="glass-card fade-in group p-6"
            data-testid="landing-create-game-card"
          >
            <div className="mb-4 text-4xl">➕</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-orange-700">Create Game</h2>
            <p className="text-gray-600">Start a new tournament with your friends</p>
          </Link>

          {/* Join Game Card */}
          <Link
            href="/join"
            className="glass-card fade-in group p-6"
            data-testid="landing-join-game-card"
          >
            <div className="mb-4 text-4xl">🔗</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-orange-700">Join Game</h2>
            <p className="text-gray-600">Join an existing game with an invite code</p>
          </Link>

          {/* Dashboard Card */}
          <Link
            href="/dashboard"
            className="glass-card fade-in group p-6 sm:col-span-2"
            data-testid="landing-dashboard-card"
          >
            <div className="mb-4 text-4xl">📊</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-orange-700">My Games</h2>
            <p className="text-gray-600">View all your active and past games</p>
          </Link>
          </div>
        </div>

        <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 text-sm text-orange-800">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold">Fast Invite Links</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold">Cross-Device Recovery</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold">Live Ranking</span>
        </div>
      </div>
    </div>
  );
}
