'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { acceptGoalieRequestByToken, getGoalieAcceptView } from '@/lib/actions/goalie-marketplace';
import { useEffect } from 'react';

type ViewData = {
  requestId: string;
  requestStatus: string;
  gameDate: string | null;
  teamName: string;
  leagueName: string;
  compensation: string | null;
  notes: string | null;
  goalieName: string;
};

export default function GoalieAcceptPage() {
  const params = useParams<{ leagueSlug: string; token: string }>();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewData | null>(null);
  const [result, setResult] = useState<'accepted' | 'already_filled' | 'expired' | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await getGoalieAcceptView(params.leagueSlug, params.token);
      if (!res.success) {
        setError(res.error);
      } else {
        setView(res.data);
      }
      setLoading(false);
    };
    void load();
  }, [params.leagueSlug, params.token]);

  const onAccept = async () => {
    setAccepting(true);
    const res = await acceptGoalieRequestByToken(params.leagueSlug, params.token);
    if (!res.success) {
      setError(res.error);
    } else {
      setResult(res.data.status);
    }
    setAccepting(false);
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  }

  if (error || !view) {
    return <div className="container mx-auto px-4 py-16 text-center text-red-400">{error || 'Invalid link'}</div>;
  }

  const currentStatus = result || (view.requestStatus === 'open' ? null : 'already_filled');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto card p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Goalie Sub Request</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">{view.leagueName} • {view.teamName}</p>

        <div className="mt-6 space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p><strong className="text-[var(--color-text-primary)]">Game:</strong> {view.gameDate ? new Date(view.gameDate).toLocaleString() : 'TBD'}</p>
          <p><strong className="text-[var(--color-text-primary)]">Compensation:</strong> {view.compensation || 'Not specified'}</p>
          {view.notes && <p><strong className="text-[var(--color-text-primary)]">Notes:</strong> {view.notes}</p>}
        </div>

        {currentStatus === 'accepted' && (
          <p className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-300">Accepted. You are confirmed for this game.</p>
        )}
        {currentStatus === 'already_filled' && (
          <p className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300">Already filled. Another goalie accepted first.</p>
        )}
        {currentStatus === 'expired' && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">This request has expired.</p>
        )}

        {!currentStatus && (
          <button
            onClick={onAccept}
            disabled={accepting}
            className="mt-6 inline-flex rounded-lg bg-[var(--league-primary)] px-4 py-2 font-semibold text-[var(--color-accent-text)] hover:opacity-90 disabled:opacity-60"
          >
            {accepting ? 'Accepting...' : 'Accept Request'}
          </button>
        )}

        <div className="mt-6">
          <Link href={`/${params.leagueSlug}`} className="text-[var(--league-primary)]">Back to league site</Link>
        </div>
      </div>
    </div>
  );
}
