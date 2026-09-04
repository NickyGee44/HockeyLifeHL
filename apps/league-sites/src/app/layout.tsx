import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beer League Hockey — League Sites Rebuild',
  description: 'Offline-friendly route inventory for the league sites rebuild.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#rebuild-content">
          Skip to route details
        </a>
        <div className="neutral-shell">
          <header className="neutral-shell__header">
            <Link className="neutral-shell__brand" href="/" aria-label="Beer League Hockey home">
              <span aria-hidden="true">BLH</span>
              <span>Beer League Hockey</span>
            </Link>
            <p>League sites route rebuild</p>
          </header>
          {children}
          <footer className="neutral-shell__footer">
            <p>Static route specification shell. No live league data is loaded.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
