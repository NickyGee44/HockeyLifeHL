/**
 * Domain Settings Page (Localized)
 *
 * Allows organizations to manage their subdomain and custom domain settings.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { DomainSettingsContent } from '@/components/dashboard/domain-settings-content';
import { setRequestLocale } from 'next-intl/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { getLeagueDomain } from '@/lib/actions/domain';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ league?: string }>;
};

export default async function DomainSettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { league: leagueId } = await searchParams;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null; // TypeScript needs this after redirect
  }

  const organizations = await getUserOrganizations();
  let organization = organizations[0];
  let selectedLeague: {
    id: string;
    name: string;
    slug: string;
    subdomain?: string | null;
  } | null = null;

  const serviceClient = createServiceRoleClient();

  if (leagueId) {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (access.authorized) {
      const { data: league } = await serviceClient
        .from('leagues')
        .select('id, name, slug, subdomain, organization_id')
        .eq('id', leagueId)
        .maybeSingle();

      if (league?.organization_id) {
        const matchingOrganization = organizations.find((item) => item.id === league.organization_id);
        if (matchingOrganization) {
          organization = matchingOrganization;
        }
      }

      if (league) {
        selectedLeague = {
          id: league.id,
          name: league.name,
          slug: league.slug,
          subdomain: (league as { subdomain?: string | null }).subdomain ?? null,
        };
      }
    }
  }

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null; // TypeScript needs this after redirect
  }

  if (!selectedLeague) {
    const { data: fallbackLeague } = await serviceClient
      .from('leagues')
      .select('id, name, slug, subdomain')
      .eq('organization_id', organization.id)
      .order('name')
      .limit(1)
      .maybeSingle();

    if (fallbackLeague) {
      selectedLeague = {
        id: fallbackLeague.id,
        name: fallbackLeague.name,
        slug: fallbackLeague.slug,
        subdomain: (fallbackLeague as { subdomain?: string | null }).subdomain ?? null,
      };
    }
  }

  if (!selectedLeague) {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  const domainResult = await getLeagueDomain(selectedLeague.id);
  const domainData = domainResult.data;

  return (
    <DomainSettingsContent
      organizationName={organization.name}
      purchaseCapability={
        domainData?.purchaseCapability ?? {
          searchEnabled: false,
          purchaseEnabled: false,
          vercelProjectConfigured: false,
          message: 'Domain purchase is not configured in this environment yet.',
        }
      }
      domainState={{
        leagueId: selectedLeague.id,
        leagueName: selectedLeague.name,
        leagueSlug: selectedLeague.slug,
        leagueSubdomain: selectedLeague.subdomain ?? null,
        effectiveCustomDomain: domainData?.effectiveCustomDomain ?? null,
        effectiveCustomDomainVerified: domainData?.effectiveCustomDomainVerified ?? false,
        domainSource: domainData?.domainSource ?? null,
        requiresManualReview: domainData?.requiresManualReview ?? false,
        hasCustomDomainAccess: domainData?.hasCustomDomainAccess ?? false,
        legacyOrganizationDomain:
          domainData?.domainSource === 'legacy_organization' || domainData?.requiresManualReview
            ? domainData.organization?.custom_domain ?? null
            : null,
      }}
    />
  );
}
