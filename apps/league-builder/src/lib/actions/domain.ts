'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import dns from 'dns';
import { promisify } from 'util';

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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, slug, custom_domain, custom_domain_verified')
    .eq('id', organizationId)
    .single();

  if (error) {
    if (isDevelopment) {
      console.error('Error fetching organization domain:', error);
    }
    return { error: 'Failed to fetch organization' };
  }

  return { data: org };
}

/**
 * Set a custom domain for an organization (without verification)
 */
export async function setCustomDomain(
  organizationId: string,
  domain: string
): Promise<DomainVerificationResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check organization ownership
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_user_id, subscription_tier')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return { error: 'Organization not found' };
  }

  if (org.owner_user_id !== user.id) {
    return { error: 'Only the organization owner can manage domains' };
  }

  // Check subscription tier - enterprise-only licensing
  const tier = (org as Record<string, unknown>).subscription_tier as string || 'enterprise';
  if (tier !== 'enterprise') {
    return { error: 'Custom domains require an Enterprise subscription. Please contact sales.' };
  }

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
  const { data: existingOrg } = await supabase
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
  const { error: updateError } = await supabase
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get organization with custom domain
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, owner_user_id, custom_domain, custom_domain_verified')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return { error: 'Organization not found' };
  }

  if (org.owner_user_id !== user.id) {
    return { error: 'Only the organization owner can verify domains' };
  }

  const customDomain = (org as Record<string, unknown>).custom_domain as string | null;
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
  const { error: updateError } = await supabase
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check organization ownership — also fetch custom_domain so we can deregister from Vercel
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_user_id, custom_domain')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return { error: 'Organization not found' };
  }

  if (org.owner_user_id !== user.id) {
    return { error: 'Only the organization owner can manage domains' };
  }

  const customDomain = (org as Record<string, unknown>).custom_domain as string | null;

  // Remove custom domain from DB
  const { error: updateError } = await supabase
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
