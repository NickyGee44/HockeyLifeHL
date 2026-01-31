import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { OrganizationProfileForm } from './organization-profile-form';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            Manage your organization's basic information and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationProfileForm organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization ID</CardTitle>
          <CardDescription>
            Your unique organization identifier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
            <code className="text-sm text-gray-600 dark:text-gray-300">
              {organization.id}
            </code>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Use this ID when integrating with the HockeyLife API
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-red-200 dark:border-red-800 rounded-md p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Delete Organization
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permanently delete this organization and all associated leagues, teams, and data.
              This action cannot be undone.
            </p>
            <button
              disabled
              className="px-4 py-2 bg-red-600 text-white rounded-md opacity-50 cursor-not-allowed"
            >
              Delete Organization
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Contact support to delete your organization
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
