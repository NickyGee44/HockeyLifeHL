'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { registerGoalieSelf } from '@/lib/actions/goalie-marketplace';

interface GoalieRegistrationFormProps {
  leagueSlug: string;
}

export function GoalieRegistrationForm({ leagueSlug }: GoalieRegistrationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [weekdayEvenings, setWeekdayEvenings] = useState(true);
  const [weekendMornings, setWeekendMornings] = useState(false);
  const [hasGear, setHasGear] = useState(true);
  const [rate, setRate] = useState('0');
  const [arenas, setArenas] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerGoalieSelf(leagueSlug, {
      name,
      email,
      phone,
      skill_level: skill,
      availability: { weekdayEvenings, weekendMornings },
      has_full_gear: hasGear,
      rate_per_game: Number(rate || '0'),
      preferred_arenas: arenas
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${leagueSlug}/goalies/register/confirmation`);
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto card p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Register as a Sub Goalie</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Join the league goalie pool and receive sub opportunities by email.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input required className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input required type="email" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" value={skill} onChange={(e) => setSkill(e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert')}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm text-[var(--color-text-secondary)] inline-flex items-center gap-2">
          <input type="checkbox" checked={weekdayEvenings} onChange={(e) => setWeekdayEvenings(e.target.checked)} /> Weekday evenings
        </label>
        <label className="text-sm text-[var(--color-text-secondary)] inline-flex items-center gap-2">
          <input type="checkbox" checked={weekendMornings} onChange={(e) => setWeekendMornings(e.target.checked)} /> Weekend mornings
        </label>
        <label className="text-sm text-[var(--color-text-secondary)] inline-flex items-center gap-2">
          <input type="checkbox" checked={hasGear} onChange={(e) => setHasGear(e.target.checked)} /> I have full goalie gear
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--color-text-secondary)]">Rate per game (optional)</label>
          <input type="number" min="0" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="e.g. 25" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <input className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="Preferred arenas (comma-separated)" value={arenas} onChange={(e) => setArenas(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-[var(--league-primary)] px-4 py-2 font-semibold text-[var(--color-accent-text)] hover:opacity-90 disabled:opacity-60" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />} Submit Registration
      </button>
    </form>
  );
}
