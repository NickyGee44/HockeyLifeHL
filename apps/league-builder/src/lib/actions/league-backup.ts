'use server';

import { revalidatePath } from 'next/cache';
import {
  buildLeagueBackupExport,
  createLeagueBackupTokenValue,
  hashLeagueBackupToken,
  type LeagueBackupTokenRecord,
} from '@/lib/backup/league-backup';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type CreateLeagueBackupTokenInput = {
  leagueId: string;
  locale: string;
  label: string;
  expiresAt?: string | null;
};

type RevokeLeagueBackupTokenInput = {
  leagueId: string;
  locale: string;
  tokenId: string;
};

export type LeagueBackupTokenListItem = LeagueBackupTokenRecord;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://www.beerleaguehockey.ca';

function revalidateBackupPaths(locale: string, leagueId: string) {
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}`);
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);
}

function normalizeExpiry(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return { value: null } as const;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Expiry must be a valid date.' } as const;
  }

  return { value: date.toISOString() } as const;
}

export async function getLeagueBackupTokens(
  leagueId: string
): Promise<ActionResult<LeagueBackupTokenListItem[]>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const serviceSupabase = createServiceRoleClient() as any;
  const { data, error } = await serviceSupabase
    .from('league_backup_tokens')
    .select('id, label, created_at, last_used_at, expires_at, revoked_at')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'Failed to load backup tokens.' };
  }

  return { success: true, data: (data ?? []) as LeagueBackupTokenListItem[] };
}

export async function createLeagueBackupToken(
  input: CreateLeagueBackupTokenInput
): Promise<ActionResult<{ token: string; endpoint: string; record: LeagueBackupTokenListItem }>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const label = input.label.trim();
  if (!label) {
    return { success: false, error: 'Token label is required.' };
  }

  const expiry = normalizeExpiry(input.expiresAt);
  if ('error' in expiry) {
    return { success: false, error: expiry.error as string };
  }

  const authClient = await createClient();
  const { data: authData } = await authClient.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const rawToken = createLeagueBackupTokenValue();
  const tokenHash = hashLeagueBackupToken(rawToken);
  const serviceSupabase = createServiceRoleClient() as any;
  const { data, error } = await serviceSupabase
    .from('league_backup_tokens')
    .insert({
      league_id: input.leagueId,
      label,
      token_hash: tokenHash,
      created_by: userId,
      expires_at: expiry.value,
    })
    .select('id, label, created_at, last_used_at, expires_at, revoked_at')
    .single();

  if (error || !data) {
    return { success: false, error: 'Failed to create a backup token.' };
  }

  revalidateBackupPaths(input.locale, input.leagueId);
  return {
    success: true,
    data: {
      token: rawToken,
      endpoint: `${SITE_URL.replace(/\/$/, '')}/api/leagues/${input.leagueId}/backup`,
      record: data as LeagueBackupTokenListItem,
    },
  };
}

export async function revokeLeagueBackupToken(
  input: RevokeLeagueBackupTokenInput
): Promise<ActionResult<LeagueBackupTokenListItem>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const serviceSupabase = createServiceRoleClient() as any;
  const { data, error } = await serviceSupabase
    .from('league_backup_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', input.tokenId)
    .eq('league_id', input.leagueId)
    .is('revoked_at', null)
    .select('id, label, created_at, last_used_at, expires_at, revoked_at')
    .single();

  if (error || !data) {
    return { success: false, error: 'Failed to revoke the backup token.' };
  }

  revalidateBackupPaths(input.locale, input.leagueId);
  return { success: true, data: data as LeagueBackupTokenListItem };
}

export async function exportLeagueBackup(
  leagueId: string
): Promise<ActionResult<{ filename: string; payload: Awaited<ReturnType<typeof buildLeagueBackupExport>> }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  try {
    const payload = await buildLeagueBackupExport(leagueId);
    const filename = `beerleaguehockey-league-backup-${leagueId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    return { success: true, data: { filename, payload } };
  } catch (error) {
    console.error('Error exporting league backup:', error);
    return { success: false, error: 'Failed to export league backup.' };
  }
}
