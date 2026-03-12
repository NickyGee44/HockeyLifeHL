'use client';

import { CheckCircle2, User, Shield, CreditCard, AlertTriangle } from 'lucide-react';
import type { RegistrationDraftData } from '@/lib/actions/registration';
import type { RegistrationPaymentMode } from '@/lib/registration/fee-collection-model';

interface StepConfirmationProps {
  formData: RegistrationDraftData;
  leagueSlug: string;
  leagueName: string;
  seasonName: string;
  registrationFee: number;
  paymentMode: RegistrationPaymentMode;
  teams: { id: string; name: string }[];
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
  canSubmit?: boolean;
}

const POSITION_LABELS: Record<string, string> = {
  C: 'Center',
  LW: 'Left Wing',
  RW: 'Right Wing',
  D: 'Defense',
  G: 'Goalie',
};

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export function StepConfirmation({
  formData,
  leagueSlug,
  leagueName,
  seasonName,
  registrationFee,
  paymentMode,
  teams,
  onUpdate,
  canSubmit = true,
}: StepConfirmationProps) {
  const teamName = formData.team_id
    ? teams.find((t) => t.id === formData.team_id)?.name
    : null;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[var(--league-primary)]" />
          Review & Submit
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Please review your registration details before submitting.
        </p>
      </div>

      {/* Registration Summary */}
      <div className="space-y-4">
        {/* League & Season */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            League & Season
          </p>
          <p className="font-semibold text-[var(--color-text-primary)]">{leagueName}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{seasonName}</p>
        </div>

        {/* Personal Info */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[var(--league-primary)]" />
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              Personal Info
            </p>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Name</span>
            <span className="text-[var(--color-text-primary)] font-medium">
              {formData.full_name || '-'}
            </span>
            <span className="text-[var(--color-text-muted)]">Type</span>
            <span className="text-[var(--color-text-primary)]">
              {formData.registration_type === 'free_agent' ? 'Free Agent' : 'Team Registration'}
            </span>
            {teamName && (
              <>
                <span className="text-[var(--color-text-muted)]">Team</span>
                <span className="text-[var(--color-text-primary)]">{teamName}</span>
              </>
            )}
            {formData.phone && (
              <>
                <span className="text-[var(--color-text-muted)]">Phone</span>
                <span className="text-[var(--color-text-primary)]">{formData.phone}</span>
              </>
            )}
          </div>
        </div>

        {/* Skill & Position */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[var(--league-primary)]" />
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              Skill & Position
            </p>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Position</span>
            <span className="text-[var(--color-text-primary)]">
              {POSITION_LABELS[formData.primary_position || ''] || formData.primary_position || '-'}
              {formData.secondary_position && (
                <span className="text-[var(--color-text-muted)]">
                  {' '}/ {POSITION_LABELS[formData.secondary_position] || formData.secondary_position}
                </span>
              )}
            </span>
            <span className="text-[var(--color-text-muted)]">Skill Level</span>
            <span className="text-[var(--color-text-primary)]">
              {SKILL_LABELS[formData.skill_level || ''] || formData.skill_level || '-'}
            </span>
            {formData.preferred_jersey_number != null && (
              <>
                <span className="text-[var(--color-text-muted)]">Jersey #</span>
                <span className="text-[var(--color-text-primary)]">
                  {formData.preferred_jersey_number}
                </span>
              </>
            )}
            {formData.years_experience != null && (
              <>
                <span className="text-[var(--color-text-muted)]">Experience</span>
                <span className="text-[var(--color-text-primary)]">
                  {formData.years_experience} year{formData.years_experience !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Payment */}
        {(registrationFee > 0 || paymentMode === 'hidden') && (
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-[var(--league-primary)]" />
              <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                Payment
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">
                {paymentMode === 'hidden' ? 'Team Billing' : 'Registration Fee'}
              </span>
              <span className="font-bold text-[var(--color-text-primary)]">
                {paymentMode === 'hidden' && registrationFee <= 0
                  ? 'Handled by team invoice'
                  : formatCurrency(registrationFee)}
              </span>
            </div>
            <p className="mt-1 text-xs text-green-400">
              {formData.payment_status === 'completed'
                ? 'Payment completed'
                : paymentMode === 'hidden'
                  ? registrationFee > 0
                    ? 'Your team will be billed for this registration'
                    : 'Your captain or league can pay the full team invoice after registrations are collected.'
                  : paymentMode === 'optional'
                    ? 'You are registering now and can let your team handle payment later'
                    : formData.payment_status === 'not_required'
                      ? 'No payment required'
                  : 'Payment pending'}
            </p>
          </div>
        )}

        {/* Waiver */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">Waiver</span>
            <span className={`text-sm font-medium ${formData.signed_name ? 'text-green-400' : 'text-amber-400'}`}>
              {formData.signed_name ? `Signed by ${formData.signed_name}` : 'Not signed'}
            </span>
          </div>
        </div>
      </div>

      {!canSubmit && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Payment Required</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Please go back to the Payment step to complete your payment before submitting.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-[var(--league-primary)]/10 border border-[var(--league-primary)]/30 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.tos_accepted}
            onChange={(e) => onUpdate({ tos_accepted: e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
          />
          <span className="text-sm text-[var(--color-text-primary)]">
            I have read and agree to the{' '}
            <a
              href={`/${leagueSlug}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:opacity-80"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href={`/${leagueSlug}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:opacity-80"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.email_marketing_opt_in}
            onChange={(e) => onUpdate({ email_marketing_opt_in: e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
          />
          <span className="text-xs text-[var(--color-text-secondary)]">
            I&apos;d like to receive league updates, news, and promotions via email.
          </span>
        </label>
      </div>
    </div>
  );
}
