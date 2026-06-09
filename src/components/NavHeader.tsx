'use client';

import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function NavHeader() {
  const { user, isLoading } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
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

          {/* Right nav: User / Auth */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden sm:flex sm:items-center sm:gap-4">
                <span className="text-sm text-gray-700" data-testid="nav-user-name">
                  {user.name || user.email}
                </span>
                <Link
                  href="/api/auth/logout"
                  className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  data-testid="nav-logout-btn"
                >
                  <LogOut size={16} />
                  Log out
                </Link>
              </div>
            ) : (
              <Link
                href="/api/auth/login"
                className="inline-flex items-center rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                data-testid="nav-login-btn"
              >
                Log in
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
              data-testid="nav-mobile-menu-btn"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="border-t border-gray-200 py-4 sm:hidden">
            <div className="space-y-4">
              <div className="text-sm text-gray-700">{user.name || user.email}</div>
              <Link
                href="/api/auth/logout"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                data-testid="nav-mobile-logout-btn"
              >
                <LogOut size={16} />
                Log out
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
