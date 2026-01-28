// @ts-nocheck
"use server";

import { sendEmail, type EmailOptions } from "./client";
import { generateEmailContent, type EmailGenerationContext } from "./ai-generator";

/**
 * Send an AI-generated email
 * Combines email content generation with email sending
 */
export async function sendAIEmail(params: {
  to: string | string[];
  subject: string;
  prompt: string;
  context?: EmailGenerationContext;
  from?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate email content using AI
    const result = await generateEmailContent(params.context || {
      prompt: params.prompt,
    });

    if ("error" in result) {
      return { success: false, error: result.error };
    }

    const { html } = result;

    // Send the email
    const emailResult = await sendEmail({
      to: params.to,
      subject: params.subject,
      html,
      from: params.from,
    });

    return {
      success: emailResult.success,
      error: emailResult.error,
    };
  } catch (error: any) {
    console.error("Error sending AI email:", error);
    return {
      success: false,
      error: error.message || "Failed to send AI email",
    };
  }
}
