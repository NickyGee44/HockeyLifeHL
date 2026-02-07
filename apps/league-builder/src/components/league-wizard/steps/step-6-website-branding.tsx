'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Globe,
  Eye,
  EyeOff,
  Palette,
  ImageIcon,
  Link2,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import {
  Input,
  FormField,
  Card,
  CardContent,
  Button,
} from '@hockey-life/ui';
import { Switch } from '@/components/ui/switch';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';
import { generateSlug } from '@/lib/schemas/league-wizard';

// Theme preset options
const THEME_PRESETS = [
  {
    value: 'dark' as const,
    label: 'Dark Theme',
    description: 'Modern dark mode with your brand colors',
    icon: Moon,
    preview: 'bg-neutral-900',
  },
  {
    value: 'light' as const,
    label: 'Light Theme',
    description: 'Clean light mode with your brand colors',
    icon: Sun,
    preview: 'bg-white',
  },
  {
    value: 'custom' as const,
    label: 'Custom Theme',
    description: 'Advanced customization options',
    icon: Sparkles,
    preview: 'bg-gradient-to-r from-neutral-900 to-neutral-700',
  },
];

export function Step6WebsiteBranding() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  // Watch relevant fields
  const leagueName = watch('name') || '';
  const primaryColor = watch('primary_color') || '#22D3EE';
  const secondaryColor = watch('secondary_color') || '#1a1a1a';
  const isPublic = watch('isPublic') ?? true;
  const themePreset = watch('themePreset') || 'dark';
  const bannerUrl = watch('bannerUrl') || '';
  const socialFacebook = watch('socialFacebook') || '';
  const socialInstagram = watch('socialInstagram') || '';
  const socialTwitter = watch('socialTwitter') || '';
  const configuredSitesUrl = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL?.replace(/\/+$/, '');
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hockeylifehl.com';

  const resolvedDomain = React.useMemo(() => {
    if (!configuredSitesUrl) return 'hockeylifehl.com';

    try {
      const parsed = new URL(configuredSitesUrl);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.host;
      }
      const parts = parsed.hostname.split('.');
      return parts.length > 2 ? parts.slice(-2).join('.') : parsed.hostname;
    } catch {
      return 'hockeylifehl.com';
    }
  }, [configuredSitesUrl]);

  const usePathPreview = React.useMemo(() => {
    if (!configuredSitesUrl) return false;
    try {
      const parsed = new URL(configuredSitesUrl);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }, [configuredSitesUrl]);

  // State for advanced options collapse
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Generate subdomain from league name
  const subdomain = generateSlug(leagueName);
  const fullDomain = subdomain ? `${subdomain}.${resolvedDomain}` : `your-league.${resolvedDomain}`;
  const previewUrl = subdomain
    ? usePathPreview && configuredSitesUrl
      ? `${configuredSitesUrl}/${subdomain}`
      : `https://${fullDomain}`
    : '';
  const previewDisplay = subdomain ? previewUrl.replace(/^https?:\/\//, '') : fullDomain;

  return (
    <WizardStepContainer
      title="Website & Branding"
      description="Configure your league's public website appearance and visibility settings."
    >
      <div className="space-y-6">
        {/* Subdomain Preview Section */}
        <Card className="bg-neutral-800/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-rink-500/10 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-rink-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Your League Website</h3>
                <p className="text-sm text-muted-foreground">
                  Your league will have its own public website at this address
                </p>
              </div>
            </div>

            {/* Domain Preview */}
            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-medium">
                    HTTPS
                  </div>
                  <span className="text-lg font-mono">
                    <span className="text-rink-500">{previewDisplay}</span>
                  </span>
                </div>
                {subdomain && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(previewUrl, '_blank')}
                    className="text-muted-foreground hover:text-rink-500"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                )}
              </div>

              {!subdomain && (
                <p className="text-xs text-muted-foreground mt-2">
                  Enter a league name in Step 1 to generate your website URL
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visibility Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {isPublic ? (
              <Eye className="h-5 w-5 text-green-500" />
            ) : (
              <EyeOff className="h-5 w-5 text-orange-500" />
            )}
            Visibility Settings
          </h3>

          <Card className={`transition-colors ${isPublic ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isPublic ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                    {isPublic ? (
                      <Eye className="h-5 w-5 text-green-500" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {isPublic ? 'Public League' : 'Private League'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isPublic
                        ? 'Visible in league directory and searchable by players'
                        : 'Only accessible via direct link, hidden from public listings'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={(checked) => setValue('isPublic', checked)}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>

              {/* Info callout for visibility */}
              <div className="mt-4 bg-muted/50 p-3 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  {isPublic ? (
                    <>
                      <strong>Public leagues:</strong> Appear in the league directory, can be found by searching,
                      and allow anyone to view standings, schedules, and stats.
                    </>
                  ) : (
                    <>
                      <strong>Private leagues:</strong> Only people with the direct link can access your league.
                      Perfect for invitation-only or company leagues.
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Theme Preset Selector */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Preset
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = themePreset === preset.value;

              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setValue('themePreset', preset.value)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-rink-500 bg-rink-500/5'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  {/* Theme Preview */}
                  <div
                    className={`h-20 rounded-md mb-3 ${preset.preview} border border-neutral-600 overflow-hidden`}
                  >
                    {/* Mini preview of website */}
                    <div className="h-4 flex items-center gap-1 px-2 bg-neutral-800/50">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                      <div className="w-8 h-1 bg-neutral-600 rounded" />
                    </div>
                    <div className="p-2">
                      <div
                        className="w-full h-2 rounded mb-1"
                        style={{ backgroundColor: primaryColor, opacity: 0.5 }}
                      />
                      <div className="flex gap-1">
                        <div className="w-6 h-4 rounded bg-neutral-700" />
                        <div className="w-6 h-4 rounded bg-neutral-700" />
                        <div className="w-6 h-4 rounded bg-neutral-700" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-rink-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{preset.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-rink-500 text-black rounded-full p-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Color Preview */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Your theme will use these brand colors from Step 1:
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-md border-2 border-neutral-600"
                  style={{ backgroundColor: primaryColor }}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Primary</p>
                  <p className="text-sm font-mono">{primaryColor}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-md border-2 border-neutral-600"
                  style={{ backgroundColor: secondaryColor }}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Secondary</p>
                  <p className="text-sm font-mono">{secondaryColor}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Options (Collapsible) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-lg font-semibold hover:text-rink-500 transition-colors w-full"
          >
            <Sparkles className="h-5 w-5" />
            Advanced Options
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-6 pl-7 border-l-2 border-neutral-700">
              {/* Banner Image */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium">Banner Image</h4>
                </div>

                <FormField
                  label="Banner Image URL"
                  error={errors.bannerUrl?.message}
                  htmlFor="bannerUrl"
                  hint="Optional. A banner image displayed at the top of your league website. Recommended size: 1920x400px"
                >
                  <Input
                    {...register('bannerUrl')}
                    id="bannerUrl"
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    error={!!errors.bannerUrl}
                  />
                </FormField>

                {bannerUrl && (
                  <div className="rounded-lg overflow-hidden border border-neutral-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerUrl}
                      alt="Banner preview"
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium">Social Media Links</h4>
                </div>

                <p className="text-sm text-muted-foreground">
                  Optional. Add social media links to display on your league website.
                </p>

                <div className="space-y-4">
                  <FormField
                    label="Facebook"
                    error={errors.socialFacebook?.message}
                    htmlFor="socialFacebook"
                  >
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <Input
                        {...register('socialFacebook')}
                        id="socialFacebook"
                        type="url"
                        placeholder="https://facebook.com/yourleague"
                        className="pl-10"
                        error={!!errors.socialFacebook}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Instagram"
                    error={errors.socialInstagram?.message}
                    htmlFor="socialInstagram"
                  >
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                      </svg>
                      <Input
                        {...register('socialInstagram')}
                        id="socialInstagram"
                        type="url"
                        placeholder="https://instagram.com/yourleague"
                        className="pl-10"
                        error={!!errors.socialInstagram}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="X (Twitter)"
                    error={errors.socialTwitter?.message}
                    htmlFor="socialTwitter"
                  >
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <Input
                        {...register('socialTwitter')}
                        id="socialTwitter"
                        type="url"
                        placeholder="https://x.com/yourleague"
                        className="pl-10"
                        error={!!errors.socialTwitter}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Domain Info Card */}
        <Card className="bg-gradient-to-r from-rink-500/10 to-rink-500/5 border-rink-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-rink-500/20 p-3 rounded-lg">
                <Globe className="h-6 w-6 text-rink-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-1">Want a Custom Domain?</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Use your own domain like <span className="font-mono text-rink-500">yourleague.com</span> instead
                  of the subdomain. Perfect for established leagues looking for a professional presence.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`mailto:${supportEmail}?subject=Custom%20Domain%20Setup%20Request`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-rink-500 hover:text-rink-400 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Contact us for custom domain setup
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Custom domain add-on available for established leagues
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Website Preview Summary */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Configuration Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Domain</p>
              <p className="font-mono truncate">{previewDisplay}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibility</p>
              <p className={isPublic ? 'text-green-500' : 'text-orange-500'}>
                {isPublic ? 'Public' : 'Private'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Theme</p>
              <p className="capitalize">{themePreset}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Social Links</p>
              <p>
                {[socialFacebook, socialInstagram, socialTwitter].filter(Boolean).length} configured
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardStepContainer>
  );
}
