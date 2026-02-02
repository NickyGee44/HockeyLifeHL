import AccountLockedClient from './account-locked-client';

// Opt out of static rendering since this page uses useSearchParams
export const dynamic = 'force-dynamic';

export default function AccountLockedPage() {
  return <AccountLockedClient />;
}
