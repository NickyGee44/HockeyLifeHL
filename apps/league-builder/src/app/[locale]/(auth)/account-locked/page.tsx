import { AccountLockedMessage } from '@/components/auth';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Account Locked | Beer League Hockey',
  description: 'Your account has been temporarily locked',
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ until?: string; email?: string }>;
};

function getDefaultLockTime(): string {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

export default async function AccountLockedPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { until, email } = await searchParams;

  // Default to 15 minutes from now if no lockedUntil provided
  const lockedUntil = until || getDefaultLockTime();

  return <AccountLockedMessage lockedUntil={lockedUntil} email={email} />;
}
