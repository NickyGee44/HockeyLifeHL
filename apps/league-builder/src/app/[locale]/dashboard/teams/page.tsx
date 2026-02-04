import { getCurrentUser } from '@/lib/actions/auth';
import { getUserTeams } from '@/lib/actions/teams';
import { redirect } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { Plus, Users, ArrowLeft, Search, Filter } from 'lucide-react';
import { TeamCard } from '@/components/teams';
import TeamsListClient from '@/components/dashboard/teams/teams-list-client';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Teams | Beer League Hockey',
  description: 'Manage your hockey teams',
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; status?: string }>;
};

export default async function TeamsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status as 'active' | 'inactive' | 'pending' | undefined;
  const search = resolvedSearchParams.search;

  const result = await getUserTeams({ status, search });

  if (result.error) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <p className="text-red-400">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const teams = result.data || [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight">All Teams</h1>
            <p className="text-neutral-400 mt-2">
              Manage teams across all your leagues
            </p>
          </div>
        </div>

        {/* Search and Filter Client Component */}
        <TeamsListClient
          teams={teams}
          initialSearch={search || ''}
          initialStatus={status || ''}
        />
      </div>
    </div>
  );
}
