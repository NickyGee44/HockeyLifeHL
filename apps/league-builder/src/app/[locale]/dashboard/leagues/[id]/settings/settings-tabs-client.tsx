'use client';

import { useState, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  Settings,
  Palette,
  Globe,
  Bell,
  CreditCard,
  Users,
  Shield,
  Trash2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Building2,
  AlertTriangle,
  Receipt,
  ScrollText,
  Mail,
  Gavel,
  ArrowLeft,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Settings, Palette, Globe, Bell, CreditCard, Users, Shield,
  Trash2, ClipboardCheck, ClipboardList, Eye, Building2, AlertTriangle, Receipt, ScrollText, Mail, Gavel,
};

interface SettingItem {
  title: string;
  description: string;
  icon: string;
  href: string;
  highlight?: boolean;
}

interface SettingsTabsClientProps {
  locale: string;
  leagueId: string;
  leagueSettings: SettingItem[];
  orgSettings: SettingItem[];
  initialTab: string;
}

import { archiveLeagueSeason } from '@/lib/actions/seasons';

export function SettingsTabsClient({
  leagueId,
  leagueSettings,
  orgSettings,
  initialTab,
}: SettingsTabsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab);
  const [isArchiving, startArchiveTransition] = useTransition();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'league') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tabs = [
    { id: 'league', label: 'League', icon: Settings },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? tab.danger
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
              )}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* League Tab */}
      {activeTab === 'league' && (
        <div className="space-y-3">
          {leagueSettings.map((section) => (
            <SettingsLink key={section.title} section={section} />
          ))}
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500 mb-4">
            Organization-wide settings that apply across all your leagues
          </p>
          {orgSettings.map((section) => (
            <SettingsLink key={section.title} section={section} />
          ))}
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="space-y-6">
          {/* Archive Season */}
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Archive Season</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Archive the current season. This will hide it from active views but preserve all data.
                  Archived seasons can be restored later.
                </p>
                <button
                  disabled={isArchiving}
                  onClick={() => {
                    if (!confirm('Are you sure you want to archive the most recent completed season? It can be restored later.')) return;
                    startArchiveTransition(async () => {
                      const result = await archiveLeagueSeason(leagueId);
                      if ('error' in result) {
                        toast.error(result.error);
                      } else {
                        toast.success(`Season "${result.seasonName}" has been archived`);
                        router.refresh();
                      }
                    });
                  }}
                  className={cn(
                    'px-4 py-2.5 rounded-xl font-medium text-sm transition-colors',
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
                    'hover:bg-yellow-500/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isArchiving ? 'Archiving...' : 'Archive Season'}
                </button>
                <p className="text-xs text-neutral-500 mt-2">Archives the most recent completed season</p>
              </div>
            </div>
          </div>

          {/* Delete League */}
          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-400 mb-2">Delete League</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Permanently delete this league and all associated data including teams, seasons,
                  games, and statistics. This action cannot be undone.
                </p>
                <button
                  disabled
                  className={cn(
                    'px-4 py-2.5 rounded-xl font-medium text-sm',
                    'bg-red-500/20 text-red-400 border border-red-500/30',
                    'opacity-50 cursor-not-allowed'
                  )}
                >
                  Delete League
                </button>
                <p className="text-xs text-neutral-500 mt-2">Contact support to delete a league</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsLink({ section }: { section: SettingItem }) {
  const Icon = iconMap[section.icon] || Settings;

  return (
    <Link
      href={section.href}
      className={cn(
        'flex items-center gap-4 p-5 rounded-xl transition-all group',
        'bg-white/[0.04] border border-white/10 hover:border-white/20',
        section.highlight && 'border-rink-500/30 bg-rink-500/5'
      )}
    >
      <div className="p-3 rounded-xl transition-colors bg-rink-500/10 text-rink-500 group-hover:bg-rink-500/20">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold transition-colors text-white group-hover:text-rink-500">
            {section.title}
          </h3>
          {section.highlight && (
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
}
