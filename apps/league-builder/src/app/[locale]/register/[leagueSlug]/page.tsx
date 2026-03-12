import { setRequestLocale } from 'next-intl/server';
import RegisterPage from '@/app/register/[leagueSlug]/page';

interface LocalizedRegisterPageProps {
  params: Promise<{ locale: string; leagueSlug: string }>;
  searchParams: Promise<{ step?: string; season?: string }>;
}

export default async function LocalizedRegisterPage({
  params,
  searchParams,
}: LocalizedRegisterPageProps) {
  const { locale, leagueSlug } = await params;
  const resolvedSearchParams = await searchParams;

  setRequestLocale(locale);

  return (
    <RegisterPage
      params={{ leagueSlug }}
      searchParams={resolvedSearchParams}
    />
  );
}
