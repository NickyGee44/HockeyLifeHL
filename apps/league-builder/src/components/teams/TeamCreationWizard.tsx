'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { ColorPicker } from './ColorPicker';
import { createTeam, type CreateTeamParams, type TeamType } from '@/lib/actions/teams';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  User,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface TeamCreationWizardProps {
  leagueId: string;
  divisions?: { id: string; name: string }[];
  venues?: { id: string; name: string }[];
  onSuccess?: (team: any) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  divisionId: string;
  homeVenueId: string;
  maxRosterSize: number;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  teamType: TeamType;
}

const STEPS = [
  { id: 'basics', title: 'Team Basics', icon: Info },
  { id: 'colors', title: 'Colors & Branding', icon: Palette },
  { id: 'details', title: 'Details', icon: User },
];

export function TeamCreationWizard({
  leagueId,
  divisions = [],
  venues = [],
  onSuccess,
  onCancel,
}: TeamCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    shortName: '',
    primaryColor: '#E31837',
    secondaryColor: '#FFFFFF',
    divisionId: '',
    homeVenueId: '',
    maxRosterSize: 20,
    contactEmail: '',
    contactPhone: '',
    notes: '',
    teamType: 'standard',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 0) {
      if (!formData.name.trim()) {
        newErrors.name = 'Team name is required';
      } else if (formData.name.length < 2) {
        newErrors.name = 'Team name must be at least 2 characters';
      }

      if (!formData.shortName.trim()) {
        newErrors.shortName = 'Short name is required';
      } else if (formData.shortName.length < 2 || formData.shortName.length > 5) {
        newErrors.shortName = 'Short name must be 2-5 characters';
      }
    }

    if (step === 1) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(formData.primaryColor)) {
        newErrors.primaryColor = 'Invalid primary color';
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(formData.secondaryColor)) {
        newErrors.secondaryColor = 'Invalid secondary color';
      }
    }

    if (step === 2) {
      if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Invalid email address';
      }
      if (formData.maxRosterSize < 1 || formData.maxRosterSize > 50) {
        newErrors.maxRosterSize = 'Roster size must be between 1 and 50';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const params: CreateTeamParams = {
        leagueId,
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase(),
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        divisionId: formData.divisionId || undefined,
        homeVenueId: formData.homeVenueId || undefined,
        maxRosterSize: formData.maxRosterSize,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        notes: formData.notes || undefined,
        teamType: formData.teamType,
      };

      const result = await createTeam(params);

      if (result.error || !result.data) {
        setError(result.error || 'Failed to create team');
        return;
      }

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        // Redirect to the team detail page (exists at /dashboard/teams/[teamId])
        router.push(`/dashboard/teams/${result.data.id}`);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Team Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Boston Bruins"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Short Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.shortName}
                onChange={(e) => updateField('shortName', e.target.value.toUpperCase())}
                placeholder="e.g., BOS"
                maxLength={5}
                className={cn('uppercase', errors.shortName ? 'border-red-500' : '')}
              />
              <p className="mt-1 text-xs text-neutral-500">
                2-5 characters used for jerseys and abbreviations
              </p>
              {errors.shortName && (
                <p className="mt-1 text-sm text-red-500">{errors.shortName}</p>
              )}
            </div>

            {divisions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Division
                </label>
                <select
                  value={formData.divisionId}
                  onChange={(e) => updateField('divisionId', e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                    'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
                  )}
                >
                  <option value="">No division</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Team Type
              </label>
              <select
                value={formData.teamType}
                onChange={(e) => updateField('teamType', e.target.value as TeamType)}
                className={cn(
                  'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                  'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
                )}
              >
                <option value="standard">Standard team</option>
                <option value="free_agents">Free agent pool — excluded from standings</option>
                <option value="placeholder">Placeholder / setup only</option>
                <option value="exhibition">Exhibition team</option>
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                Use Free agent pool for spare players that should not count as a real standings team.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <ColorPicker
              label="Primary Color"
              value={formData.primaryColor}
              onChange={(color) => updateField('primaryColor', color)}
            />

            <ColorPicker
              label="Secondary Color"
              value={formData.secondaryColor}
              onChange={(color) => updateField('secondaryColor', color)}
            />

            {/* Preview */}
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Preview
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: formData.primaryColor,
                    color: formData.secondaryColor,
                  }}
                >
                  {formData.shortName || 'TM'}
                </div>
                <div>
                  <p className="font-bold text-white">{formData.name || 'Team Name'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: formData.primaryColor }}
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: formData.secondaryColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {venues.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Home Venue
                </label>
                <select
                  value={formData.homeVenueId}
                  onChange={(e) => updateField('homeVenueId', e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                    'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
                  )}
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Max Roster Size
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={formData.maxRosterSize}
                onChange={(e) => updateField('maxRosterSize', parseInt(e.target.value) || 20)}
                className={errors.maxRosterSize ? 'border-red-500' : ''}
              />
              {errors.maxRosterSize && (
                <p className="mt-1 text-sm text-red-500">{errors.maxRosterSize}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Contact Email
              </label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                placeholder="team@example.com"
                className={errors.contactEmail ? 'border-red-500' : ''}
              />
              {errors.contactEmail && (
                <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Contact Phone
              </label>
              <Input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Any additional notes about the team..."
                rows={3}
                className={cn(
                  'w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2',
                  'text-sm text-white placeholder:text-neutral-500',
                  'focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <h2 className="text-xl font-bold text-white">Create New Team</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Fill in the details to add a new team to your league
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-neutral-900/50">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-rink-500 text-black'
                        : 'bg-neutral-800 text-neutral-500'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-2 font-medium',
                      isActive ? 'text-rink-500' : 'text-neutral-500'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-20 h-0.5 mx-2',
                      isCompleted ? 'bg-green-500' : 'bg-neutral-800'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">{renderStepContent()}</div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {currentStep === 0 && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={cn(
                'px-4 py-2 rounded-xl',
                'text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors'
              )}
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Team
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamCreationWizard;
