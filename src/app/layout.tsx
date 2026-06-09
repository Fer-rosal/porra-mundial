import type { Metadata } from 'next';
import '../styles/globals.css';
import NavHeader from '@/components/NavHeader';
import { Providers } from './providers';
import { ReactNode } from 'react';

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
      <body>
        <Providers>
          <NavHeader />
          <main className="min-h-screen bg-white">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
