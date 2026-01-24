// @ts-nocheck
"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Don't send emails if API key is not configured
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured - email not sent");
    console.log("Would send email:", {
      to: options.to,
      subject: options.subject,
      from: options.from || "HockeyLifeHL <noreply@hockeylifehl.com>",
    });
    return {
      success: true,
      data: { id: "mock-email-id" },
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || "HockeyLifeHL <noreply@hockeylifehl.com>",
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Send bulk emails (batched to avoid rate limits)
 */
export async function sendBulkEmails(
  emails: EmailOptions[],
  batchSize: number = 10
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((email) => sendEmail(email))
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        success++;
      } else {
        failed++;
        const error = result.status === "rejected" 
          ? result.reason?.message 
          : result.value?.error || "Unknown error";
        errors.push(`Email ${i + index + 1}: ${error}`);
      }
    });

    // Small delay between batches to avoid rate limits
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { success, failed, errors };
}
