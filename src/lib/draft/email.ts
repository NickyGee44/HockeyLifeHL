// @ts-nocheck
"use server";

import { sendDraftNotificationEmail as sendDraftEmail } from "@/lib/email/notifications";

/**
 * Send draft notification email to all captains
 * Uses the new email notification system with AI generation
 */
export async function sendDraftNotificationEmail(
  draftId: string,
  seasonName: string,
  draftLink?: string
) {
  // Use new email notification system
  return await sendDraftEmail(draftId, seasonName, draftLink);
}
