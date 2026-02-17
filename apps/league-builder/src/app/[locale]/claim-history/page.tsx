import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ClaimHistoryClient } from './ClaimHistoryClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ClaimHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect(`/${locale}/login`);
  }

  return <ClaimHistoryClient locale={locale} />;
}
