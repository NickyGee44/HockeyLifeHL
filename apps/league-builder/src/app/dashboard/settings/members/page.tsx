import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationMembers } from '@/lib/actions/organization';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { MembersTable } from './members-table';
import { InviteMemberForm } from './invite-member-form';

export default async function TeamMembersPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  const members = await getOrganizationMembers(organization.id);

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
          <InviteMemberForm organizationId={organization.id} />
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
            members={members || []}
            organizationId={organization.id}
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
