import { ForgotPasswordForm } from '@/components/auth';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Forgot Password | Beer League Hockey',
  description: 'Reset your Beer League Hockey account password',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordForm />;
}
