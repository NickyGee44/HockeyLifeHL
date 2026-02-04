import { ResetPasswordForm } from '@/components/auth';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Reset Password | Beer League Hockey',
  description: 'Create a new password for your account',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResetPasswordForm />;
}
