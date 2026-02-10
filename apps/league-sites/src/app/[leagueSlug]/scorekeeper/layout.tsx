import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scorekeeper - Beer League Hockey',
  description: 'Game scoring interface',
  robots: { index: false, follow: false },
};

/**
 * Minimal layout for scorekeeper interface.
 * No league header/footer - full-screen scoring interface.
 */
export default function ScorekeeperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {children}
    </div>
  );
}
