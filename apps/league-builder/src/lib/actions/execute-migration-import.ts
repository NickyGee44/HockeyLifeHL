'use server';

import { getCurrentUser } from '@/lib/actions/auth';
import type { MigrationImportRunReport } from '@/lib/migration/requests';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function executeMigrationImport(
  requestId: string,
  leagueId: string
): Promise<ActionResult<MigrationImportRunReport>> {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    return { success: false, error: 'Unauthorized' };
  }

  // TODO: Full implementation in feat/import-execution branch
  return {
    success: false,
    error: 'Import execution not yet implemented. Merge feat/import-execution first.',
  };
}
