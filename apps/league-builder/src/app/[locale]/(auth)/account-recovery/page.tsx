import { SupportTicketForm } from '@/components/auth';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Account Recovery | Beer League Hockey',
  description: 'Contact support for account recovery assistance',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountRecoveryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SupportTicketForm />;
}
