'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function LandingPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4" data-testid="landing-page">
        <div className="max-w-md text-center">
          <div className="mb-6 text-6xl">🏆</div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">World Cup 2026</h1>
          <p className="mb-6 text-xl text-gray-600">Betting Game</p>
          <p className="mb-8 text-gray-600">
            Predict match results, select goalscorers, and compete with your friends during the FIFA World Cup 2026.
          </p>
          <Link
            href="/api/auth/login"
            className="block w-full rounded-lg bg-orange-500 px-6 py-3 text-center font-semibold text-white hover:bg-orange-600"
            data-testid="landing-login-btn"
          >
            Log in or Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome to World Cup 2026</h1>
          <p className="text-lg text-gray-600">Ready to predict and compete?</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
          {/* Create Game Card */}
          <Link
            href="/dashboard/create-game"
            className="group rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            data-testid="landing-create-game-card"
          >
            <div className="mb-4 text-4xl">➕</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-orange-600">Create Game</h2>
            <p className="text-gray-600">Start a new tournament with your friends</p>
          </Link>

          {/* Join Game Card */}
          <Link
            href="/join"
            className="group rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            data-testid="landing-join-game-card"
          >
            <div className="mb-4 text-4xl">🔗</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-orange-600">Join Game</h2>
            <p className="text-gray-600">Join an existing game with an invite code</p>
          </Link>

          {/* Dashboard Card */}
          <Link
            href="/dashboard"
            className="group rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow sm:col-span-2"
            data-testid="landing-dashboard-card"
          >
            <div className="mb-4 text-4xl">📊</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-orange-600">My Games</h2>
            <p className="text-gray-600">View all your active and past games</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
