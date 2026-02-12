/**
 * Structured Webhook Logging
 *
 * Provides structured logging for webhook events with consistent format
 * for observability and debugging. Prepares for integration with error
 * tracking services like Sentry or Datadog.
 */

export type WebhookLogLevel = 'info' | 'warn' | 'error';

export interface WebhookLogContext {
  stripe_event_id: string;
  stripe_event_type: string;
  organization_id?: string;
  league_id?: string;
  action?: string;
  outcome?: 'success' | 'failure' | 'skipped';
  decision_path?: string;
  metadata?: Record<string, any>;
}

export interface ErrorContext extends WebhookLogContext {
  error_type: string;
  error_message?: string;
  stack_trace?: string;
}

/**
 * Log webhook event with structured context
 */
export function logWebhookEvent(
  level: WebhookLogLevel,
  message: string,
  context: WebhookLogContext
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  switch (level) {
    case 'error':
      console.error('[Webhook]', JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn('[Webhook]', JSON.stringify(logEntry));
      break;
    default:
      console.info('[Webhook]', JSON.stringify(logEntry));
  }
}

/**
 * Log subscription lifecycle event (created, upgraded, downgraded, cancelled)
 */
export function logSubscriptionLifecycle(params: {
  stripe_event_id: string;
  organization_id: string;
  action: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'updated';
  from_tier?: string;
  to_tier?: string;
  from_status?: string;
  to_status?: string;
  decision_path?: string;
}): void {
  logWebhookEvent('info', 'Subscription lifecycle event processed', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: `subscription.${params.action}`,
    organization_id: params.organization_id,
    action: params.action,
    outcome: 'success',
    decision_path: params.decision_path,
    metadata: {
      from_tier: params.from_tier,
      to_tier: params.to_tier,
      from_status: params.from_status,
      to_status: params.to_status,
    },
  });
}

/**
 * Log payment event (succeeded, failed, recovered)
 */
export function logPaymentEvent(params: {
  stripe_event_id: string;
  organization_id: string;
  action: 'payment_succeeded' | 'payment_failed' | 'payment_recovered';
  amount_cents: number;
  decision_path?: string;
  metadata?: Record<string, any>;
}): void {
  logWebhookEvent('info', 'Payment event processed', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: `invoice.${params.action}`,
    organization_id: params.organization_id,
    action: params.action,
    outcome: 'success',
    decision_path: params.decision_path,
    metadata: {
      amount_cents: params.amount_cents,
      ...params.metadata,
    },
  });
}

/**
 * Log Connect account event (updated, capability_active)
 */
export function logConnectAccountEvent(params: {
  stripe_event_id: string;
  league_id: string;
  action: 'account_updated' | 'capability_active' | 'requirements_due';
  decision_path?: string;
  metadata?: Record<string, any>;
}): void {
  logWebhookEvent('info', 'Connect account event processed', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: `account.${params.action}`,
    league_id: params.league_id,
    action: params.action,
    outcome: 'success',
    decision_path: params.decision_path,
    metadata: params.metadata,
  });
}

/**
 * Log event ordering rejection
 */
export function logEventOrderingRejection(params: {
  stripe_event_id: string;
  organization_id: string;
  event_timestamp: number;
  last_timestamp: number;
}): void {
  logWebhookEvent('warn', 'Rejected out-of-order event', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: 'ordering_check',
    organization_id: params.organization_id,
    outcome: 'skipped',
    decision_path: 'event_ordering_validation_failed',
    metadata: {
      event_timestamp: params.event_timestamp,
      last_timestamp: params.last_timestamp,
    },
  });
}

/**
 * Log duplicate event detection
 */
export function logDuplicateEvent(params: {
  stripe_event_id: string;
  organization_id?: string;
  league_id?: string;
}): void {
  logWebhookEvent('info', 'Skipped duplicate event', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: 'duplicate_check',
    organization_id: params.organization_id,
    league_id: params.league_id,
    outcome: 'skipped',
    decision_path: 'duplicate_event_detected',
  });
}

/**
 * Log webhook processing error with full context
 * Integrates with error tracking services (Sentry, Datadog, etc.)
 */
export function logWebhookError(
  error: Error | unknown,
  context: ErrorContext
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stackTrace = error instanceof Error ? error.stack : undefined;

  const errorContext: ErrorContext = {
    ...context,
    error_message: errorMessage,
    stack_trace: stackTrace,
  };

  logWebhookEvent('error', 'Webhook processing error', errorContext);

  // TODO: Integrate with Sentry/Datadog
  // Example Sentry integration:
  // Sentry.captureException(error, {
  //   contexts: {
  //     webhook: errorContext,
  //   },
  // });
}

/**
 * Log notification sent
 */
export function logNotificationSent(params: {
  stripe_event_id: string;
  organization_id?: string;
  league_id?: string;
  notification_type: string;
  recipient_email: string;
  success: boolean;
}): void {
  // Redact email for privacy
  const redactedEmail = params.recipient_email.replace(
    /^(.{1})(.*)@(.*)$/,
    '$1***@$3'
  );

  logWebhookEvent(params.success ? 'info' : 'warn', 'Notification sent', {
    stripe_event_id: params.stripe_event_id,
    stripe_event_type: 'notification',
    organization_id: params.organization_id,
    league_id: params.league_id,
    action: params.notification_type,
    outcome: params.success ? 'success' : 'failure',
    metadata: {
      recipient: redactedEmail,
    },
  });
}
