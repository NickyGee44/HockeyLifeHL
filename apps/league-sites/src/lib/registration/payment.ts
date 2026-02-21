import type { RegistrationDraftData } from '@/lib/actions/registration';

type SaveDraftAction = (
  leagueId: string,
  seasonId: string,
  data: Partial<RegistrationDraftData>
) => Promise<
  | { success: true; data?: { draftId: string } }
  | { success: false; error: string }
>;

export async function createPaymentDraft(
  saveDraft: SaveDraftAction,
  leagueId: string,
  seasonId: string,
  data: RegistrationDraftData
): Promise<string | null> {
  try {
    const result = await saveDraft(leagueId, seasonId, {
      ...data,
      current_step: 4,
    });

    if (!result.success || !result.data) {
      return null;
    }

    return result.data.draftId;
  } catch {
    return null;
  }
}
