import { SupportTicketForm } from '@/components/auth';

export const metadata = {
  title: 'Account Recovery | Beer League Hockey',
  description: 'Get help recovering your Beer League Hockey account',
};

interface AccountRecoveryPageProps {
  searchParams: Promise<{
    email?: string;
    type?: string;
  }>;
}

export default async function AccountRecoveryPage({ searchParams }: AccountRecoveryPageProps) {
  const params = await searchParams;

  return (
    <SupportTicketForm
      defaultEmail={params.email}
      defaultType={params.type}
    />
  );
}
