'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Info, ImageIcon } from 'lucide-react';
import {
  Input,
  Textarea,
  FormField,
  ColorPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import { LogoUploader } from '../../ui/logo-uploader';
import { uploadWizardLogo, deleteWizardLogo } from '@/lib/actions/logo';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

// Common US timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

const COUNTRIES = [
  { value: 'USA', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Other', label: 'Other' },
];

export function Step2LeagueInfo() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  return (
    <WizardStepContainer
      title="League Information"
      description="Tell us about your hockey league. This information will be displayed to players and help identify your league."
    >
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <FormField
          label="League Name"
          error={errors.name?.message}
          required
          htmlFor="name"
        >
          <Input
            {...register('name')}
            id="name"
            placeholder="e.g., Winter Warriors Hockey League"
            error={!!errors.name}
          />
        </FormField>

        <FormField
          label="Description"
          error={errors.description?.message}
          hint="Optional. Provide a brief description of your league."
          htmlFor="description"
        >
          <Textarea
            {...register('description')}
            id="description"
            placeholder="Describe your league, its mission, and what makes it special..."
            rows={4}
            error={!!errors.description}
          />
        </FormField>
      </div>

      {/* Location Section */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">Location</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="City"
            error={errors.city?.message}
            required
            htmlFor="city"
          >
            <Input
              {...register('city')}
              id="city"
              placeholder="e.g., Denver"
              error={!!errors.city}
            />
          </FormField>

          <FormField
            label="State/Province"
            error={errors.state_province?.message}
            required
            htmlFor="state_province"
          >
            <Input
              {...register('state_province')}
              id="state_province"
              placeholder="e.g., Colorado"
              error={!!errors.state_province}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Country"
            error={errors.country?.message}
            required
            htmlFor="country"
          >
            <Select
              value={watch('country')}
              onValueChange={(value) => setValue('country', value)}
            >
              <SelectTrigger error={!!errors.country}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Timezone"
            error={errors.timezone?.message}
            required
            htmlFor="timezone"
            hint="Used for game scheduling"
          >
            <Select
              value={watch('timezone')}
              onValueChange={(value) => setValue('timezone', value)}
            >
              <SelectTrigger error={!!errors.timezone}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Branding Section */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">Branding</h3>
        <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            These colors and logo will be used throughout your league's interface to
            create a consistent brand experience.
          </p>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">League Logo</label>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <LogoUploader
            value={watch('logo_url') || ''}
            onChange={(url) => setValue('logo_url', url)}
            onUpload={async (file) => {
              const result = await uploadWizardLogo(file);
              if (!result.success) {
                throw new Error(result.error);
              }
              return result.data;
            }}
            onRemove={async () => {
              const currentUrl = watch('logo_url');
              if (currentUrl) {
                const result = await deleteWizardLogo(currentUrl);
                if (!result.success) {
                  throw new Error(result.error);
                }
              }
            }}
            placeholder="Upload Logo"
            shape="square"
          />
          {errors.logo_url?.message && (
            <p className="text-sm text-red-500">{errors.logo_url.message}</p>
          )}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Primary Color"
            error={errors.primary_color?.message}
            required
            htmlFor="primary_color"
            hint="Main brand color"
          >
            <ColorPicker
              {...register('primary_color')}
              id="primary_color"
              value={watch('primary_color')}
              onColorChange={(color) => setValue('primary_color', color)}
              error={!!errors.primary_color}
            />
          </FormField>

          <FormField
            label="Secondary Color"
            error={errors.secondary_color?.message}
            required
            htmlFor="secondary_color"
            hint="Accent color"
          >
            <ColorPicker
              {...register('secondary_color')}
              id="secondary_color"
              value={watch('secondary_color')}
              onColorChange={(color) => setValue('secondary_color', color)}
              error={!!errors.secondary_color}
            />
          </FormField>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">Contact Information (Optional)</h3>

        <FormField
          label="Contact Email"
          error={errors.contact_email?.message}
          htmlFor="contact_email"
        >
          <Input
            {...register('contact_email')}
            id="contact_email"
            type="email"
            placeholder="league@example.com"
            error={!!errors.contact_email}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Contact Phone"
            error={errors.contact_phone?.message}
            htmlFor="contact_phone"
          >
            <Input
              {...register('contact_phone')}
              id="contact_phone"
              type="tel"
              placeholder="(555) 123-4567"
              error={!!errors.contact_phone}
            />
          </FormField>

          <FormField
            label="Website URL"
            error={errors.website_url?.message}
            htmlFor="website_url"
          >
            <Input
              {...register('website_url')}
              id="website_url"
              type="url"
              placeholder="https://yourleague.com"
              error={!!errors.website_url}
            />
          </FormField>
        </div>
      </div>
    </WizardStepContainer>
  );
}
