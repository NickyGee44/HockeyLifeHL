'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { RegistrationDraftData } from '@/lib/actions/registration';

interface StepWaiverProps {
  formData: RegistrationDraftData;
  waiverContent: string;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

export function StepWaiver({ formData, waiverContent, onUpdate }: StepWaiverProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(!!formData.signed_name);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--league-primary)]" />
          Waiver & Release
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Please read and sign the waiver to continue with your registration.
        </p>
      </div>

      {/* Waiver Content */}
      <div
        onScroll={handleScroll}
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

      {!hasScrolledToBottom && (
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Please scroll to the bottom to read the full waiver
        </p>
      )}

      {/* Agreement */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              if (!e.target.checked) {
                onUpdate({ signed_name: '', signature_data: '' });
              }
            }}
            className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
          />
          <span className="text-sm text-[var(--color-text-primary)]">
            I have read and agree to the waiver and release of liability above. I understand
            that participating in recreational hockey involves inherent risks.
          </span>
        </label>

        {/* Typed Signature */}
        {agreedToTerms && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Type your full name as signature *
            </label>
            <input
              type="text"
              value={formData.signed_name || ''}
              onChange={(e) =>
                onUpdate({
                  signed_name: e.target.value,
                  signature_data: e.target.value,
                  signature_type: 'typed',
                })
              }
              placeholder="Type your full legal name"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 font-serif italic text-lg"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              By typing your name, you are electronically signing this waiver.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
