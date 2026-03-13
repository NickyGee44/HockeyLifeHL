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
  Sun,
  Moon,
  Sparkles,
  LayoutGrid,
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
import { getDnsInstructions } from '@/lib/domains/dns-instructions';

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

// Page visibility options
const PAGE_OPTIONS = [
  { key: 'schedule', label: 'Schedule', description: 'Upcoming games, scores, and events' },
  { key: 'standings', label: 'Standings', description: 'League standings table' },
  { key: 'teams', label: 'Teams', description: 'Team rosters and info' },
  { key: 'stats', label: 'Stats', description: 'Player and team statistics' },
  { key: 'news', label: 'News', description: 'League news and announcements' },
  { key: 'history', label: 'History', description: 'League history and hall of fame' },
  { key: 'gallery', label: 'Gallery', description: 'Photos and media' },
  { key: 'about', label: 'About', description: 'League information page' },
];

export function Step5WebsitePages() {
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
  const visiblePages = watch('visiblePages') || {};
  const wantCustomDomain = watch('wantCustomDomain') ?? false;
  const ownsDomain = watch('ownsDomain') ?? false;
  const customDomainName = watch('customDomainName') || '';
  const configuredSitesUrl = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL?.replace(/\/+$/, '');

  const resolvedDomain = React.useMemo(() => {
    if (!configuredSitesUrl) return 'beerleaguehockey.ca';

    try {
      const parsed = new URL(configuredSitesUrl);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.host;
      }
      const parts = parsed.hostname.split('.');
      return parts.length > 2 ? parts.slice(-2).join('.') : parsed.hostname;
    } catch {
      return 'beerleaguehockey.ca';
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
  const customDomainInstructions = React.useMemo(
    () => (ownsDomain && customDomainName ? getDnsInstructions(customDomainName) : null),
    [customDomainName, ownsDomain]
  );

  // Toggle a page visibility
  const togglePage = (pageKey: string) => {
    const current = visiblePages[pageKey] ?? true;
    setValue('visiblePages', { ...visiblePages, [pageKey]: !current });
  };

  return (
    <WizardStepContainer
      title="Website & Pages"
      description="Configure your league's public website appearance, choose which pages to show, and set up your domain."
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
                  Enter a league name in Step 2 to generate your website URL
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
            </CardContent>
          </Card>
        </div>

        {/* Page Visibility Toggles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Page Selection
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose which pages to show on your league website. You can change these anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PAGE_OPTIONS.map((page) => {
              const isEnabled = visiblePages[page.key] !== false;

              return (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => togglePage(page.key)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    isEnabled
                      ? 'border-primary bg-primary/5'
                      : 'border-border opacity-60 hover:opacity-80'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isEnabled
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'
                    }`}
                  >
                    {isEnabled && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{page.label}</p>
                    <p className="text-xs text-muted-foreground">{page.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
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
              Your theme will use these brand colors from Step 2:
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

        {/* Custom Domain Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain
          </h3>

          <Card className={`transition-colors ${wantCustomDomain ? 'bg-rink-500/5 border-rink-500/30' : ''}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-rink-500/10 p-2 rounded-lg">
                    <Globe className="h-5 w-5 text-rink-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Use a Custom Domain</h4>
                    <p className="text-sm text-muted-foreground">
                      Use your own domain like <span className="font-mono text-rink-500">yourleague.com</span> instead
                      of the subdomain
                    </p>
                  </div>
                </div>
                <Switch
                  checked={wantCustomDomain}
                  onCheckedChange={(checked) => {
                    setValue('wantCustomDomain', checked);
                    if (!checked) {
                      setValue('ownsDomain', false);
                      setValue('customDomainName', '');
                    }
                  }}
                />
              </div>

              {wantCustomDomain && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Do you own a domain? */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('ownsDomain', true)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        ownsDomain
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h5 className="font-medium mb-1">I already own a domain</h5>
                      <p className="text-xs text-muted-foreground">
                        Point your existing domain to your league site
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('ownsDomain', false)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        !ownsDomain
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h5 className="font-medium mb-1">I need to buy a domain</h5>
                      <p className="text-xs text-muted-foreground">
                        BLH can help when in-app purchase is available, or you can connect one later
                      </p>
                    </button>
                  </div>

                  {ownsDomain && (
                    <FormField
                      label="Domain Name"
                      error={errors.customDomainName?.message}
                      htmlFor="customDomainName"
                      hint="Enter your domain without https:// (e.g., yourleague.com)"
                    >
                      <Input
                        {...register('customDomainName')}
                        id="customDomainName"
                        placeholder="yourleague.com"
                        error={!!errors.customDomainName}
                      />
                    </FormField>
                  )}

                  {customDomainInstructions && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">DNS Setup Instructions</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        After creating your league, BLH will show these same record details in Domain Settings so you can verify the host once DNS is live.
                      </p>
                      <div className="space-y-2">
                        <code className="text-xs bg-neutral-900 p-2 rounded block">
                          {customDomainInstructions.primaryRecord.type} {customDomainInstructions.primaryRecord.host} → {customDomainInstructions.primaryRecord.value}
                        </code>
                        {customDomainInstructions.additionalRecords.map((record) => (
                          <code
                            key={`${record.type}-${record.host}`}
                            className="text-xs bg-neutral-900 p-2 rounded block"
                          >
                            {record.type} {record.host} → {record.value}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {!ownsDomain && (
                    <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        You can always buy a domain from providers like Namecheap, GoDaddy, or Squarespace and connect it later. If BLH&apos;s purchase integration is available in your environment, Domain Settings will show the in-app buy flow too.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
                    <Input
                      {...register('socialFacebook')}
                      id="socialFacebook"
                      type="url"
                      placeholder="https://facebook.com/yourleague"
                      error={!!errors.socialFacebook}
                    />
                  </FormField>

                  <FormField
                    label="Instagram"
                    error={errors.socialInstagram?.message}
                    htmlFor="socialInstagram"
                  >
                    <Input
                      {...register('socialInstagram')}
                      id="socialInstagram"
                      type="url"
                      placeholder="https://instagram.com/yourleague"
                      error={!!errors.socialInstagram}
                    />
                  </FormField>

                  <FormField
                    label="X (Twitter)"
                    error={errors.socialTwitter?.message}
                    htmlFor="socialTwitter"
                  >
                    <Input
                      {...register('socialTwitter')}
                      id="socialTwitter"
                      type="url"
                      placeholder="https://x.com/yourleague"
                      error={!!errors.socialTwitter}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>

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
              <p className="text-muted-foreground">Pages</p>
              <p>
                {Object.values(visiblePages).filter(Boolean).length} enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardStepContainer>
  );
}
