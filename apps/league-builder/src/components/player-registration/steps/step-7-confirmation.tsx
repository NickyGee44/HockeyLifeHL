'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  User,
  Users,
  Trophy,
  Camera,
  FileCheck,
  CreditCard,
  Check } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { useRegistrationContext } from '../registration-wizard-container';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';
import { usesTeamBilling } from '@/lib/payments/fee-collection-model';
import {
  formatRegistrationType,
  formatSkillLevel,
  formatPosition,
  formatRelationship } from '@/lib/schemas/player-registration';

export function Step7Confirmation() {
  const { leagueName, teams, paymentMode, registrationFee, feeCollectionModel, feeBasis } =
    useRegistrationContext();
  const { watch } = useFormContext<RegistrationFormData>();

  const formData = watch();
  const isTeamBilledSeason = usesTeamBilling(feeCollectionModel, feeBasis);
  const isTeamContribution = paymentMode === 'team_contribution';

  // Get team name if applicable
  const selectedTeam = teams.find((t) => t.id === formData.team_id);

  // Format payment amount
  const formattedAmount = registrationFee > 0
    ? new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD' }).format(registrationFee / 100)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Review Your Registration
        </h2>
        <p className="text-neutral-400">
          Please review your information before submitting
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-xl border border-rink-500/30 bg-rink-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-rink-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-rink-500" />
          </div>
          <div>
            <p className="text-sm text-neutral-400">Registering for</p>
            <p className="text-lg font-semibold text-white">{leagueName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-rink-500">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-rink-500/20">
            {formatRegistrationType(formData.registration_type)}
          </span>
          {selectedTeam && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-700 text-white">
              {selectedTeam.name}
            </span>
          )}
        </div>
      </div>

      {/* Information Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <SummarySection
          icon={User}
          title="Personal Information"
        >
          <SummaryItem label="Full Name" value={formData.full_name} />
          {formData.phone && (
            <SummaryItem label="Phone" value={formData.phone} />
          )}
          <div className="pt-3 mt-3 border-t border-neutral-700">
            <p className="text-xs text-amber-400 mb-2">Emergency Contact</p>
            <SummaryItem
              label="Name"
              value={formData.emergency_contact_name}
            />
            <SummaryItem
              label="Phone"
              value={formData.emergency_contact_phone}
            />
            <SummaryItem
              label="Relationship"
              value={
                formData.emergency_contact_relationship
                  ? formatRelationship(formData.emergency_contact_relationship)
                  : ''
              }
            />
          </div>
        </SummarySection>

        {/* Skill Assessment */}
        <SummarySection
          icon={Trophy}
          title="Skill Assessment"
        >
          <SummaryItem
            label="Skill Level"
            value={formData.skill_level ? formatSkillLevel(formData.skill_level) : ''}
          />
          <SummaryItem
            label="Primary Position"
            value={formData.primary_position ? formatPosition(formData.primary_position) : ''}
          />
          {formData.secondary_position && (
            <SummaryItem
              label="Secondary Position"
              value={formatPosition(formData.secondary_position)}
            />
          )}
          {formData.preferred_jersey_number && (
            <SummaryItem
              label="Preferred #"
              value={`#${formData.preferred_jersey_number}`}
            />
          )}
          {formData.years_experience !== null &&
            formData.years_experience !== undefined && (
              <SummaryItem
                label="Experience"
                value={`${formData.years_experience} years`}
              />
            )}
        </SummarySection>

        {/* Photo */}
        <SummarySection icon={Camera} title="Profile Photo">
          {formData.photo_url ? (
            <div className="flex items-center gap-3">
              <img
                src={formData.photo_url}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-rink-500/30"
              />
              <span className="text-sm text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Photo uploaded
              </span>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No photo uploaded</p>
          )}
        </SummarySection>

        {/* Waiver */}
        <SummarySection icon={FileCheck} title="Waiver & Agreements">
          <div className="space-y-2">
            <StatusItem
              label="Liability Waiver"
              completed={!!formData.waiver_agreed}
            />
            <StatusItem
              label="Terms of Service"
              completed={!!formData.consent_terms}
            />
            <StatusItem
              label="Privacy Policy"
              completed={!!formData.consent_privacy}
            />
            <StatusItem
              label="Data Processing"
              completed={!!formData.consent_data_processing}
            />
            {formData.consent_marketing && (
              <StatusItem label="Marketing Emails" completed={true} optional />
            )}
          </div>
          {formData.signed_name && (
            <p className="mt-3 pt-3 border-t border-neutral-700 text-sm text-neutral-400">
              Signed as: <span className="text-white">{formData.signed_name}</span>
            </p>
          )}
        </SummarySection>
      </div>

      {/* Payment Status */}
      {(registrationFee > 0 || paymentMode === 'hidden' || isTeamContribution) && (
        <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-rink-500" />
            <h3 className="font-semibold text-white">Payment</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">
                {paymentMode === 'hidden'
                  ? isTeamBilledSeason
                    ? 'Team Billing'
                    : 'Registration Fee'
                  : isTeamContribution
                    ? 'Player Contribution'
                    : 'Registration Fee'}
              </p>
              <p className="text-2xl font-bold text-rink-500">
                {paymentMode === 'hidden' && registrationFee <= 0
                  ? isTeamBilledSeason
                    ? 'Handled by team invoice'
                    : 'No player payment required'
                  : formattedAmount}
              </p>
            </div>
            {formData.payment_status === 'completed' ? (
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400">
                <Check className="w-4 h-4" />
                Paid
              </span>
            ) : paymentMode === 'hidden' ? (
              <span className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400">
                {isTeamBilledSeason ? 'Team Pays' : 'No Payment'}
              </span>
            ) : isTeamContribution ? (
              <span className="px-4 py-2 rounded-full bg-sky-500/20 text-sky-400">
                Team Contribution
              </span>
            ) : paymentMode === 'optional' ? (
              <span className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400">
                Team Can Pay
              </span>
            ) : (
              <span className="px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
                Pending
              </span>
            )}
          </div>
          {paymentMode === 'hidden' && (
            <p className="mt-3 text-sm text-neutral-400">
              {isTeamBilledSeason
                ? registrationFee > 0
                  ? 'This season uses team billing. Your team captain or league will handle the invoice.'
                  : 'This season uses a flat team fee. Your captain or league can pay the full team invoice after registrations are collected.'
                : 'No individual player payment has been configured for this season yet.'}
            </p>
          )}
          {isTeamContribution && (
            <p className="mt-3 text-sm text-neutral-400">
              This amount is your current contribution target toward the team invoice. Online and
              offline player payments both reduce the same team balance.
            </p>
          )}
          {paymentMode === 'optional' && formData.payment_status !== 'completed' && (
            <p className="mt-3 text-sm text-neutral-400">
              You are registering without paying individually. Any unpaid amount can be collected
              through team billing later.
            </p>
          )}
        </div>
      )}

      {/* Final Note */}
      <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
        <h4 className="font-medium text-blue-400 mb-1">What happens next?</h4>
        <p className="text-sm text-neutral-300">
          After submitting, your registration will be reviewed by the league
          administrator. You&apos;ll receive an email notification once your
          registration is approved. This typically takes 1-2 business days.
        </p>
      </div>

      {/* Submit Reminder */}
      <div className="text-center text-neutral-400">
        <p className="text-sm">
          Click <span className="text-rink-500 font-medium">Submit Registration</span> below
          to complete your registration
        </p>
      </div>
    </div>
  );
}

// Summary Section Component
interface SummarySectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function SummarySection({ icon: Icon, title, children }: SummarySectionProps) {
  return (
    <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-rink-500" />
          <h3 className="font-semibold text-white text-sm">{title}</h3>
        </div>
        {/* Edit button - can be connected to navigation later */}
        {/* <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={}
          className="text-neutral-400 hover:text-white"
        >
          <className="w-3 h-3" />
        </Button> */}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// Summary Item Component
interface SummaryItemProps {
  label: string;
  value: string | undefined | null;
}

function SummaryItem({ label, value }: SummaryItemProps) {
  if (!value) return null;

  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

// Status Item Component
interface StatusItemProps {
  label: string;
  completed: boolean;
  optional?: boolean;
}

function StatusItem({ label, completed, optional }: StatusItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {completed ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <div className="w-4 h-4 rounded border border-neutral-600" />
      )}
      <span className={cn(completed ? 'text-white' : 'text-neutral-500')}>
        {label}
        {optional && <span className="text-neutral-600 ml-1">(optional)</span>}
      </span>
    </div>
  );
}
