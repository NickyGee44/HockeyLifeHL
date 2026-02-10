'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Input, Textarea, FormField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hockey-life/ui';
import { updateLeagueSettings } from '@/lib/actions/league-settings';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Toronto', label: 'Eastern Time - Canada (ET)' },
  { value: 'America/Winnipeg', label: 'Central Time - Canada (CT)' },
  { value: 'America/Edmonton', label: 'Mountain Time - Canada (MT)' },
  { value: 'America/Vancouver', label: 'Pacific Time - Canada (PT)' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time (NT)' },
];

const COUNTRIES = [
  { value: 'Canada', label: 'Canada' },
  { value: 'USA', label: 'United States' },
  { value: 'Other', label: 'Other' },
];

interface GeneralSettingsFormProps {
  leagueId: string;
  initialData: {
    name: string;
    description: string;
    city: string;
    state_province: string;
    country: string;
    timezone: string;
    contact_email: string;
    contact_phone: string;
  };
}

export function GeneralSettingsForm({ leagueId, initialData }: GeneralSettingsFormProps) {
  const t = useTranslations('settings');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialData);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('League name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await updateLeagueSettings(leagueId, {
        name: formData.name,
        description: formData.description || null,
        city: formData.city || null,
        state_province: formData.state_province || null,
        country: formData.country || null,
        timezone: formData.timezone || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
      });

      if (result.success) {
        toast.success(t('saved'));
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">{t('basicInfo')}</h2>
        <div className="space-y-4">
          <FormField label={t('leagueName')} required htmlFor="name">
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Downtown Hockey League"
            />
          </FormField>

          <FormField label={t('description')} htmlFor="description">
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Tell players about your league..."
              rows={4}
            />
          </FormField>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">{t('location')}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('city')} htmlFor="city">
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="e.g., Toronto"
              />
            </FormField>

            <FormField label={t('stateProvince')} htmlFor="state_province">
              <Input
                id="state_province"
                value={formData.state_province}
                onChange={(e) => handleChange('state_province', e.target.value)}
                placeholder="e.g., Ontario"
              />
            </FormField>
          </div>

          <FormField label={t('country')} htmlFor="country">
            <Select
              value={formData.country}
              onValueChange={(value) => handleChange('country', value)}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={t('timezone')} htmlFor="timezone">
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger id="timezone">
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

      {/* Contact */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">{t('contactInfo')}</h2>
        <div className="space-y-4">
          <FormField label={t('contactEmail')} htmlFor="contact_email">
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              placeholder="league@example.com"
            />
          </FormField>

          <FormField label={t('contactPhone')} htmlFor="contact_phone">
            <Input
              id="contact_phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </FormField>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? t('saving') : t('saveChanges')}
        </button>
      </div>
    </form>
  );
}
