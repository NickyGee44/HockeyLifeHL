import { AccountLockedMessage } from '@/components/auth';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ until?: string; email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.metadata' });
  return {
    title: t('accountLockedTitle'),
    description: t('accountLockedDescription'),
  };
}

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
