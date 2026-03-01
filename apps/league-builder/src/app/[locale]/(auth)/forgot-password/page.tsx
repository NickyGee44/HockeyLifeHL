import { ForgotPasswordForm } from '@/components/auth';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.metadata' });
  return {
    title: t('forgotPasswordTitle'),
    description: t('forgotPasswordDescription'),
  };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordForm />;
}
