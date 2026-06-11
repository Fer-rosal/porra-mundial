import type { Metadata } from 'next';
import '../styles/globals.css';
import NavHeader from '@/components/NavHeader';
import { Providers } from './providers';
import { GameStoreProvider } from '@/lib/game-store';
import { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';

const uiFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'World Cup 2026 Betting Game',
  description: 'Predict World Cup 2026 match results and compete with friends',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={uiFont.variable}>
        <GameStoreProvider>
          <Providers>
            <NavHeader />
            <main className="app-main-bg">
              {children}
            </main>
          </Providers>
        </GameStoreProvider>
      </body>
    </html>
  );
}
