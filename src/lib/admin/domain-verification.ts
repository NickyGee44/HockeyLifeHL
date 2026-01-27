"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripHtml } from "@/lib/input-sanitization";
import { Resolver } from "dns/promises";

export type DomainVerificationResult = {
  error?: string;
  success?: boolean;
  verified?: boolean;
  message?: string;
  dnsRecords?: any[];
};

/**
 * Domain Verification Server Actions
 *
 * Handles custom domain verification for leagues
 * Checks DNS records to ensure proper configuration
 */

/**
 * Verify a custom domain for a league
 * Checks DNS CNAME record pointing to the platform
 */
export async function verifyCustomDomain(
  leagueId: string,
  domain: string
): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check league ownership
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { error: 'Unauthorized: Must be league owner or admin' };
    }

    // Validate domain format
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

    if (!domainRegex.test(cleanDomain)) {
      return {
        error: 'Invalid domain format. Example: yourleague.com',
        verified: false,
      };
    }

    // Check for reserved domains
    if (cleanDomain.includes('beerleaguehockey.ca') || cleanDomain.includes('localhost')) {
      return {
        error: 'Cannot use platform domains',
        verified: false,
      };
    }

    // Check if domain is already in use by another league
    const { data: existingLeague } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('custom_domain', cleanDomain)
      .neq('id', leagueId)
      .single();

    if (existingLeague) {
      return {
        error: `This domain is already in use by ${existingLeague.name}`,
        verified: false,
      };
    }

    // Perform DNS verification
    const dnsResult = await checkDNSRecord(cleanDomain);

    if (!dnsResult.valid) {
      return {
        error: dnsResult.error || 'DNS verification failed',
        verified: false,
        message: dnsResult.message,
        dnsRecords: dnsResult.records,
      };
    }

    // DNS verification passed, update database
    const { data: league, error: updateError } = await supabase
      .from('leagues')
      .update({
        custom_domain: cleanDomain,
        custom_domain_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating custom domain:', updateError);
      return {
        error: 'Failed to save domain verification',
        verified: false,
      };
    }

    revalidatePath('/admin/leagues');
    revalidatePath(`/admin/leagues/${leagueId}`);
    revalidatePath(`/admin/domains`);

    return {
      success: true,
      verified: true,
      message: 'Domain verified successfully! Your league is now accessible at ' + cleanDomain,
    };
  } catch (error: any) {
    console.error('Error in verifyCustomDomain:', error);
    return {
      error: error.message || 'Failed to verify domain',
      verified: false,
    };
  }
}

/**
 * Check DNS records for a domain
 * Looks for CNAME or A record pointing to platform
 */
async function checkDNSRecord(domain: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
  records?: any[];
}> {
  try {
    const resolver = new Resolver();

    // Expected CNAME target (this should match your Vercel deployment)
    // In production, this would be your Vercel app URL
    const expectedCNAME = 'cname.vercel-dns.com';

    // Expected A record (Vercel's IP - this is an example)
    const expectedARecord = '76.76.21.21';

    try {
      // First, try to resolve CNAME records
      const cnameRecords = await resolver.resolveCname(domain);

      if (cnameRecords && cnameRecords.length > 0) {
        const hasPlatformCNAME = cnameRecords.some(record =>
          record.toLowerCase().includes('vercel') ||
          record.toLowerCase().includes(expectedCNAME.toLowerCase())
        );

        if (hasPlatformCNAME) {
          return {
            valid: true,
            message: 'CNAME record verified',
            records: cnameRecords,
          };
        } else {
          return {
            valid: false,
            error: 'CNAME record does not point to platform',
            message: `Found CNAME: ${cnameRecords.join(', ')}, but expected: ${expectedCNAME}`,
            records: cnameRecords,
          };
        }
      }
    } catch (cnameError: any) {
      // CNAME not found, try A record
      try {
        const aRecords = await resolver.resolve4(domain);

        if (aRecords && aRecords.length > 0) {
          // CRITICAL: Validate A records point to Vercel IPs
          const vercelIPs = ['76.76.21.21', '76.76.21.142', '76.76.21.164', '76.223.126.88'];
          const hasVercelIP = aRecords.some(ip => vercelIPs.includes(ip));

          if (hasVercelIP) {
            return {
              valid: true,
              message: 'A record verified',
              records: aRecords,
            };
          } else {
            return {
              valid: false,
              error: 'A record does not point to Vercel',
              message: `Found: ${aRecords.join(', ')}, expected one of: ${vercelIPs.join(', ')}`,
              records: aRecords,
            };
          }
        }
      } catch (aError: any) {
        return {
          valid: false,
          error: 'No DNS records found',
          message: 'Please add a CNAME or A record pointing to the platform',
        };
      }
    }

    return {
      valid: false,
      error: 'DNS configuration incomplete',
      message: 'Please add a CNAME record pointing to ' + expectedCNAME,
    };
  } catch (error: any) {
    console.error('DNS check error:', error);
    return {
      valid: false,
      error: 'DNS lookup failed',
      message: 'Could not perform DNS lookup. Please try again later.',
    };
  }
}

/**
 * Get DNS instructions for setting up a custom domain
 */
export async function getDNSInstructions(domain: string): Promise<{
  instructions: {
    type: 'CNAME' | 'A';
    name: string;
    value: string;
    ttl: string;
  }[];
}> {
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Determine if this is an apex domain (no subdomain) or subdomain
  const isApex = cleanDomain.split('.').length === 2;

  if (isApex) {
    // Apex domain - recommend A record
    return {
      instructions: [
        {
          type: 'A',
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
          type: 'CNAME',
          name: cleanDomain.split('.')[0],
          value: 'cname.vercel-dns.com',
          ttl: '3600',
        },
      ],
    };
  }
}

/**
 * Remove custom domain from a league
 */
export async function removeCustomDomain(leagueId: string): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check league ownership
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { error: 'Unauthorized: Must be league owner or admin' };
    }

    const { error } = await supabase
      .from('leagues')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (error) {
      console.error('Error removing custom domain:', error);
      return { error: 'Failed to remove custom domain' };
    }

    revalidatePath('/admin/leagues');
    revalidatePath(`/admin/leagues/${leagueId}`);
    revalidatePath(`/admin/domains`);

    return { success: true };
  } catch (error: any) {
    console.error('Error in removeCustomDomain:', error);
    return { error: error.message || 'Failed to remove custom domain' };
  }
}

/**
 * Get all custom domains across all leagues
 * For admin overview
 */
export async function getAllCustomDomains(): Promise<{
  domains?: Array<{
    leagueId: string;
    leagueName: string;
    domain: string;
    verified: boolean;
    subdomain: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Fetch all leagues with custom domains
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('id, name, custom_domain, custom_domain_verified, subdomain')
      .not('custom_domain', 'is', null)
      .order('custom_domain_verified', { ascending: false }) as {
        data: Array<{
          id: string;
          name: string;
          custom_domain: string | null;
          custom_domain_verified: boolean | null;
          subdomain: string | null;
        }> | null;
        error: any;
      };

    if (error) {
      console.error('Error fetching custom domains:', error);
      return { error: 'Failed to fetch custom domains' };
    }

    const domains = (leagues || []).map((league) => ({
      leagueId: league.id,
      leagueName: league.name,
      domain: league.custom_domain || '',
      verified: league.custom_domain_verified || false,
      subdomain: league.subdomain || '',
    }));

    return { domains };
  } catch (error: any) {
    console.error('Error in getAllCustomDomains:', error);
    return { error: error.message || 'Failed to fetch custom domains' };
  }
}

/**
 * Set custom domain for a league (without verification)
 * Verification happens separately via verifyCustomDomain
 */
export async function setCustomDomain(
  leagueId: string,
  domain: string
): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check league ownership
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { error: 'Unauthorized: Must be league owner or admin' };
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
    if (cleanDomain.includes('beerleaguehockey.ca') || cleanDomain.includes('localhost')) {
      return {
        error: 'Cannot use platform domains',
        verified: false,
      };
    }

    // Check if domain is already in use by another league
    const { data: existingLeague } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('custom_domain', cleanDomain)
      .neq('id', leagueId)
      .single();

    if (existingLeague) {
      return {
        error: `This domain is already in use by ${existingLeague.name}`,
        verified: false,
      };
    }

    // Set the custom domain (unverified)
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        custom_domain: cleanDomain,
        custom_domain_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Error setting custom domain:', updateError);
      return {
        error: 'Failed to set custom domain',
        verified: false,
      };
    }

    revalidatePath('/admin/leagues');
    revalidatePath(`/admin/leagues/${leagueId}`);

    return {
      success: true,
      verified: false,
      message: 'Custom domain set. Please configure DNS and verify.',
    };
  } catch (error: any) {
    console.error('Error in setCustomDomain:', error);
    return {
      error: error.message || 'Failed to set custom domain',
      verified: false,
    };
  }
}
