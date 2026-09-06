'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { Loader2, Phone, Share2, UserPlus, Users, X } from 'lucide-react';
import {
  createCaptainPlayerInvite,
  getCaptainInviteWizardData,
  type ExistingInviteCandidate,
  type CaptainInvitePreview,
} from '@/lib/actions/captain-player-invites';
import {
  buildInviteShareMessage,
  buildSmsShareUrl,
  buildWhatsAppShareUrl,
  shareCaptainPlayerInvite,
} from '@/lib/captain/share-player-invite';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  seasonId: string;
}

export function InvitePlayerWizard({ isOpen, onClose, teamId, seasonId }: Props) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'new' | 'existing' | null>(null);
  const [existingPlayers, setExistingPlayers] = useState<ExistingInviteCandidate[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<ExistingInviteCandidate | null>(null);
  const [position, setPosition] = useState('Forward');
  const [rosterType, setRosterType] = useState<'full_time' | 'spare'>('full_time');
  const [shareWithLeague, setShareWithLeague] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [preview, setPreview] = useState<CaptainInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal loading state intentionally resets when opened.
    setLoading(true);
    setError(null);
    getCaptainInviteWizardData(teamId, seasonId).then((result) => {
      if (result.success) {
        setExistingPlayers(result.data.existingPlayers);
      } else {
        setError(result.error || 'Failed to load invite options');
      }
      setLoading(false);
    });
  }, [isOpen, teamId, seasonId]);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal form state intentionally resets when opened.
    setStep(1);
    setMode(null);
    setSelectedExisting(null);
    setPosition('Forward');
    setRosterType('full_time');
    setShareWithLeague(false);
    setFullName('');
    setPhone('');
    setPreview(null);
    setError(null);
  }, [isOpen]);

  const isSpare = rosterType === 'spare';
  const reviewPhone = phone || selectedExisting?.phone || '';
  const brandLabel = 'Team branding';
  const canCreate = mode === 'existing'
    ? !!selectedExisting && !!reviewPhone
    : !!fullName.trim() && !!phone.trim();

  const reviewSummary = useMemo(() => {
    if (mode === 'existing') {
      return selectedExisting ? [
        ['Player', selectedExisting.fullName || 'Unnamed player'],
        ['Phone', reviewPhone],
        ['Type', selectedExisting.playerType],
        ['Branding', preview?.branding.name || brandLabel],
      ] : [];
    }

    return [
      ['Position', position],
      ['Roster spot', isSpare ? 'Spare' : 'Full-time'],
      ...(isSpare ? [['Spare list', 'Team-only']] : []),
      ['Player', fullName],
      ['Phone', phone],
      ['Branding', preview?.branding.name || brandLabel],
    ];
  }, [mode, selectedExisting, reviewPhone, position, isSpare, fullName, phone, preview, brandLabel]);

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCaptainPlayerInvite({
        teamId,
        seasonId,
        existingPlayerId: selectedExisting?.playerId,
        existingRosterId: selectedExisting?.rosterId,
        fullName: mode === 'new' ? fullName : selectedExisting?.fullName || undefined,
        phone: reviewPhone,
        position: mode === 'new' ? position : selectedExisting?.position,
        isSpare,
        shareWithLeague,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create invite');
        return;
      }

      setPreview(result.data);
      setStep(99);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="glass-card-strong relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <UserPlus className="h-5 w-5 text-[var(--league-primary)]" />
              Invite a player
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Create the player record, generate the signup link, then share it.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-hover)]">
            <X className="h-5 w-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? <div className="flex items-center justify-center py-12 text-[var(--color-text-secondary)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading invite wizard...</div> : null}
          {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          {!loading && step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <button onClick={() => { setMode('new'); setStep(2); }} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-5 text-left hover:border-[var(--league-primary)]/40">
                <UserPlus className="mb-3 h-6 w-6 text-[var(--league-primary)]" />
                <div className="font-semibold text-[var(--color-text-primary)]">New player</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">Create a new player record and send a prefilled signup link.</div>
              </button>
              <button onClick={() => { setMode('existing'); setStep(20); }} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-5 text-left hover:border-[var(--league-primary)]/40">
                <Users className="mb-3 h-6 w-6 text-cyan-300" />
                <div className="font-semibold text-[var(--color-text-primary)]">Existing player</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">Pick an unlinked rostered player and send their registration link.</div>
              </button>
            </div>
          ) : null}

          {!loading && mode === 'existing' && step === 20 ? (
            <div className="space-y-3">
              {existingPlayers.length === 0 ? <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-text-secondary)]">No unlinked team players are available right now.</div> : null}
              {existingPlayers.map((player) => (
                <button key={player.rosterId} onClick={() => { setSelectedExisting(player); setPhone(player.phone || ''); setStep(30); }} className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-left hover:border-[var(--league-primary)]/40">
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">{player.fullName || 'Unnamed player'}</div>
                    <div className="text-sm text-[var(--color-text-secondary)]">{player.position || 'No position'} · {player.phone || 'Phone missing'}</div>
                  </div>
                  <span className="text-xs text-[var(--league-primary)]">Select</span>
                </button>
              ))}
            </div>
          ) : null}

          {!loading && mode === 'existing' && step === 30 && selectedExisting ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
                <div className="font-medium text-[var(--color-text-primary)]">{selectedExisting.fullName}</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">Add or fix the phone number before sending the invite.</div>
              </div>
              <label className="block text-sm text-[var(--color-text-primary)]">
                Phone number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="glass-control mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]" placeholder="(555) 123-4567" />
              </label>
              <button onClick={() => setStep(40)} disabled={!phone.trim()} className="rounded-lg bg-[var(--league-primary)] px-4 py-2 font-medium text-[var(--color-accent-text)] disabled:opacity-50">Review invite</button>
            </div>
          ) : null}

          {!loading && mode === 'new' && step === 2 ? (
            <div className="space-y-4">
              <label className="block text-sm text-[var(--color-text-primary)]">Position
                <select value={position} onChange={(e) => setPosition(e.target.value)} className="glass-control mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]">
                  <option>Forward</option>
                  <option>Defense</option>
                  <option>Goalie</option>
                </select>
              </label>
              <button onClick={() => setStep(3)} className="rounded-lg bg-[var(--league-primary)] px-4 py-2 font-medium text-[var(--color-accent-text)]">Next</button>
            </div>
          ) : null}

          {!loading && mode === 'new' && step === 3 ? (
            <div className="space-y-3">
              <button onClick={() => { setRosterType('full_time'); setShareWithLeague(false); setStep(5); }} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-left">Full-time player</button>
              <button onClick={() => { setRosterType('spare'); setShareWithLeague(false); setStep(5); }} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-left">Spare</button>
            </div>
          ) : null}

          {!loading && mode === 'new' && step === 5 ? (
            <div className="space-y-4">
              <label className="block text-sm text-[var(--color-text-primary)]">Full name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="glass-control mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]" />
              </label>
              <label className="block text-sm text-[var(--color-text-primary)]">Phone number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="glass-control mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]" />
              </label>
              <button onClick={() => setStep(6)} disabled={!canCreate} className="rounded-lg bg-[var(--league-primary)] px-4 py-2 font-medium text-[var(--color-accent-text)] disabled:opacity-50">Review invite</button>
            </div>
          ) : null}

          {!loading && ((mode === 'new' && step === 6) || (mode === 'existing' && step === 40)) ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Review</div>
                <div className="space-y-2 text-sm">
                  {reviewSummary.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4"><span className="text-[var(--color-text-secondary)]">{label}</span><span className="text-right text-[var(--color-text-primary)]">{value}</span></div>
                  ))}
                </div>
              </div>
              <button onClick={handleComplete} disabled={!canCreate || pending} className="inline-flex items-center gap-2 rounded-lg bg-[var(--league-primary)] px-4 py-2 font-medium text-[var(--color-accent-text)] disabled:opacity-50">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Complete and send
              </button>
            </div>
          ) : null}

          {step === 99 && preview ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
                <div className="flex items-center gap-3">
                  {preview.branding.logoUrl ? <Image src={preview.branding.logoUrl} alt={preview.branding.name} width={48} height={48} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--league-primary)]/10 text-[var(--league-primary)]"><Users className="h-5 w-5" /></div>}
                  <div>
                    <div className="font-semibold text-[var(--color-text-primary)]">Invite ready</div>
                    <div className="text-sm text-[var(--color-text-secondary)]">{preview.branding.name} · {preview.branding.kind === 'league' ? 'league' : 'team'} branded message</div>
                  </div>
                </div>
                <div className="glass-control mt-4 rounded-xl border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-primary)]">{preview.shareText}</div>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <button onClick={() => shareCaptainPlayerInvite({ title: preview.shareTitle, text: preview.shareText, url: preview.registrationUrl, phone: preview.sharePhone })} className="rounded-lg bg-[var(--league-primary)] px-4 py-2 text-sm font-medium text-[var(--color-accent-text)]">Share sheet</button>
                <a href={buildSmsShareUrl(preview.sharePhone, preview.shareText, preview.registrationUrl)} className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-center text-sm font-medium text-[var(--color-text-primary)]">SMS / iMessage</a>
                <a href={buildWhatsAppShareUrl(preview.sharePhone, preview.shareText, preview.registrationUrl)} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-center text-sm font-medium text-[var(--color-text-primary)]">WhatsApp</a>
                <button onClick={async () => navigator.clipboard?.writeText(buildInviteShareMessage(preview.shareText, preview.registrationUrl))} className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">Copy message</button>
              </div>
              <div className="glass-control rounded-xl border border-[var(--color-border)] p-3 text-xs text-[var(--color-text-secondary)] break-all">{preview.registrationUrl}</div>
              <button onClick={onClose} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"><Phone className="h-4 w-4" />Done</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
