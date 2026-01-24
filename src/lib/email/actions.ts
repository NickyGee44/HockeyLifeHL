// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, sendBulkEmails, type EmailOptions } from "./client";
import { generateEmailContent, type EmailGenerationContext } from "./ai-generator";
import { getBaseEmailTemplate } from "./templates/base";
import type { EmailDraft, EmailRecipient, EmailType } from "./types";

/**
 * Generate email draft using AI
 * Optionally enhances an existing template
 */
export async function generateEmailDraft(
  type: EmailType,
  context: EmailGenerationContext,
  enhanceTemplate?: { subject: string; html: string }
): Promise<{ draft?: EmailDraft; error?: string }> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const result = await generateEmailContent(context, enhanceTemplate);
  
  if ("error" in result) {
    return { error: result.error };
  }

  const { subject, html } = result;

  // HTML is already formatted with base template
  const fullHtml = html;

  return {
    draft: {
      type,
      subject,
      html: fullHtml,
      recipients: [],
      isAutomated: false,
      context,
    },
  };
}

/**
 * Send email draft (with preview/edit capability)
 */
export async function sendEmailDraft(
  draft: EmailDraft,
  skipPreview: boolean = false
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  // For automated emails, skip preview
  if (draft.isAutomated || skipPreview) {
    return await sendEmailDraftDirect(draft);
  }

  // For manual emails, save draft for preview
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_drafts")
    .insert({
      type: draft.type,
      subject: draft.subject,
      html: draft.html,
      recipients: draft.recipients,
      context: draft.context,
      is_automated: draft.isAutomated,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, sent: 0 }; // Draft saved, not sent yet
}

/**
 * Send email draft directly (no preview)
 */
async function sendEmailDraftDirect(
  draft: EmailDraft
): Promise<{ success: boolean; sent?: number; error?: string }> {
  if (draft.recipients.length === 0) {
    return { error: "No recipients specified" };
  }

  const emails: EmailOptions[] = draft.recipients.map((recipient) => ({
    to: recipient.email,
    subject: draft.subject,
    html: draft.html,
  }));

  const result = await sendBulkEmails(emails);

  return {
    success: result.failed === 0,
    sent: result.success,
    error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
  };
}

/**
 * Get email draft for preview/edit
 */
export async function getEmailDraft(
  draftId: string
): Promise<{ draft?: EmailDraft; error?: string }> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error || !data) {
    return { error: "Draft not found" };
  }

  return {
    draft: {
      id: data.id,
      type: data.type,
      subject: data.subject,
      html: data.html,
      recipients: data.recipients || [],
      isAutomated: data.is_automated,
      context: data.context,
    },
  };
}

/**
 * Update email draft
 */
export async function updateEmailDraft(
  draftId: string,
  updates: Partial<Pick<EmailDraft, "subject" | "html" | "recipients">>
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_drafts")
    .update({
      subject: updates.subject,
      html: updates.html,
      recipients: updates.recipients,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Send email draft after preview/edit
 */
export async function sendEmailDraftAfterPreview(
  draftId: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { draft, error } = await getEmailDraft(draftId);
  if (error || !draft) {
    return { error: error || "Draft not found" };
  }

  const result = await sendEmailDraftDirect(draft);

  // Mark draft as sent
  if (result.success) {
    const supabase = await createClient();
    await supabase
      .from("email_drafts")
      .update({
        sent_at: new Date().toISOString(),
        sent_count: result.sent,
      })
      .eq("id", draftId);
  }

  return result;
}

/**
 * Get pending email drafts (for preview/edit)
 */
export async function getPendingEmailDrafts(): Promise<{
  drafts?: EmailDraft[];
  error?: string;
}> {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_drafts")
    .select("*")
    .is("sent_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return {
    drafts: (data || []).map((d) => ({
      id: d.id,
      type: d.type,
      subject: d.subject,
      html: d.html,
      recipients: d.recipients || [],
      isAutomated: d.is_automated,
      context: d.context,
    })),
  };
}

// Helper function to require admin
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Admin access required" };
  }

  return { userId: user.id };
}
