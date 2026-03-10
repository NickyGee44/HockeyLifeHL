'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import dns from 'dns';
import { promisify } from 'util';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

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

// Vercel DNS targets
const VERCEL_CNAME = 'cname.vercel-dns.com';
const VERCEL_IPS = ['76.76.21.21', '76.76.21.142', '76.76.21.164', '76.223.126.88'];

type ManagedOrganization = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
};

async function getOrganizationDomainAccess(organizationId: string): Promise<{
  userId?: string;
  organization?: ManagedOrganization;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: organization, error: orgError } = await serviceClient
    .from('organizations')
    .select('id, name, slug, owner_user_id, custom_domain, custom_domain_verified, subscription_tier, subscription_status')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError || !organization) {
    return { error: 'Organization not found' };
  }

  if (organization.owner_user_id === user.id) {
    return { userId: user.id, organization: organization as ManagedOrganization };
  }

  const { data: orgMembership } = await serviceClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();

  if (orgMembership) {
    return { userId: user.id, organization: organization as ManagedOrganization };
  }

  const { data: ownedLeague } = await serviceClient
    .from('leagues')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (ownedLeague) {
    return { userId: user.id, organization: organization as ManagedOrganization };
  }

  const { data: leagueMembership } = await (serviceClient as any)
    .from('league_memberships')
    .select('league_id, leagues!inner(organization_id)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .eq('leagues.organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (leagueMembership) {
    return { userId: user.id, organization: organization as ManagedOrganization };
  }

  if (await isUserPlatformAdmin(user.id)) {
    return { userId: user.id, organization: organization as ManagedOrganization };
  }

  return { error: 'Only league owners and organization admins can manage domains' };
}

function hasCustomDomainAccess(organization: ManagedOrganization) {
  return ['active', 'trialing'].includes(organization.subscription_status ?? '') || Boolean(organization.custom_domain);
}

// ---------------------------------------------------------------------------
// Vercel API helpers
// ---------------------------------------------------------------------------

/**
 * Register a custom domain on the league-sites Vercel project.
 * Best-effort: logs errors but never throws.
 */
async function registerVercelDomain(domain: string): Promise<void> {
  const projectId = process.env.VERCEL_LEAGUE_SITES_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!projectId || !token) {
    console.warn('[domain] Vercel env vars not set — skipping domain registration', {
      hasProjectId: Boolean(projectId),
      hasToken: Boolean(token),
    });
    return;
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[domain] Vercel domain registration failed', {
        status: res.status,
        body,
        domain,
      });
    } else {
      console.log('[domain] Vercel domain registered:', domain);
    }
  } catch (err) {
    console.error('[domain] Vercel domain registration threw an error', err);
  }
}

/**
 * Remove a custom domain from the league-sites Vercel project.
 * Best-effort: logs errors but never throws.
 */
async function deregisterVercelDomain(domain: string): Promise<void> {
  const projectId = process.env.VERCEL_LEAGUE_SITES_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!projectId || !token) {
    console.warn('[domain] Vercel env vars not set — skipping domain deregistration');
    return;
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      console.error('[domain] Vercel domain removal failed', {
        status: res.status,
        body,
        domain,
      });
    } else {
      console.log('[domain] Vercel domain removed:', domain);
    }
  } catch (err) {
    console.error('[domain] Vercel domain removal threw an error', err);
  }
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Get domain configuration for an organization
 */
export async function getOrganizationDomain(organizationId: string) {
  const access = await getOrganizationDomainAccess(organizationId);
  if (access.error || !access.organization) {
    return { error: access.error || 'Failed to fetch organization' };
  }

  return { data: access.organization };
}

/**
 * Set a custom domain for an organization (without verification)
 */
export async function setCustomDomain(
  organizationId: string,
  domain: string
): Promise<DomainVerificationResult> {
  const access = await getOrganizationDomainAccess(organizationId);
  if (access.error || !access.organization) {
    return { error: access.error || 'Organization not found' };
  }

  if (!hasCustomDomainAccess(access.organization)) {
    return { error: 'Custom domains are available with an active platform subscription.' };
  }

  const serviceClient = createServiceRoleClient();

  // Validate and clean domain
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

  if (!domainRegex.test(cleanDomain)) {
    return {
      error: 'Invalid domain format. Example: yourleague.com',
      verified: false,
    };
  }

  // Check for reserved domains
  if (cleanDomain.includes('beerleaguehockey.ca')) {
    return {
      error: 'Cannot use platform domains',
      verified: false,
    };
  }

  // Check if domain is already in use by another organization
  const { data: existingOrg } = await serviceClient
    .from('organizations')
    .select('id, name')
    .eq('custom_domain', cleanDomain)
    .neq('id', organizationId)
    .maybeSingle();

  if (existingOrg) {
    return {
      error: `This domain is already in use by ${existingOrg.name}`,
      verified: false,
    };
  }

  // Set the custom domain (unverified)
  const { error: updateError } = await serviceClient
    .from('organizations')
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (updateError) {
    if (isDevelopment) {
      console.error('Error setting custom domain:', updateError);
    }
    return {
      error: 'Failed to set custom domain',
      verified: false,
    };
  }

  revalidatePath('/dashboard/settings/domains');

  return {
    success: true,
    verified: false,
    status: 'pending',
    message: 'Custom domain set. Please configure DNS and verify.',
  };
}

/**
 * Verify a custom domain by checking DNS records, then registering it on Vercel.
 */
export async function verifyCustomDomain(
  organizationId: string
): Promise<DomainVerificationResult> {
  const access = await getOrganizationDomainAccess(organizationId);
  if (access.error || !access.organization) {
    return { error: access.error || 'Organization not found' };
  }

  const customDomain = access.organization.custom_domain;
  if (!customDomain) {
    return { error: 'No custom domain configured' };
  }

  // Check DNS records
  const dnsResult = await checkDNSRecords(customDomain);

  if (!dnsResult.valid) {
    return {
      error: dnsResult.error || 'DNS verification failed',
      verified: false,
      status: 'failed',
      message: dnsResult.message,
    };
  }

  // DNS verification passed — update database
  const serviceClient = createServiceRoleClient();
  const { error: updateError } = await serviceClient
    .from('organizations')
    .update({
      custom_domain_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (updateError) {
    if (isDevelopment) {
      console.error('Error updating domain verification:', updateError);
    }
    return {
      error: 'Failed to save verification status',
      verified: false,
    };
  }

  // Register domain on Vercel (best-effort — DNS is source of truth)
  await registerVercelDomain(customDomain);

  revalidatePath('/dashboard/settings/domains');

  return {
    success: true,
    verified: true,
    status: 'verified',
    message: `Domain verified! Your organization is now accessible at ${customDomain}`,
  };
}

/**
 * Remove custom domain from an organization and deregister it from Vercel.
 */
export async function removeCustomDomain(
  organizationId: string
): Promise<DomainVerificationResult> {
  const access = await getOrganizationDomainAccess(organizationId);
  if (access.error || !access.organization) {
    return { error: access.error || 'Organization not found' };
  }

  const customDomain = access.organization.custom_domain;
  const serviceClient = createServiceRoleClient();

  // Remove custom domain from DB
  const { error: updateError } = await serviceClient
    .from('organizations')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (updateError) {
    if (isDevelopment) {
      console.error('Error removing custom domain:', updateError);
    }
    return { error: 'Failed to remove custom domain' };
  }

  // Deregister from Vercel (best-effort)
  if (customDomain) {
    await deregisterVercelDomain(customDomain);
  }

  revalidatePath('/dashboard/settings/domains');

  return { success: true };
}

/**
 * Check DNS records for a domain
 */
async function checkDNSRecords(domain: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  try {
    // Try CNAME first
    try {
      const cnameRecords = await resolveCname(domain);
      if (cnameRecords && cnameRecords.length > 0) {
        const hasVercelCname = cnameRecords.some(
          record => record.toLowerCase().includes('vercel') ||
                   record.toLowerCase() === VERCEL_CNAME
        );

        if (hasVercelCname) {
          return {
            valid: true,
            message: 'CNAME record verified',
          };
        } else {
          return {
            valid: false,
            error: 'CNAME record does not point to Vercel',
            message: `Found: ${cnameRecords.join(', ')}, expected: ${VERCEL_CNAME}`,
          };
        }
      }
    } catch {
      // CNAME not found, try A record
    }

    // Try A record
    try {
      const aRecords = await resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        const hasVercelIP = aRecords.some(ip => VERCEL_IPS.includes(ip));

        if (hasVercelIP) {
          return {
            valid: true,
            message: 'A record verified',
          };
        } else {
          return {
            valid: false,
            error: 'A record does not point to Vercel',
            message: `Found: ${aRecords.join(', ')}, expected one of: ${VERCEL_IPS.join(', ')}`,
          };
        }
      }
    } catch {
      // A record not found
    }

    return {
      valid: false,
      error: 'No valid DNS records found',
      message: `Please add a CNAME record pointing to ${VERCEL_CNAME}`,
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('DNS check error:', error);
    }
    return {
      valid: false,
      error: 'DNS lookup failed',
      message: 'Could not perform DNS lookup. Please try again later.',
    };
  }
}

// ---------------------------------------------------------------------------
// Domain search + purchase (Vercel Registrar)
// ---------------------------------------------------------------------------

export type DomainSearchResult = {
  name: string;
  price: number;
  available: boolean;
  premium: boolean;
};

// TLDs to check when searching — ordered by preference for hockey leagues
const SEARCH_TLDS = ['.com', '.ca', '.net', '.hockey', '.org'];

/**
 * Search available domains by generating TLD variants and checking each via
 * Vercel's /v4/domains/status and /v4/domains/price endpoints in parallel.
 * (Vercel has no bulk domain availability search endpoint.)
 */
export async function searchDomains(
  query: string
): Promise<{ data?: DomainSearchResult[]; error?: string }> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return { error: 'Domain search not configured' };

  const clean = query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');

  if (!clean || clean.length < 2) return { data: [] };

  // Strip any existing TLD so we always check all variants
  const base = clean.includes('.') ? clean.replace(/\.[^.]+$/, '') : clean;
  const candidates = SEARCH_TLDS.map((tld) => base + tld);

  try {
    const checks = await Promise.allSettled(
      candidates.map(async (name): Promise<DomainSearchResult> => {
        const [statusRes, priceRes] = await Promise.allSettled([
          fetch(
            `https://api.vercel.com/v4/domains/status?name=${encodeURIComponent(name)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          ),
          fetch(
            `https://api.vercel.com/v4/domains/price?name=${encodeURIComponent(name)}&type=new`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          ),
        ]);

        const available =
          statusRes.status === 'fulfilled' && statusRes.value.ok
            ? ((await statusRes.value.json()) as { available?: boolean }).available ?? false
            : false;

        const price =
          priceRes.status === 'fulfilled' && priceRes.value.ok
            ? ((await priceRes.value.json()) as { price?: number }).price ?? 0
            : 0;

        return { name, available, price, premium: price > 50 };
      })
    );

    const data = checks
      .filter((r): r is PromiseFulfilledResult<DomainSearchResult> => r.status === 'fulfilled')
      .map((r) => r.value)
      // Available domains first, then alphabetical by TLD
      .sort((a, b) => Number(b.available) - Number(a.available));

    return { data };
  } catch (err) {
    console.error('[domain] searchDomains threw', err);
    return { error: 'Domain search failed' };
  }
}

/**
 * Purchase a domain via Vercel's registrar, then auto-configure it for the org.
 * Domains purchased through Vercel point at Vercel automatically — no DNS step needed.
 */
export async function purchaseDomain(
  organizationId: string,
  domain: string
): Promise<{ success?: boolean; error?: string; domain?: string }> {
  const access = await getOrganizationDomainAccess(organizationId);
  if (access.error || !access.organization) {
    return { error: access.error || 'Organization not found' };
  }

  if (!hasCustomDomainAccess(access.organization)) {
    return { error: 'Custom domains are available with an active platform subscription.' };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) return { error: 'Vercel token not configured' };

  // Purchase via Vercel Registrar
  const res = await fetch('https://api.vercel.com/v4/domains/buy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string | { code?: string; message?: string };
    };
    const errCode =
      typeof body.error === 'object'
        ? (body.error?.code ?? 'unknown')
        : (body.error ?? 'unknown');

    // Treat already-owned as success — just configure it
    const alreadyOwned = ['domain_already_purchased', 'domain_already_owned'].includes(errCode);
    if (!alreadyOwned) {
      console.error('[domain] purchaseDomain failed', { status: res.status, body });
      return { error: `Failed to purchase domain: ${errCode}` };
    }
    console.log('[domain] domain already owned by this account — configuring:', domain);
  }

  // Set domain in DB (marks as unverified first)
  const setResult = await setCustomDomain(organizationId, domain);
  if (setResult.error) return { error: setResult.error };

  // Immediately mark as verified — Vercel manages DNS, no manual step needed
  const supabase2 = await createClient();
  const { error: verifyErr } = await supabase2
    .from('organizations')
    .update({ custom_domain_verified: true, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (verifyErr) {
    console.error('[domain] failed to mark domain as verified', verifyErr);
  }

  // Register on the league-sites Vercel project
  await registerVercelDomain(domain);

  revalidatePath('/dashboard/settings/domains');

  return { success: true, domain };
}

/**
 * Get DNS instructions for a domain
 */
export async function getDNSInstructions(domain: string) {
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Determine if this is an apex domain or subdomain
  const isApex = cleanDomain.split('.').length === 2;

  if (isApex) {
    // Apex domain - recommend A record
    return {
      instructions: [
        {
          type: 'A' as const,
          name: '@',
          value: '76.76.21.21',
          ttl: '3600',
        },
      ],
    };
  } else {
    // Subdomain - recommend CNAME
    return {
      instructions: [
        {
          type: 'CNAME' as const,
          name: cleanDomain.split('.')[0],
          value: VERCEL_CNAME,
          ttl: '3600',
        },
      ],
    };
  }
}
