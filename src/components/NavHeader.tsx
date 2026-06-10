'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function NavHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white" data-testid="nav-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Home Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-orange-500 hover:text-orange-600"
              data-testid="nav-home-link"
            >
              <span className="text-2xl">🏆</span>
              <span className="hidden sm:inline">World Cup 2026</span>
            </Link>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex sm:items-center sm:gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-orange-600"
                data-testid="nav-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/dashboard/create-game"
                className="inline-flex items-center rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                data-testid="nav-create-game-btn"
              >
                Create Game
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
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
            <div className="space-y-3">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="nav-mobile-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="nav-mobile-join-link"
              >
                Join Game
              </Link>
              <Link
                href="/dashboard/create-game"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
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
