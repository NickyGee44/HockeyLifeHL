import { AccountLockedMessage } from '@/components/auth';
import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Account Locked | Beer League Hockey',
  description: 'Your account has been temporarily locked',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountLockedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AccountLockedMessage />;
}
