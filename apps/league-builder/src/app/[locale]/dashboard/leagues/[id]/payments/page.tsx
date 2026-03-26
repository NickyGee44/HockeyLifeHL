import { setRequestLocale } from 'next-intl/server';
import { FinancialWorkspaceShell } from '@/components/financials/FinancialWorkspaceShell';
import { getFinancialWorkspaceData } from '@/lib/financial-workspace/get-financial-workspace-data';
import { PaymentDashboard } from './PaymentDashboard';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentTrackingPage({ params, searchParams }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const workspace = await getFinancialWorkspaceData({
    leagueId,
    locale,
    route: 'payments',
    searchParams: await searchParams,
  });

  return (
    <FinancialWorkspaceShell common={workspace.common}>
      {workspace.payments ? (
        <PaymentDashboard
          locale={locale}
          leagueId={leagueId}
          leagueName={workspace.common.leagueName}
          seasons={workspace.common.seasons}
          selectedSeason={workspace.common.selectedSeason}
          payments={workspace.payments.payments}
          summary={workspace.payments.summary}
          total={workspace.payments.total}
          currentPage={workspace.payments.currentPage}
          limit={workspace.payments.limit}
          statusFilter={workspace.payments.statusFilter}
          includeArchived={workspace.payments.includeArchived}
          teams={workspace.payments.teams}
          billingReadiness={workspace.common.billingReadiness}
          focusedPayment={workspace.payments.focusedPayment}
          viewerRole={workspace.common.viewerRole}
        />
      ) : null}
    </FinancialWorkspaceShell>
  );
}
