'use client';

interface RefereeDashboardViewProps {
  leagueSlug: string;
}

export function RefereeDashboardView({ leagueSlug }: RefereeDashboardViewProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--league-primary,#d4af37)]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--league-primary,#d4af37)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Referee Dashboard</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">Your assignments and schedule</p>
            </div>
          </div>
          <a
            href={`/${leagueSlug}/referee`}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Sign Out
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--league-primary,#d4af37)]">0</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Upcoming</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">0</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Completed</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">0</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">This Month</p>
          </div>
        </div>

        {/* Upcoming Assignments */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Upcoming Assignments</h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              No upcoming assignments yet.
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Your league admin will assign you to games.
            </p>
          </div>
        </section>

        {/* Recent Games */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Recent Games</h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No completed games to show.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
