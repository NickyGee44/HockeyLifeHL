'use client';

import { useFormContext } from 'react-hook-form';
import { Building2, Info } from 'lucide-react';
import {
  Input,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'Other', label: 'Other' },
];

export function Step1OrgInfo() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  return (
    <WizardStepContainer
      title="Organization Info"
      description="Tell us about your organization. This information will be used for billing and communications."
    >
      {/* Business Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Business Details</h3>
        </div>

        <FormField
          label="Business/Organization Name"
          error={errors.orgBusinessName?.message}
          required
          htmlFor="orgBusinessName"
        >
          <Input
            {...register('orgBusinessName')}
            id="orgBusinessName"
            placeholder="e.g., Downtown Hockey Association"
            error={!!errors.orgBusinessName}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Business Email"
            error={errors.orgBusinessEmail?.message}
            htmlFor="orgBusinessEmail"
          >
            <Input
              {...register('orgBusinessEmail')}
              id="orgBusinessEmail"
              type="email"
              placeholder="billing@example.com"
              error={!!errors.orgBusinessEmail}
            />
          </FormField>

          <FormField
            label="Business Phone"
            error={errors.orgBusinessPhone?.message}
            htmlFor="orgBusinessPhone"
          >
            <Input
              {...register('orgBusinessPhone')}
              id="orgBusinessPhone"
              type="tel"
              placeholder="(555) 123-4567"
              error={!!errors.orgBusinessPhone}
            />
          </FormField>
        </div>
      </div>

      {/* Business Address Section */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">Business Address</h3>

        <FormField
          label="Street Address"
          error={errors.orgBusinessAddress?.message}
          htmlFor="orgBusinessAddress"
        >
          <Input
            {...register('orgBusinessAddress')}
            id="orgBusinessAddress"
            placeholder="123 Main Street"
            error={!!errors.orgBusinessAddress}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="City"
            error={errors.orgBusinessCity?.message}
            htmlFor="orgBusinessCity"
          >
            <Input
              {...register('orgBusinessCity')}
              id="orgBusinessCity"
              placeholder="e.g., Toronto"
              error={!!errors.orgBusinessCity}
            />
          </FormField>

          <FormField
            label="State/Province"
            error={errors.orgBusinessState?.message}
            htmlFor="orgBusinessState"
          >
            <Input
              {...register('orgBusinessState')}
              id="orgBusinessState"
              placeholder="e.g., Ontario"
              error={!!errors.orgBusinessState}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="ZIP/Postal Code"
            error={errors.orgBusinessZip?.message}
            htmlFor="orgBusinessZip"
          >
            <Input
              {...register('orgBusinessZip')}
              id="orgBusinessZip"
              placeholder="e.g., M5V 2T6"
              error={!!errors.orgBusinessZip}
            />
          </FormField>

          <FormField
            label="Country"
            error={errors.orgBusinessCountry?.message}
            htmlFor="orgBusinessCountry"
          >
            <Select
              value={watch('orgBusinessCountry')}
              onValueChange={(value) => setValue('orgBusinessCountry', value)}
            >
              <SelectTrigger error={!!errors.orgBusinessCountry}>
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
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          This information is optional but helps with invoicing and tax compliance.
          You can update it later from your dashboard.
        </p>
      </div>
    </WizardStepContainer>
  );
}
