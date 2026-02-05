import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Settings,
  Palette,
  Globe,
  Bell,
  CreditCard,
  Users,
  Shield,
  Trash2,
  ClipboardCheck,
  Eye,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueSettingsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Settings Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  const settingsSections = [
    {
      title: 'General',
      description: 'Basic league information and settings',
      icon: Settings,
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/general`,
      available: true,
    },
    {
      title: 'Website Editor',
      description: 'Customize your league website with live preview',
      icon: Eye,
      href: `/${locale}/dashboard/settings/website-editor`,
      available: true,
      highlight: true,
    },
    {
      title: 'Branding',
      description: 'Logo, colors, and visual identity',
      icon: Palette,
      href: `/${locale}/dashboard/settings/branding`,
      available: true,
    },
    {
      title: 'Custom Domain',
      description: 'Set up your own domain for the league website',
      icon: Globe,
      href: `/${locale}/dashboard/settings/domains`,
      available: true,
    },
    {
      title: 'Notifications',
      description: 'Email and push notification preferences',
      icon: Bell,
      href: `/${locale}/dashboard/settings/notifications`,
      available: true,
    },
    {
      title: 'Billing',
      description: 'Payment collection and fee settings',
      icon: CreditCard,
      href: `/${locale}/dashboard/leagues/${leagueId}/billing`,
      available: true,
    },
    {
      title: 'Scorekeepers',
      description: 'Manage scorekeepers and game assignments',
      icon: ClipboardCheck,
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/scorekeepers`,
      available: true,
    },
    {
      title: 'Staff & Permissions',
      description: 'Manage league administrators and roles',
      icon: Users,
      href: `/${locale}/dashboard/settings/members`,
      available: true,
    },
    {
      title: 'Privacy',
      description: 'Data privacy and visibility settings',
      icon: Shield,
      href: `/${locale}/dashboard/settings/privacy`,
      available: true,
    },
    {
      title: 'Danger Zone',
      description: 'Delete league or transfer ownership',
      icon: Trash2,
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/danger`,
      available: false,
      danger: true,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">League Settings</h1>
          <p className="text-neutral-400 mt-1">
            Configure {league.name} settings and preferences
          </p>
        </div>

        {/* League Info Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <LeagueLogo
              logoUrl={league.logo_url}
              leagueName={league.name}
              primaryColor={league.primary_color || '#22D3EE'}
              size="lg"
              shape="square"
              bordered
            />
            <div>
              <h2 className="text-xl font-bold text-white">{league.name}</h2>
              <p className="text-neutral-400">{league.city}, {league.state_province}</p>
              <p className="text-sm text-neutral-500 mt-1">
                Subdomain: {league.subdomain || league.slug}.hockeylifehl.com
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-3">
          {settingsSections.map((section) => {
            const Icon = section.icon;

            if (!section.available) {
              return (
                <div
                  key={section.title}
                  className={cn(
                    'flex items-center gap-4 p-5 rounded-xl opacity-50 cursor-not-allowed',
                    'bg-white/[0.02] border border-white/5',
                    section.danger && 'border-red-500/20'
                  )}
                >
                  <div className={cn(
                    'p-3 rounded-xl',
                    section.danger ? 'bg-red-500/10 text-red-500' : 'bg-neutral-800 text-neutral-500'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className={cn(
                      'font-semibold',
                      section.danger ? 'text-red-500' : 'text-neutral-500'
                    )}>
                      {section.title}
                    </h3>
                    <p className="text-sm text-neutral-600">{section.description}</p>
                  </div>
                  <span className="text-xs text-neutral-600 bg-neutral-800 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={section.title}
                href={section.href}
                className={cn(
                  'flex items-center gap-4 p-5 rounded-xl transition-all group',
                  'bg-white/[0.04] border border-white/10 hover:border-white/20',
                  section.danger && 'hover:border-red-500/50',
                  (section as any).highlight && 'border-rink-500/30 bg-rink-500/5'
                )}
              >
                <div className={cn(
                  'p-3 rounded-xl transition-colors',
                  section.danger
                    ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20'
                    : 'bg-rink-500/10 text-rink-500 group-hover:bg-rink-500/20'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      'font-semibold transition-colors',
                      section.danger
                        ? 'text-red-500'
                        : 'text-white group-hover:text-rink-500'
                    )}>
                      {section.title}
                    </h3>
                    {(section as any).highlight && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rink-500 text-black rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400">{section.description}</p>
                </div>
                <ArrowLeft className="w-5 h-5 text-neutral-500 rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
