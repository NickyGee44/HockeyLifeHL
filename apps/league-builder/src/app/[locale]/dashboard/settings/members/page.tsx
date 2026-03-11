import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationMembers } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { MembersTable } from '@/components/dashboard/settings/members-table';
import { InviteMemberForm } from '@/components/dashboard/settings/invite-member-form';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TeamMembersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null; // TypeScript needs this after redirect
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null; // TypeScript needs this after redirect
  }

  const orgData = organization as any;
  const members = await getOrganizationMembers(orgData.id);

  return (
    <div className="space-y-6">
      {/* Info Banner: League Staff vs Org Members */}
      <div className="bg-rink-500/10 border border-rink-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rink-400 mb-1">
              Looking for league-level staff?
            </h3>
            <p className="text-sm text-neutral-300">
              This page manages organization-level members who can access all leagues.
              To manage staff for a specific league (scorekeepers, referees, etc.),
              visit the league&apos;s staff settings instead.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-rink-500 hover:text-rink-400 transition-colors"
            >
              Go to your leagues &rarr;
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Add new team members to help manage your organization and leagues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteMemberForm organizationId={orgData.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this organization ({members?.length || 0} member{members?.length !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={(members || []) as any}
            organizationId={orgData.id}
            currentUserId={userData.user.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>
            Understanding team member roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Owner</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full access to all organization settings, billing, and team management. Can delete the organization.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Admin</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Can manage leagues, team members, organization settings, billing, and domain setup. Cannot delete the organization.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Member</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Can view and manage leagues assigned to them. Read-only access to organization settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
