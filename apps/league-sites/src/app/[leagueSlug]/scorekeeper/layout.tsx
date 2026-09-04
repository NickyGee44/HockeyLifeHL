import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Scorekeeper route — League Sites Rebuild',
  robots: { index: false, follow: false },
};

export default function ScorekeeperLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
