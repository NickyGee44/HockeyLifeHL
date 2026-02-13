import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationMembers } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
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
                Can manage leagues, team members, and organization settings. Cannot access billing or delete the organization.
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
