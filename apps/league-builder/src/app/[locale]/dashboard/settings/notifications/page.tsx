import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { NotificationPreferences } from '@/components/notifications';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NotificationSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notification Preferences</h2>
        <p className="text-[#a3a3a3]">
          Control how and when you receive notifications from Beer League Hockey
        </p>
      </div>

      {/* Notification Preferences Component */}
      <NotificationPreferences />
    </div>
  );
}
