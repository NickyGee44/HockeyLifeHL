/**
 * Email Service
 *
 * Handles sending emails via Resend with rate limiting,
 * batch processing, and delivery tracking.
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@beerleaguehockey.ca';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

// Rate limiting configuration
const RATE_LIMIT = {
  maxPerSecond: 10,      // Resend limit: 10 emails/second
  maxPerMinute: 100,     // Safety buffer
  maxPerHour: 1000,      // Reasonable limit for batches
  batchSize: 50,         // Max emails per batch
  batchDelayMs: 1000,    // Delay between batches
};

// Track rate limiting
const rateLimitState = {
  secondCount: 0,
  minuteCount: 0,
  hourCount: 0,
  lastSecondReset: Date.now(),
  lastMinuteReset: Date.now(),
  lastHourReset: Date.now(),
};

/**
 * Reset rate limit counters based on time elapsed
 */
function resetRateLimitsIfNeeded(): void {
  const now = Date.now();

  if (now - rateLimitState.lastSecondReset >= 1000) {
    rateLimitState.secondCount = 0;
    rateLimitState.lastSecondReset = now;
  }

  if (now - rateLimitState.lastMinuteReset >= 60000) {
    rateLimitState.minuteCount = 0;
    rateLimitState.lastMinuteReset = now;
  }

  if (now - rateLimitState.lastHourReset >= 3600000) {
    rateLimitState.hourCount = 0;
    rateLimitState.lastHourReset = now;
  }
}

/**
 * Check if we can send more emails within rate limits
 */
function canSendEmail(): boolean {
  resetRateLimitsIfNeeded();

  return (
    rateLimitState.secondCount < RATE_LIMIT.maxPerSecond &&
    rateLimitState.minuteCount < RATE_LIMIT.maxPerMinute &&
    rateLimitState.hourCount < RATE_LIMIT.maxPerHour
  );
}

/**
 * Wait until rate limit window resets
 */
async function waitForRateLimit(): Promise<void> {
  resetRateLimitsIfNeeded();

  if (rateLimitState.secondCount >= RATE_LIMIT.maxPerSecond) {
    const waitTime = 1000 - (Date.now() - rateLimitState.lastSecondReset);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
    }
  }
}

/**
 * Increment rate limit counters
 */
function incrementRateLimits(): void {
  rateLimitState.secondCount++;
  rateLimitState.minuteCount++;
  rateLimitState.hourCount++;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Redact email address for logging (privacy protection)
 * Example: john.doe@example.com -> j***@e***.com
 */
function redactEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***';

  const [domainName, tld] = domain.split('.');
  const redactedLocal = localPart.charAt(0) + '***';
  const redactedDomain = domainName.charAt(0) + '***';

  return `${redactedLocal}@${redactedDomain}.${tld || 'com'}`;
}

/**
 * Redact array of emails or single email for logging
 */
function redactEmails(emails: string | string[]): string | string[] {
  if (Array.isArray(emails)) {
    return emails.map(redactEmail);
  }
  return redactEmail(emails);
}

/**
 * Send a single email
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // If Resend is not configured, log to console (dev mode)
  // PII is redacted from logs for privacy compliance
  if (!resend) {
    console.log('[Email Service] Would send email:', {
      to: redactEmails(params.to),
      subject: params.subject,
      htmlLength: params.html.length,
    });
    return { success: true, messageId: 'dev-' + Date.now() };
  }

  // Check rate limit
  if (!canSendEmail()) {
    await waitForRateLimit();
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from || FROM_EMAIL,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    incrementRateLimits();

    if (error) {
      console.error('[Email Service] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email Service] Email sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Email Service] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface BatchEmailRecipient {
  email: string;
  name?: string;
  data?: Record<string, any>;
}

export interface BatchSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

/**
 * Send emails to multiple recipients with rate limiting
 *
 * For personalized emails, provide a renderTemplate function
 * that takes recipient data and returns the HTML content.
 */
export async function sendBatchEmails(
  recipients: BatchEmailRecipient[],
  subject: string | ((recipient: BatchEmailRecipient) => string),
  htmlTemplate: string | ((recipient: BatchEmailRecipient) => string),
  options?: {
    from?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
    onProgress?: (sent: number, total: number) => void;
  }
): Promise<BatchSendResult> {
  const result: BatchSendResult = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    results: [],
  };

  // Process in batches
  for (let i = 0; i < recipients.length; i += RATE_LIMIT.batchSize) {
    const batch = recipients.slice(i, i + RATE_LIMIT.batchSize);

    // Process batch in parallel (within rate limits)
    const batchPromises = batch.map(async (recipient) => {
      // Wait for rate limit if needed
      if (!canSendEmail()) {
        await waitForRateLimit();
      }

      const emailSubject = typeof subject === 'function' ? subject(recipient) : subject;
      const emailHtml = typeof htmlTemplate === 'function' ? htmlTemplate(recipient) : htmlTemplate;

      const sendResult = await sendEmail({
        to: recipient.email,
        subject: emailSubject,
        html: emailHtml,
        from: options?.from,
        replyTo: options?.replyTo,
        tags: options?.tags,
      });

      result.results.push({
        email: recipient.email,
        ...sendResult,
      });

      if (sendResult.success) {
        result.sent++;
      } else {
        result.failed++;
      }

      // Call progress callback if provided
      options?.onProgress?.(result.sent + result.failed, result.total);
    });

    // Wait for batch to complete
    await Promise.all(batchPromises);

    // Add delay between batches to stay within rate limits
    if (i + RATE_LIMIT.batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.batchDelayMs));
    }
  }

  console.log(`[Email Service] Batch complete: ${result.sent}/${result.total} sent`);
  return result;
}

/**
 * Get the unsubscribe URL for a user
 */
export function getUnsubscribeUrl(unsubscribeToken: string, notificationType?: string): string {
  const params = new URLSearchParams();
  params.set('token', unsubscribeToken);
  if (notificationType) {
    params.set('type', notificationType);
  }
  return `${SITE_URL}/unsubscribe?${params.toString()}`;
}

/**
 * Check email service health
 */
export async function checkEmailServiceHealth(): Promise<{
  configured: boolean;
  rateLimitStatus: typeof rateLimitState;
}> {
  return {
    configured: !!resend,
    rateLimitStatus: { ...rateLimitState },
  };
}
