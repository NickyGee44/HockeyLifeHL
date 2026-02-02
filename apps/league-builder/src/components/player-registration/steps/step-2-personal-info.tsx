'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { User, Phone, AlertTriangle, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@hockey-life/ui/lib/utils';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';
import { EMERGENCY_CONTACT_RELATIONSHIPS, formatRelationship } from '@/lib/schemas/player-registration';

export function Step2PersonalInfo() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const relationship = watch('emergency_contact_relationship');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Personal Information
        </h2>
        <p className="text-neutral-400">
          Please provide your contact details and emergency contact information
        </p>
      </div>

      {/* Personal Info Section */}
      <div className="space-y-6 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <User className="w-5 h-5 text-gold-500" />
          <h3 className="font-semibold">Your Details</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-white">
              Full Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="John Smith"
              {...register('full_name')}
              className={cn(
                'bg-neutral-800 border-neutral-700',
                errors.full_name && 'border-red-500'
              )}
            />
            {errors.full_name && (
              <p className="text-sm text-red-400">{errors.full_name.message}</p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">
              Phone Number <span className="text-neutral-500">(Optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              {...register('phone')}
              className={cn(
                'bg-neutral-800 border-neutral-700',
                errors.phone && 'border-red-500'
              )}
            />
            {errors.phone && (
              <p className="text-sm text-red-400">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="space-y-6 p-6 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-400 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold">Emergency Contact</h3>
          <span className="text-xs text-amber-500/70 ml-2">(Required)</span>
        </div>

        <p className="text-sm text-neutral-400 mb-4">
          In case of emergency during league activities, who should we contact?
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Emergency Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name" className="text-white">
              Contact Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="emergency_contact_name"
              placeholder="Jane Smith"
              {...register('emergency_contact_name')}
              className={cn(
                'bg-neutral-800 border-neutral-700',
                errors.emergency_contact_name && 'border-red-500'
              )}
            />
            {errors.emergency_contact_name && (
              <p className="text-sm text-red-400">
                {errors.emergency_contact_name.message}
              </p>
            )}
          </div>

          {/* Emergency Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone" className="text-white">
              Contact Phone <span className="text-red-400">*</span>
            </Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              placeholder="(555) 987-6543"
              {...register('emergency_contact_phone')}
              className={cn(
                'bg-neutral-800 border-neutral-700',
                errors.emergency_contact_phone && 'border-red-500'
              )}
            />
            {errors.emergency_contact_phone && (
              <p className="text-sm text-red-400">
                {errors.emergency_contact_phone.message}
              </p>
            )}
          </div>

          {/* Relationship */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="emergency_contact_relationship" className="text-white">
              Relationship <span className="text-red-400">*</span>
            </Label>
            <Select
              value={relationship || ''}
              onValueChange={(value) =>
                setValue('emergency_contact_relationship', value as any, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id="emergency_contact_relationship"
                className={cn(
                  'bg-neutral-800 border-neutral-700',
                  errors.emergency_contact_relationship && 'border-red-500'
                )}
              >
                <SelectValue placeholder="Select relationship..." />
              </SelectTrigger>
              <SelectContent>
                {EMERGENCY_CONTACT_RELATIONSHIPS.map((rel) => (
                  <SelectItem key={rel} value={rel}>
                    {formatRelationship(rel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.emergency_contact_relationship && (
              <p className="text-sm text-red-400">
                {errors.emergency_contact_relationship.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Medical Information (Optional) */}
      <div className="space-y-6 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <Heart className="w-5 h-5 text-red-400" />
          <h3 className="font-semibold">Medical Information</h3>
          <span className="text-xs text-neutral-500 ml-2">(Optional)</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medical_notes" className="text-white">
            Medical Conditions, Allergies, or Special Needs
          </Label>
          <Textarea
            id="medical_notes"
            placeholder="List any medical conditions, allergies, medications, or special accommodations we should be aware of..."
            rows={4}
            {...register('medical_notes')}
            className={cn(
              'bg-neutral-800 border-neutral-700 resize-none',
              errors.medical_notes && 'border-red-500'
            )}
          />
          {errors.medical_notes && (
            <p className="text-sm text-red-400">{errors.medical_notes.message}</p>
          )}
          <p className="text-xs text-neutral-500">
            This information is kept confidential and only shared with medical
            personnel in case of emergency.
          </p>
        </div>
      </div>
    </div>
  );
}
