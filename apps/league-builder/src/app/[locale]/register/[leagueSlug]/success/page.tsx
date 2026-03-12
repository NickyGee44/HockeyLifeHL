import { setRequestLocale } from 'next-intl/server';
import RegistrationSuccessPage from '@/app/register/[leagueSlug]/success/page';

interface LocalizedRegistrationSuccessPageProps {
  params: Promise<{ locale: string; leagueSlug: string }>;
  searchParams: Promise<{ id?: string }>;
}

export default async function LocalizedRegistrationSuccessPage({
  params,
  searchParams,
}: LocalizedRegistrationSuccessPageProps) {
  const { locale, leagueSlug } = await params;
  const resolvedSearchParams = await searchParams;

  setRequestLocale(locale);

  return (
    <RegistrationSuccessPage
      params={{ leagueSlug }}
      searchParams={resolvedSearchParams}
    />
  );
}
