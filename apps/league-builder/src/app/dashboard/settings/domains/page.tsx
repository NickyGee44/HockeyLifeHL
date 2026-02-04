/**
 * Domain Settings Page
 *
 * Allows organizations to manage their subdomain and custom domain settings.
 * Custom domains require Enterprise plan or can be purchased as an add-on.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { DomainSettingsContent } from './domain-settings-content';

export const dynamic = 'force-dynamic';

export default async function DomainSettingsPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  return <DomainSettingsContent organization={organization} />;
}
