'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Target, Trophy, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GameNavBarProps {
  gameId: string;
  isAdmin: boolean;
}

interface TabDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (id: string) => string;
  adminOnly?: boolean;
}

const GAME_TABS: TabDefinition[] = [
  { key: 'overview',     label: 'Overview',  icon: Home,          href: (id) => `/games/${id}` },
  { key: 'predictions',  label: 'Predict',   icon: ClipboardList, href: (id) => `/games/${id}/predictions` },
  { key: 'scorer',       label: 'Scorer',    icon: Target,        href: (id) => `/games/${id}/scorer` },
  { key: 'leaderboard',  label: 'Ranking',   icon: Trophy,        href: (id) => `/games/${id}/leaderboard` },
  { key: 'admin',        label: 'Admin',     icon: Settings,      href: (id) => `/games/${id}/admin`, adminOnly: true },
];

export default function GameNavBar({ gameId, isAdmin }: GameNavBarProps) {
  const pathname = usePathname();

  const visibleTabs = GAME_TABS.filter((tab) => !tab.adminOnly || isAdmin);

  const isActive = (tab: TabDefinition): boolean => {
    const href = tab.href(gameId);
    if (tab.key === 'overview') {
      // Exact match for overview to avoid prefix matching /games/[id]/predictions etc.
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const colsClass = visibleTabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <>
      {/* ── Mobile: sticky top tab bar (below app header) ────────────── */}
      <nav
        className="sticky top-16 z-30 border-b border-orange-100 bg-white/95 shadow-[0_8px_20px_rgba(194,65,12,0.08)] backdrop-blur sm:hidden"
        data-testid="game-nav-mobile"
      >
        <div className={`grid ${colsClass}`}>
          {visibleTabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={tab.href(gameId)}
                className={`flex flex-col items-center justify-center py-2 transition-colors duration-150 ${
                  active ? 'text-orange-700' : 'text-gray-400 hover:text-orange-600'
                }`}
                data-testid={`game-nav-mobile-${tab.key}`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`flex items-center justify-center rounded-full px-2 py-1 ${
                    active ? 'bg-orange-50' : ''
                  }`}
                >
                  <Icon
                    size={22}
                    className={active ? 'text-orange-500' : ''}
                  />
                </span>
                <span className={`text-[10px] font-medium ${active ? 'text-orange-600' : ''}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop: sticky horizontal pill tab strip ─────────────────── */}
      <nav
        className="sticky top-16 z-20 hidden border-b border-orange-100 bg-white/90 backdrop-blur sm:block"
        data-testid="game-nav-desktop"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-1" data-testid="game-nav-tabs">
            {visibleTabs.map((tab) => {
              const active = isActive(tab);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={tab.href(gameId)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 ${
                    active
                      ? 'bg-orange-100 text-orange-700 shadow-sm'
                      : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                  data-testid={`game-nav-desktop-${tab.key}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
