'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FileText, ExternalLink, Check } from 'lucide-react';
import { InlineWaiver } from '@/components/ui/waiver-modal';
import { cn } from '@hockey-life/ui/lib/utils';
import { useRegistrationContext } from '../registration-wizard-container';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';

export function Step5Waiver() {
  const { waiverContent, waiverVersion, waiverContentHash, leagueName } =
    useRegistrationContext();
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const signatureData = watch('signature_data');
  const signedName = watch('signed_name');
  const waiverAgreed = watch('waiver_agreed');
  const consentTerms = watch('consent_terms');
  const consentPrivacy = watch('consent_privacy');
  const consentDataProcessing = watch('consent_data_processing');
  const consentMarketing = watch('consent_marketing');

  const handleSignatureChange = (data: string, type: 'drawn' | 'typed') => {
    setValue('signature_data', data, { shouldValidate: true });
    setValue('signature_type', type);
  };

  const handleSignedNameChange = (name: string) => {
    setValue('signed_name', name, { shouldValidate: true });
  };

  const handleAgreeChange = (agreed: boolean) => {
    // Cast needed because schema expects z.literal(true) but form needs to be able to clear value
    setValue('waiver_agreed', (agreed ? true : undefined) as true, { shouldValidate: true });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Waiver & Agreements
        </h2>
        <p className="text-neutral-400">
          Please read and sign the liability waiver and accept the required agreements
        </p>
      </div>

      {/* Waiver Section */}
      <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <FileText className="w-5 h-5 text-rink-500" />
          <h3 className="font-semibold">Liability Waiver</h3>
          <span className="text-xs text-neutral-500 ml-2">v{waiverVersion}</span>
        </div>

        <InlineWaiver
          content={waiverContent}
          signatureData={signatureData || ''}
          onSignatureChange={handleSignatureChange}
          signedName={signedName || ''}
          onSignedNameChange={handleSignedNameChange}
          hasAgreed={!!waiverAgreed}
          onAgreeChange={handleAgreeChange}
        />

        {errors.waiver_agreed && (
          <p className="text-sm text-red-400 mt-2">{errors.waiver_agreed.message}</p>
        )}
        {errors.signature_data && (
          <p className="text-sm text-red-400 mt-2">{errors.signature_data.message}</p>
        )}
        {errors.signed_name && (
          <p className="text-sm text-red-400 mt-2">{errors.signed_name.message}</p>
        )}
      </div>

      {/* Additional Consents */}
      <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800/30 space-y-4">
        <h3 className="font-semibold text-white mb-4">Additional Agreements</h3>

        {/* Terms of Service */}
        <ConsentCheckbox
          id="consent_terms"
          checked={!!consentTerms}
          onChange={(checked) =>
            setValue('consent_terms', (checked ? true : undefined) as true, { shouldValidate: true })
          }
          required
          error={errors.consent_terms?.message}
        >
          I agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rink-500 hover:text-rink-400 inline-flex items-center gap-1"
          >
            Terms of Service
            <ExternalLink className="w-3 h-3" />
          </a>
        </ConsentCheckbox>

        {/* Privacy Policy */}
        <ConsentCheckbox
          id="consent_privacy"
          checked={!!consentPrivacy}
          onChange={(checked) =>
            setValue('consent_privacy', (checked ? true : undefined) as true, { shouldValidate: true })
          }
          required
          error={errors.consent_privacy?.message}
        >
          I have read and accept the{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rink-500 hover:text-rink-400 inline-flex items-center gap-1"
          >
            Privacy Policy
            <ExternalLink className="w-3 h-3" />
          </a>
        </ConsentCheckbox>

        {/* Data Processing */}
        <ConsentCheckbox
          id="consent_data_processing"
          checked={!!consentDataProcessing}
          onChange={(checked) =>
            setValue('consent_data_processing', (checked ? true : undefined) as true, {
              shouldValidate: true,
            })
          }
          required
          error={errors.consent_data_processing?.message}
        >
          I consent to the processing of my personal data for league registration,
          communication, and management purposes as described in the Privacy Policy
        </ConsentCheckbox>

        {/* Marketing (Optional) */}
        <ConsentCheckbox
          id="consent_marketing"
          checked={!!consentMarketing}
          onChange={(checked) => setValue('consent_marketing', checked)}
        >
          I would like to receive promotional emails about league news, events,
          and special offers <span className="text-neutral-500">(optional)</span>
        </ConsentCheckbox>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
        <h4 className="font-medium text-blue-400 mb-1">Your Privacy Matters</h4>
        <p className="text-sm text-neutral-300">
          Your personal information is protected and will only be used for league
          operations. You can manage your data preferences at any time from your
          account settings.
        </p>
      </div>
    </div>
  );
}

// Consent Checkbox Component
interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  required,
  error,
  children,
}: ConsentCheckboxProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={cn(
          'flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors',
          checked
            ? 'border-rink-500/50 bg-rink-500/5'
            : 'border-transparent hover:bg-neutral-800/50',
          error && 'border-red-500/50'
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              checked
                ? 'bg-rink-500 border-rink-500'
                : 'border-neutral-600 bg-neutral-800'
            )}
          >
            {checked && <Check className="w-3 h-3 text-black" />}
          </div>
        </div>
        <span className="text-sm text-neutral-300 flex-1">
          {children}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
      </label>
      {error && <p className="text-sm text-red-400 ml-8">{error}</p>}
    </div>
  );
}
