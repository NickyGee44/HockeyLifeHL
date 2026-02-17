/**
 * Resend Domains API Wrapper
 *
 * Wraps the Resend Domains API for managing custom sender domains.
 * NOT a 'use server' file — used by server actions in email-sender-domain.ts.
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface ResendDomainRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl: string;
  status: 'not_started' | 'pending' | 'verified' | 'failed';
  priority?: number;
}

export interface ResendDomainResult {
  id?: string;
  name?: string;
  status?: string;
  records?: ResendDomainRecord[];
  error?: string;
}

/**
 * Register a new domain with Resend.
 * Returns the domain ID and required DNS records.
 */
export async function createResendDomain(domain: string): Promise<ResendDomainResult> {
  if (!resend) {
    // Dev mode — return mock data
    return {
      id: `mock_domain_${Date.now()}`,
      name: domain,
      status: 'pending',
      records: [
        { record: 'SPF', name: domain, type: 'TXT', value: 'v=spf1 include:amazonses.com ~all', ttl: 'Auto', status: 'not_started' },
        { record: 'DKIM', name: `resend._domainkey.${domain}`, type: 'CNAME', value: 'resend.domainkey.example.com', ttl: 'Auto', status: 'not_started' },
        { record: 'DMARC', name: `_dmarc.${domain}`, type: 'TXT', value: 'v=DMARC1; p=none;', ttl: 'Auto', status: 'not_started' },
      ],
    };
  }

  try {
    const result = await resend.domains.create({ name: domain });

    if ('error' in result && result.error) {
      return { error: (result.error as any).message || 'Failed to create domain' };
    }

    const data = result.data as any;
    return {
      id: data?.id,
      name: data?.name,
      status: data?.status,
      records: data?.records?.map((r: any) => ({
        record: r.record || r.name,
        name: r.name,
        type: r.type,
        value: r.value,
        ttl: r.ttl || 'Auto',
        status: r.status || 'not_started',
        priority: r.priority,
      })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error creating domain' };
  }
}

/**
 * Get domain details and DNS record status from Resend.
 */
export async function getResendDomain(domainId: string): Promise<ResendDomainResult> {
  if (!resend) {
    return {
      id: domainId,
      status: 'pending',
      records: [],
    };
  }

  try {
    const result = await resend.domains.get(domainId);

    if ('error' in result && result.error) {
      return { error: (result.error as any).message || 'Failed to get domain' };
    }

    const data = result.data as any;
    return {
      id: data?.id,
      name: data?.name,
      status: data?.status,
      records: data?.records?.map((r: any) => ({
        record: r.record || r.name,
        name: r.name,
        type: r.type,
        value: r.value,
        ttl: r.ttl || 'Auto',
        status: r.status || 'not_started',
        priority: r.priority,
      })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trigger DNS verification for a domain.
 */
export async function verifyResendDomain(domainId: string): Promise<ResendDomainResult> {
  if (!resend) {
    return { id: domainId, status: 'verified', records: [] };
  }

  try {
    const result = await resend.domains.verify(domainId);

    if ('error' in result && result.error) {
      return { error: (result.error as any).message || 'Failed to verify domain' };
    }

    // After triggering verify, fetch current status
    return getResendDomain(domainId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a domain from Resend.
 */
export async function deleteResendDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: true };
  }

  try {
    const result = await resend.domains.remove(domainId);

    if ('error' in result && result.error) {
      return { success: false, error: (result.error as any).message || 'Failed to delete domain' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
