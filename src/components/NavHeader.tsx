'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function NavHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/85 shadow-[0_8px_24px_rgba(234,88,12,0.08)] backdrop-blur" data-testid="nav-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Home Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-orange-600 transition-colors duration-150 hover:text-orange-700"
              data-testid="nav-home-link"
            >
              <span className="text-2xl">🏆</span>
              <span className="hidden text-lg tracking-tight sm:inline">World Cup 2026</span>
            </Link>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex sm:items-center sm:gap-3">
              <Link
                href="/dashboard"
                className="btn-secondary rounded-lg px-3 py-2 text-sm"
                data-testid="nav-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/dashboard/create-game"
                className="btn-primary inline-flex items-center rounded-xl px-4 py-2 text-sm"
                data-testid="nav-create-game-btn"
              >
                Create Game
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-gray-600 transition-all hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300 active:scale-95 sm:hidden"
              data-testid="nav-mobile-menu-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fade-in border-t border-orange-100 py-4 sm:hidden">
            <div className="space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
                data-testid="nav-mobile-my-games-link"
              >
                My Games
              </Link>
              <Link
                href="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
                data-testid="nav-mobile-join-link"
              >
                Join Game
              </Link>
              <Link
                href="/dashboard/create-game"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary block rounded-xl px-4 py-2.5 text-center text-sm"
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
