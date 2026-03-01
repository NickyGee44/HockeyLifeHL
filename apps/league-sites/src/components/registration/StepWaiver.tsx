'use client';

import { FileText, ChevronDown } from 'lucide-react';
import type { RegistrationDraftData } from '@/lib/actions/registration';

interface StepWaiverProps {
  formData: RegistrationDraftData;
  waiverContent: string;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

export function StepWaiver({ formData, waiverContent, onUpdate }: StepWaiverProps) {
  const handleAcceptChange = (checked: boolean) => {
    onUpdate({
      waiver_accepted: checked,
      signature_type: 'checkbox',
      // Record the player's name as the "signature" when they accept
      signed_name: checked ? (formData.full_name || '') : '',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--league-primary)]" />
          Waiver & Release
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Please read the full waiver below, then scroll to the bottom to accept.
        </p>
      </div>

      {/* Waiver Content */}
      <div
        className="max-h-80 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)] prose prose-sm prose-invert max-w-none"
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

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-2 py-1">
        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] animate-bounce" />
        <p className="text-xs text-[var(--color-text-muted)]">
          Please read the full waiver above before accepting
        </p>
        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] animate-bounce" />
      </div>

      {/* Agreement checkbox */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.waiver_accepted}
            onChange={(e) => handleAcceptChange(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
          />
          <span className="text-sm text-[var(--color-text-primary)]">
            I have read and agree to the waiver and release of liability above. I understand that
            participating in recreational hockey involves inherent risks.
          </span>
        </label>
      </div>
    </div>
  );
}
