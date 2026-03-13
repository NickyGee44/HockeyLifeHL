'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUser } from '@/hooks/useUser';
import { Users, FileText, ChevronDown, Check, Loader2 } from 'lucide-react';
import {
  submitTeamRegistration,
  type LeagueFormConfig,
  type RegistrationDivisionOption,
} from '@/lib/actions/registration';
import { WaiverDocumentPanel } from './WaiverDocumentPanel';

interface TeamRegistrationFormProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string;
  leagueName: string;
  seasonName: string;
  waiverContent: string;
  waiverVersion: string;
  waiverDocumentUrl?: string | null;
  waiverDocumentName?: string | null;
  waiverDocumentMimeType?: string | null;
  leagueFormConfig: LeagueFormConfig;
  divisionOptions?: RegistrationDivisionOption[];
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50';

const selectClass =
  'w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2 mb-4">
      {children}
    </h3>
  );
}

export function TeamRegistrationForm({
  leagueId,
  leagueSlug,
  seasonId,
  leagueName,
  seasonName,
  waiverContent,
  waiverVersion,
  waiverDocumentUrl,
  waiverDocumentName,
  waiverDocumentMimeType,
  leagueFormConfig,
  divisionOptions = [],
}: TeamRegistrationFormProps) {
  const { user } = useUser();
  const { openLogin } = useAuth();

  const levels = leagueFormConfig.levels ?? [];
  const locations = leagueFormConfig.locations ?? [];
  const nights = leagueFormConfig.nights ?? [];
  const waiverScrollRef = useRef<HTMLDivElement | null>(null);

  const availableDivisions = useMemo(() => {
    if (divisionOptions.length > 0) {
      return divisionOptions;
    }

    return levels.map((name) => ({
      id: name,
      name,
      description: null,
      skill_level: null,
    }));
  }, [divisionOptions, levels]);

  const [teamName, setTeamName] = useState('');
  const [level, setLevel] = useState('');
  const [playedLastSeason, setPlayedLastSeason] = useState<boolean | null>(null);
  const [teamLastSeason, setTeamLastSeason] = useState('');
  const [backupRepName, setBackupRepName] = useState('');
  const [backupRepEmail, setBackupRepEmail] = useState('');
  const [locationPref, setLocationPref] = useState('');
  const [preferredDay, setPreferredDay] = useState('');
  const [alternateDay, setAlternateDay] = useState('');
  const [comments, setComments] = useState('');

  // Waiver
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const selectedDivision = availableDivisions.find((division) => division.name === level) || null;

  const updateWaiverScrollState = () => {
    const container = waiverScrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 20;
    const doesNotNeedScroll = scrollHeight <= clientHeight + 8;

    if (atBottom || doesNotNeedScroll) {
      setHasScrolledToBottom(true);
    }
  };

  const handleWaiverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    setHasScrolledToBottom(false);

    const frame = window.requestAnimationFrame(() => {
      updateWaiverScrollState();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [waiverContent, waiverDocumentUrl, waiverDocumentName, waiverDocumentMimeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      openLogin();
      return;
    }

    if (!teamName.trim()) {
      setSubmitError('Team name is required.');
      return;
    }

    if (!waiverAccepted) {
      setSubmitError('You must read and accept the waiver to submit.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitTeamRegistration({
        league_id: leagueId,
        season_id: seasonId,
        team_name: teamName,
        level: level || undefined,
        played_last_season: playedLastSeason ?? undefined,
        team_last_season: teamLastSeason || undefined,
        backup_rep_name: backupRepName || undefined,
        backup_rep_email: backupRepEmail || undefined,
        location_preference: locationPref || undefined,
        preferred_day: preferredDay || undefined,
        alternate_day: alternateDay || undefined,
        comments: comments || undefined,
        waiver_accepted: true,
        waiver_version: waiverVersion,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      setIsComplete(true);
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-[var(--league-primary)]" />
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Sign in to Register Your Team
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            You need an account to register a team for {leagueName}.
          </p>
          <button
            onClick={openLogin}
            className="px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  // Submitted
  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Team Registration Submitted!
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-2">
            Your team <strong>{teamName}</strong> has been registered for{' '}
            <strong>{seasonName}</strong> and is pending approval.
          </p>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">
            You will hear from the league once your registration has been reviewed.
          </p>
          <a
            href={`/${leagueSlug}`}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to {leagueName}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">
          Team Registration
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {leagueName} &middot; {seasonName}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-6 md:p-8 space-y-8"
      >
        {/* Team Info */}
        <div>
          <SectionHeading>Team Information</SectionHeading>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Team Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. The Pucks"
                required
                className={inputClass}
              />
            </div>

            {availableDivisions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Division / Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select a division...</option>
                  {availableDivisions.map((division) => (
                    <option key={division.id} value={division.name}>
                      {division.name}
                    </option>
                  ))}
                </select>

                {availableDivisions.some((division) => division.description || division.skill_level) && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                      Division guidance
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableDivisions.map((division) => {
                        const isSelected = division.name === level;
                        return (
                          <div
                            key={`${division.id}-details`}
                            className={`rounded-xl border p-3 text-sm transition-colors ${
                              isSelected
                                ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10'
                                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                            }`}
                          >
                            <p className="font-semibold text-[var(--color-text-primary)]">
                              {division.name}
                            </p>
                            {division.skill_level && (
                              <p className="mt-1 text-xs text-[var(--league-primary)]">
                                Skill level: {division.skill_level}
                              </p>
                            )}
                            {division.description && (
                              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                                {division.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDivision && (selectedDivision.description || selectedDivision.skill_level) && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    {selectedDivision.skill_level ? `Skill level: ${selectedDivision.skill_level}. ` : ''}
                    {selectedDivision.description || ''}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Did your team play last season?
              </label>
              <div className="flex gap-2">
                {[
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setPlayedLastSeason(opt.value)}
                    className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      playedLastSeason === opt.value
                        ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {playedLastSeason === true && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Team name last season{' '}
                  <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={teamLastSeason}
                  onChange={(e) => setTeamLastSeason(e.target.value)}
                  placeholder="e.g. The Pucks"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div>
          <SectionHeading>Backup Representative</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Name{' '}
                <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={backupRepName}
                onChange={(e) => setBackupRepName(e.target.value)}
                placeholder="Full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Email{' '}
                <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={backupRepEmail}
                onChange={(e) => setBackupRepEmail(e.target.value)}
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        {(locations.length > 0 || nights.length > 0) && (
          <div>
            <SectionHeading>Scheduling Preferences</SectionHeading>
            <div className="space-y-4">
              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Location Preference
                  </label>
                  <select
                    value={locationPref}
                    onChange={(e) => setLocationPref(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">No preference</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {nights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                      Preferred Day
                    </label>
                    <select
                      value={preferredDay}
                      onChange={(e) => setPreferredDay(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">No preference</option>
                      {nights.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                      Alternate Day{' '}
                      <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
                    </label>
                    <select
                      value={alternateDay}
                      onChange={(e) => setAlternateDay(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">None</option>
                      {nights
                        .filter((n) => n !== preferredDay)
                        .map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Comments{' '}
            <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Any additional information for the league..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Waiver */}
        <div>
          <SectionHeading>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Waiver & Release
            </span>
          </SectionHeading>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Please read the full waiver below, then scroll to the bottom to accept.
          </p>

          <div className="mb-4">
            <WaiverDocumentPanel
              documentUrl={waiverDocumentUrl}
              documentName={waiverDocumentName}
              documentMimeType={waiverDocumentMimeType}
            />
          </div>

          <div
            ref={waiverScrollRef}
            onScroll={handleWaiverScroll}
            className="max-h-72 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)] prose prose-sm prose-invert max-w-none mb-3 overscroll-contain"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: waiverContent
                  .replace(/^### (.+)$/gm, '<h3 class="text-[var(--color-text-primary)] font-semibold mt-4 mb-2 text-base">$1</h3>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-[var(--color-text-primary)] font-bold mt-5 mb-2 text-lg">$1</h2>')
                  .replace(/^# (.+)$/gm, '<h1 class="text-[var(--color-text-primary)] font-bold mt-6 mb-3 text-xl">$1</h1>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/\n\n/g, '<br/><br/>'),
              }}
            />
          </div>

          {!hasScrolledToBottom && (
            <div className="flex items-center justify-center gap-2 py-1 mb-3">
              <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] animate-bounce" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Scroll to the bottom to enable the acceptance checkbox
              </p>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] animate-bounce" />
            </div>
          )}

          <label
            className={`flex items-start gap-3 ${hasScrolledToBottom ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          >
            <input
              type="checkbox"
              checked={waiverAccepted}
              disabled={!hasScrolledToBottom}
              onChange={(e) => setWaiverAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)] disabled:cursor-not-allowed"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              I have read and agree to the waiver and release of liability above on behalf of my
              team. I understand that participating in recreational hockey involves inherent risks.
            </span>
          </label>

          {!hasScrolledToBottom && (
            <p className="text-xs text-amber-400/80 ml-7 mt-1">
              You must scroll to the bottom of the waiver before accepting.
            </p>
          )}
        </div>

        {submitError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {submitError}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !waiverAccepted || !teamName.trim()}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Team Registration'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
