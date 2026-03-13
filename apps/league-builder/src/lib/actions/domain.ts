'use server';

import dns from 'dns';
import { promisify } from 'util';
import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import {
  getDnsInstructions as buildDnsInstructions,
  isValidCustomDomainFormat,
  normalizeDomainInput,
  VERCEL_APEX_IP,
  VERCEL_CNAME_TARGET,
  VERCEL_FALLBACK_IPS,
} from '@/lib/domains/dns-instructions';

const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);
const isDevelopment = process.env.NODE_ENV !== 'production';

export type DomainVerificationResult = {
  error?: string;
  success?: boolean;
  verified?: boolean;
  message?: string;
  status?: 'pending' | 'verified' | 'failed';
};

export type DomainSearchResult = {
  name: string;
  price: number;
  available: boolean;
  premium: boolean;
};

export type DomainPurchaseCapability = {
  searchEnabled: boolean;
  purchaseEnabled: boolean;
  vercelProjectConfigured: boolean;
  message: string | null;
};

export type LeagueDomainBindingSource = 'league' | 'legacy_organization' | null;

export type LeagueDomainDetails = {
  league: {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    custom_domain: string | null;
    custom_domain_verified: boolean;
    subscription_status: string | null;
    subscription_tier: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    custom_domain: string | null;
    custom_domain_verified: boolean;
    subscription_status: string | null;
    subscription_tier: string | null;
  } | null;
  effectiveCustomDomain: string | null;
  effectiveCustomDomainVerified: boolean;
  domainSource: LeagueDomainBindingSource;
  requiresManualReview: boolean;
  hasCustomDomainAccess: boolean;
  purchaseCapability: DomainPurchaseCapability;
};

type ManagedLeague = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  organization_id: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
  subscription_status: string | null;
  subscription_tier: string | null;
};

type ManagedOrganization = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
  subscription_status: string | null;
  subscription_tier: string | null;
};

type LeagueDomainAccess = {
  league: ManagedLeague;
  organization: ManagedOrganization | null;
  organizationLeagueCount: number;
  effectiveCustomDomain: string | null;
  effectiveCustomDomainVerified: boolean;
  domainSource: LeagueDomainBindingSource;
  requiresManualReview: boolean;
  hasCustomDomainAccess: boolean;
};

type VercelDomainResult = {
  success: boolean;
  pending?: boolean;
  error?: string;
};

const SEARCH_TLDS = ['.com', '.ca', '.net', '.hockey', '.org'];

function hasActiveSubscription(status: string | null | undefined) {
  return ['active', 'trialing'].includes(status ?? '');
}

function getLeagueSitesProjectConfig() {
  return {
    projectId: process.env.VERCEL_LEAGUE_SITES_PROJECT_ID ?? '',
    token: process.env.VERCEL_TOKEN ?? '',
  };
}

export async function getDomainPurchaseCapability(): Promise<DomainPurchaseCapability> {
  const { projectId, token } = getLeagueSitesProjectConfig();
  const searchEnabled = Boolean(token);
  const vercelProjectConfigured = Boolean(projectId);
  const purchaseEnabled = searchEnabled && vercelProjectConfigured;

  if (purchaseEnabled) {
    return {
      searchEnabled: true,
      purchaseEnabled: true,
      vercelProjectConfigured: true,
      message: null,
    };
  }

  if (!searchEnabled && !vercelProjectConfigured) {
    return {
      searchEnabled: false,
      purchaseEnabled: false,
      vercelProjectConfigured: false,
      message: 'In-app domain search and purchase are not configured in this environment yet. You can still connect a domain you already own.',
    };
  }

  if (!vercelProjectConfigured) {
    return {
      searchEnabled,
      purchaseEnabled: false,
      vercelProjectConfigured: false,
      message: 'Domain purchase is temporarily unavailable because the league-sites Vercel project is not configured. Bring-your-own domain is still available.',
    };
  }

  return {
    searchEnabled,
    purchaseEnabled: false,
    vercelProjectConfigured,
    message: 'Domain search is temporarily unavailable. You can still connect a domain you already own.',
  };
}

async function getLeagueDomainAccess(leagueId: string): Promise<{ error?: string } & Partial<LeagueDomainAccess>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Only league owners and league admins can manage website domains.' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: league, error: leagueError } = await serviceClient
    .from('leagues')
    .select('id, name, slug, subdomain, organization_id, custom_domain, custom_domain_verified, subscription_status, subscription_tier')
    .eq('id', leagueId)
    .maybeSingle();

  if (leagueError || !league) {
    return { error: 'League not found' };
  }

  let organization: ManagedOrganization | null = null;
  let organizationLeagueCount = 0;

  if (league.organization_id) {
    const [{ data: org }, { count }] = await Promise.all([
      serviceClient
        .from('organizations')
        .select('id, name, slug, custom_domain, custom_domain_verified, subscription_status, subscription_tier')
        .eq('id', league.organization_id)
        .maybeSingle(),
      serviceClient
        .from('leagues')
        .select('id', { head: true, count: 'exact' })
        .eq('organization_id', league.organization_id)
        .or('status.is.null,status.neq.archived'),
    ]);

    organization = (org as ManagedOrganization | null) ?? null;
    organizationLeagueCount = count ?? 0;
  }

  const canUseLegacyOrganizationDomain =
    Boolean(organization?.custom_domain) && !league.custom_domain && organizationLeagueCount === 1;
  const requiresManualReview =
    Boolean(organization?.custom_domain) && !league.custom_domain && organizationLeagueCount > 1;

  const effectiveCustomDomain = league.custom_domain ?? (canUseLegacyOrganizationDomain ? organization?.custom_domain ?? null : null);
  const effectiveCustomDomainVerified = league.custom_domain
    ? Boolean(league.custom_domain_verified)
    : canUseLegacyOrganizationDomain
      ? Boolean(organization?.custom_domain_verified)
      : false;
  const domainSource: LeagueDomainBindingSource = league.custom_domain
    ? 'league'
    : canUseLegacyOrganizationDomain
      ? 'legacy_organization'
      : null;

  const hasCustomDomainAccess =
    hasActiveSubscription(league.subscription_status) ||
    hasActiveSubscription(organization?.subscription_status) ||
    Boolean(effectiveCustomDomain);

  return {
    league: league as ManagedLeague,
    organization,
    organizationLeagueCount,
    effectiveCustomDomain,
    effectiveCustomDomainVerified,
    domainSource,
    requiresManualReview,
    hasCustomDomainAccess,
  };
}

async function syncLegacyOrganizationDomain(
  organization: ManagedOrganization | null,
  organizationLeagueCount: number,
  domain: string | null,
  verified: boolean
) {
  if (!organization?.id || organizationLeagueCount !== 1) {
    return;
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('organizations')
    .update({
      custom_domain: domain,
      custom_domain_verified: domain ? verified : false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organization.id);

  if (error && isDevelopment) {
    console.error('[domain] Failed to sync legacy organization domain', error);
  }
}

async function findProjectDomain(domain: string): Promise<boolean> {
  const { projectId, token } = getLeagueSitesProjectConfig();
  if (!projectId || !token) {
    return false;
  }

  const response = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  return response.ok;
}

async function registerVercelDomain(domain: string): Promise<VercelDomainResult> {
  const { projectId, token } = getLeagueSitesProjectConfig();

  if (!projectId || !token) {
    return {
      success: false,
      pending: true,
      error: 'Domain attachment is not configured in this environment yet.',
    };
  }

  try {
    const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });

    if (response.ok) {
      return { success: true };
    }

    if (await findProjectDomain(domain)) {
      return { success: true };
    }

    const body = await response.text();
    console.error('[domain] Vercel domain registration failed', {
      status: response.status,
      body,
      domain,
    });

    return {
      success: false,
      pending: true,
      error: 'DNS is correct, but BLH could not finish attaching the domain yet. Please try verify again in a minute.',
    };
  } catch (error) {
    console.error('[domain] Vercel domain registration threw', error);
    return {
      success: false,
      pending: true,
      error: 'Domain attachment failed unexpectedly. Please try again in a minute.',
    };
  }
}

async function deregisterVercelDomain(domain: string): Promise<void> {
  const { projectId, token } = getLeagueSitesProjectConfig();
  if (!projectId || !token) {
    return;
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok && response.status !== 404 && isDevelopment) {
      console.error('[domain] Failed to deregister Vercel domain', {
        status: response.status,
        domain,
      });
    }
  } catch (error) {
    console.error('[domain] Vercel domain removal threw', error);
  }
}

async function checkDNSRecords(domain: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const instructions = buildDnsInstructions(domain);

    if (instructions.primaryRecord.type === 'CNAME') {
      try {
        const cnameRecords = await resolveCname(domain);
        if (cnameRecords.some((record) => record.toLowerCase() === VERCEL_CNAME_TARGET)) {
          return {
            valid: true,
            message: `CNAME verified: ${instructions.primaryRecord.host} -> ${VERCEL_CNAME_TARGET}`,
          };
        }

        return {
          valid: false,
          error: 'CNAME record does not point to Vercel',
          message: `Found ${cnameRecords.join(', ')}. Expected ${VERCEL_CNAME_TARGET}.`,
        };
      } catch {
        return {
          valid: false,
          error: 'No CNAME record found',
          message: `Create a CNAME record for ${instructions.primaryRecord.host} pointing to ${VERCEL_CNAME_TARGET}.`,
        };
      }
    }

    try {
      const aRecords = await resolve4(domain);
      if (aRecords.some((ip) => VERCEL_FALLBACK_IPS.includes(ip))) {
        return {
          valid: true,
          message: `A record verified: ${instructions.primaryRecord.host} -> ${VERCEL_APEX_IP}`,
        };
      }

      return {
        valid: false,
        error: 'A record does not point to Vercel',
        message: `Found ${aRecords.join(', ')}. Expected ${VERCEL_APEX_IP}.`,
      };
    } catch {
      return {
        valid: false,
        error: 'No A record found',
        message: `Create an A record for ${instructions.primaryRecord.host} pointing to ${VERCEL_APEX_IP}.`,
      };
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('[domain] DNS lookup failed', error);
    }

    return {
      valid: false,
      error: 'DNS lookup failed',
      message: 'Could not complete DNS lookup. Please try again in a minute.',
    };
  }
}

async function ensureUniqueDomain(
  leagueId: string,
  organizationId: string | null,
  domain: string
): Promise<string | null> {
  const serviceClient = createServiceRoleClient();

  const [{ data: leagueConflict }, { data: orgConflict }] = await Promise.all([
    serviceClient
      .from('leagues')
      .select('id, name')
      .eq('custom_domain', domain)
      .neq('id', leagueId)
      .maybeSingle(),
    serviceClient
      .from('organizations')
      .select('id, name')
      .eq('custom_domain', domain)
      .neq('id', organizationId ?? '')
      .maybeSingle(),
  ]);

  if (leagueConflict) {
    return `This domain is already in use by ${leagueConflict.name}.`;
  }

  if (orgConflict) {
    return `This domain is already attached to ${orgConflict.name}.`;
  }

  return null;
}

function revalidateDomainPaths() {
  revalidatePath('/dashboard/settings/domains');
}

export async function getLeagueDomain(leagueId: string): Promise<{ data?: LeagueDomainDetails; error?: string }> {
  const access = await getLeagueDomainAccess(leagueId);
  if (access.error || !access.league) {
    return { error: access.error || 'League not found' };
  }

  return {
    data: {
      league: {
        id: access.league.id,
        name: access.league.name,
        slug: access.league.slug,
        subdomain: access.league.subdomain,
        custom_domain: access.league.custom_domain,
        custom_domain_verified: Boolean(access.league.custom_domain_verified),
        subscription_status: access.league.subscription_status,
        subscription_tier: access.league.subscription_tier,
      },
      organization: access.organization
        ? {
            id: access.organization.id,
            name: access.organization.name,
            slug: access.organization.slug,
            custom_domain: access.organization.custom_domain,
            custom_domain_verified: Boolean(access.organization.custom_domain_verified),
            subscription_status: access.organization.subscription_status,
            subscription_tier: access.organization.subscription_tier,
          }
        : null,
      effectiveCustomDomain: access.effectiveCustomDomain ?? null,
      effectiveCustomDomainVerified: access.effectiveCustomDomainVerified ?? false,
      domainSource: access.domainSource ?? null,
      requiresManualReview: access.requiresManualReview ?? false,
      hasCustomDomainAccess: access.hasCustomDomainAccess ?? false,
      purchaseCapability: await getDomainPurchaseCapability(),
    },
  };
}

export async function setLeagueCustomDomain(
  leagueId: string,
  domain: string
): Promise<DomainVerificationResult> {
  const access = await getLeagueDomainAccess(leagueId);
  if (access.error || !access.league) {
    return { error: access.error || 'League not found' };
  }

  if (!access.hasCustomDomainAccess) {
    return { error: 'Custom domains are available with an active platform subscription.' };
  }

  const cleanDomain = normalizeDomainInput(domain);
  if (!isValidCustomDomainFormat(cleanDomain)) {
    return { error: 'Invalid domain format. Example: yourleague.com', verified: false };
  }

  if (cleanDomain.includes('beerleaguehockey.ca')) {
    return { error: 'Platform domains cannot be used as a custom domain.', verified: false };
  }

  const conflict = await ensureUniqueDomain(leagueId, access.organization?.id ?? null, cleanDomain);
  if (conflict) {
    return { error: conflict, verified: false };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('leagues')
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    if (isDevelopment) {
      console.error('[domain] Failed to save league custom domain', error);
    }

    return { error: 'Failed to set custom domain', verified: false };
  }

  await syncLegacyOrganizationDomain(access.organization ?? null, access.organizationLeagueCount ?? 0, cleanDomain, false);
  revalidateDomainPaths();

  return {
    success: true,
    verified: false,
    status: 'pending',
    message: 'Domain saved. Update your DNS records below, then click Verify Domain.',
  };
}

export async function verifyLeagueCustomDomain(leagueId: string): Promise<DomainVerificationResult> {
  const access = await getLeagueDomainAccess(leagueId);
  if (access.error || !access.league) {
    return { error: access.error || 'League not found' };
  }

  const customDomain = access.effectiveCustomDomain;
  if (!customDomain) {
    return { error: 'No custom domain is configured for this league.' };
  }

  const dnsResult = await checkDNSRecords(customDomain);
  if (!dnsResult.valid) {
    return {
      error: dnsResult.error || 'DNS verification failed',
      verified: false,
      status: 'failed',
      message: dnsResult.message,
    };
  }

  const vercelResult = await registerVercelDomain(customDomain);
  if (!vercelResult.success) {
    return {
      error: vercelResult.error,
      verified: false,
      status: 'pending',
      message: vercelResult.error,
    };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('leagues')
    .update({
      custom_domain: customDomain,
      custom_domain_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    if (isDevelopment) {
      console.error('[domain] Failed to persist domain verification', error);
    }

    return {
      error: 'Failed to save verification status',
      verified: false,
    };
  }

  await syncLegacyOrganizationDomain(access.organization ?? null, access.organizationLeagueCount ?? 0, customDomain, true);
  revalidateDomainPaths();

  return {
    success: true,
    verified: true,
    status: 'verified',
    message: `${customDomain} is now connected to ${access.league.name}.`,
  };
}

export async function removeLeagueCustomDomain(leagueId: string): Promise<DomainVerificationResult> {
  const access = await getLeagueDomainAccess(leagueId);
  if (access.error || !access.league) {
    return { error: access.error || 'League not found' };
  }

  const existingDomain = access.effectiveCustomDomain;
  const serviceClient = createServiceRoleClient();

  const { error } = await serviceClient
    .from('leagues')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    if (isDevelopment) {
      console.error('[domain] Failed to remove league custom domain', error);
    }
    return { error: 'Failed to remove custom domain' };
  }

  if (access.organization && access.organizationLeagueCount === 1 && access.organization.custom_domain === existingDomain) {
    await syncLegacyOrganizationDomain(access.organization, access.organizationLeagueCount, null, false);
  }

  if (existingDomain) {
    await deregisterVercelDomain(existingDomain);
  }

  revalidateDomainPaths();
  return { success: true };
}

export async function searchDomains(
  query: string
): Promise<{ data?: DomainSearchResult[]; error?: string }> {
  const capability = await getDomainPurchaseCapability();
  if (!capability.searchEnabled) {
    return { error: capability.message || 'Domain search is not configured.' };
  }

  const clean = normalizeDomainInput(query).replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '');
  if (!clean || clean.length < 2) {
    return { data: [] };
  }

  const base = clean.includes('.') ? clean.replace(/\.[^.]+$/, '') : clean;
  const candidates = SEARCH_TLDS.map((tld) => base + tld);
  const { token } = getLeagueSitesProjectConfig();

  try {
    const checks = await Promise.allSettled(
      candidates.map(async (name): Promise<DomainSearchResult> => {
        const [statusResponse, priceResponse] = await Promise.allSettled([
          fetch(`https://api.vercel.com/v4/domains/status?name=${encodeURIComponent(name)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
          fetch(`https://api.vercel.com/v4/domains/price?name=${encodeURIComponent(name)}&type=new`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
        ]);

        const available =
          statusResponse.status === 'fulfilled' && statusResponse.value.ok
            ? ((await statusResponse.value.json()) as { available?: boolean }).available ?? false
            : false;
        const price =
          priceResponse.status === 'fulfilled' && priceResponse.value.ok
            ? ((await priceResponse.value.json()) as { price?: number }).price ?? 0
            : 0;

        return {
          name,
          price,
          available,
          premium: price > 50,
        };
      })
    );

    return {
      data: checks
        .filter((result): result is PromiseFulfilledResult<DomainSearchResult> => result.status === 'fulfilled')
        .map((result) => result.value)
        .sort((left, right) => Number(right.available) - Number(left.available)),
    };
  } catch (error) {
    console.error('[domain] searchDomains threw', error);
    return { error: 'Domain search failed' };
  }
}

export async function purchaseLeagueDomain(
  leagueId: string,
  domain: string
): Promise<{ success?: boolean; error?: string; domain?: string; verified?: boolean; message?: string }> {
  const access = await getLeagueDomainAccess(leagueId);
  if (access.error || !access.league) {
    return { error: access.error || 'League not found' };
  }

  if (!access.hasCustomDomainAccess) {
    return { error: 'Custom domains are available with an active platform subscription.' };
  }

  const capability = await getDomainPurchaseCapability();
  if (!capability.purchaseEnabled) {
    return { error: capability.message || 'In-app domain purchase is not available right now.' };
  }

  const cleanDomain = normalizeDomainInput(domain);
  const conflict = await ensureUniqueDomain(leagueId, access.organization?.id ?? null, cleanDomain);
  if (conflict) {
    return { error: conflict };
  }

  const { token } = getLeagueSitesProjectConfig();
  const response = await fetch('https://api.vercel.com/v4/domains/buy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: cleanDomain }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string | { code?: string; message?: string };
    };
    const errorCode =
      typeof body.error === 'object'
        ? body.error?.code ?? 'unknown'
        : body.error ?? 'unknown';

    const alreadyOwned = ['domain_already_purchased', 'domain_already_owned'].includes(errorCode);
    if (!alreadyOwned) {
      console.error('[domain] purchaseLeagueDomain failed', { status: response.status, body });
      return { error: `Failed to purchase domain: ${errorCode}` };
    }
  }

  const setResult = await setLeagueCustomDomain(leagueId, cleanDomain);
  if (setResult.error) {
    return { error: setResult.error };
  }

  const vercelResult = await registerVercelDomain(cleanDomain);
  if (!vercelResult.success) {
    return {
      success: true,
      verified: false,
      domain: cleanDomain,
      message: `Domain purchased, but BLH still needs to finish attaching ${cleanDomain}. ${vercelResult.error ?? ''}`.trim(),
    };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('leagues')
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    console.error('[domain] Failed to mark purchased domain as verified', error);
    return {
      success: true,
      verified: false,
      domain: cleanDomain,
      message: `${cleanDomain} was purchased, but BLH still needs to finish verification.`,
    };
  }

  await syncLegacyOrganizationDomain(access.organization ?? null, access.organizationLeagueCount ?? 0, cleanDomain, true);
  revalidateDomainPaths();

  return {
    success: true,
    verified: true,
    domain: cleanDomain,
    message: `${cleanDomain} is purchased and connected to ${access.league.name}.`,
  };
}

export async function getDNSInstructions(domain: string) {
  return buildDnsInstructions(domain);
}
