'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function NavHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm" data-testid="nav-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Home Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-orange-500 hover:text-orange-600 transition-colors duration-150"
              data-testid="nav-home-link"
            >
              <span className="text-2xl">🏆</span>
              <span className="hidden sm:inline text-lg">World Cup 2026</span>
            </Link>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex sm:items-center sm:gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1"
                data-testid="nav-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/dashboard/create-game"
                className="inline-flex items-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 active:scale-95 transition-all duration-150"
                data-testid="nav-create-game-btn"
              >
                Create Game
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 sm:hidden focus:outline-none focus:ring-2 focus:ring-orange-300 active:scale-95 transition-all"
              data-testid="nav-mobile-menu-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 py-4 sm:hidden">
            <div className="space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-600 transition-colors"
                data-testid="nav-mobile-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-600 transition-colors"
                data-testid="nav-mobile-join-link"
              >
                Join Game
              </Link>
              <Link
                href="/dashboard/create-game"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors text-center"
                data-testid="nav-mobile-create-btn"
              >
                Create Game
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
