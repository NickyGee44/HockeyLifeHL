import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { OrganizationProfileForm } from './organization-profile-form';
import { Copy, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrganizationProfilePage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();

  // Get the first organization (for now, assuming single org per user)
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  const orgData = organization as any;

  return (
    <div className="space-y-8">
      {/* Organization Profile Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Organization Profile</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your organization's basic information and settings
          </p>
        </div>
        <OrganizationProfileForm organization={orgData} />
      </section>

      {/* Organization ID Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Organization ID</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Your unique organization identifier for API integrations
          </p>
        </div>
        <div className="bg-neutral-800 border border-gold-500/20 rounded-xl p-4 flex items-center justify-between">
          <code className="text-sm text-gold-500 font-mono">{orgData.id}</code>
          <button
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-neutral-400 hover:text-gold-500 hover:bg-neutral-700'
            )}
            title="Copy ID"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Irreversible and destructive actions
          </p>
        </div>
        <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-2">Delete Organization</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Permanently delete this organization and all associated leagues, teams, and
            data. This action cannot be undone.
          </p>
          <button
            disabled
            className={cn(
              'px-4 py-2.5 rounded-xl font-medium text-sm',
              'bg-red-500/20 text-red-400 border border-red-500/30',
              'opacity-50 cursor-not-allowed'
            )}
          >
            Delete Organization
          </button>
          <p className="text-xs text-neutral-500 mt-3">
            Contact support to delete your organization
          </p>
        </div>
      </section>
    </div>
  );
}
