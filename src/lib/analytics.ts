/**
 * Analytics System
 *
 * Privacy-compliant analytics tracking for signup flow, template selections,
 * and user behavior. Supports multiple analytics providers.
 *
 * @since 2026-01-28
 * @agent Agent 1
 * @task Task 4.7 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AnalyticsEvent =
  | 'signup_started'
  | 'signup_step_completed'
  | 'signup_step_abandoned'
  | 'template_selected'
  | 'template_customized'
  | 'signup_completed'
  | 'signup_abandoned'
  | 'template_changed'
  | 'template_reset';

export interface AnalyticsProperties {
  // Signup flow properties
  step?: number;
  totalSteps?: number;
  stepName?: string;

  // Template properties
  templateId?: string;
  templateSlug?: string;
  templateName?: string;
  previousTemplateId?: string;

  // Customization properties
  hasCustomColors?: boolean;
  hasLogo?: boolean;
  selectedPreset?: string;

  // League properties
  leagueId?: string;
  leagueName?: string;
  leagueType?: string;
  sport?: string;
  teamCount?: number;

  // Subscription properties
  subscriptionTier?: string;
  featuresSelected?: string[];

  // Session properties
  duration?: number;
  timestamp?: string;

  // Additional metadata
  [key: string]: any;
}

export interface AnalyticsProvider {
  name: string;
  track: (event: string, properties?: AnalyticsProperties) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  page: (name: string, properties?: Record<string, any>) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
const ANALYTICS_DEBUG = process.env.NODE_ENV === 'development';

// Template tracking for popularity metrics
const TEMPLATE_TRACKING_ENABLED = true;

// ============================================================================
// PROVIDERS
// ============================================================================

/**
 * Console Logger Provider (Development)
 * Logs all analytics events to console for debugging
 */
const consoleProvider: AnalyticsProvider = {
  name: 'Console',
  track: (event: string, properties?: AnalyticsProperties) => {
    if (ANALYTICS_DEBUG) {
      console.log('[Analytics] Track:', event, properties);
    }
  },
  identify: (userId: string, traits?: Record<string, any>) => {
    if (ANALYTICS_DEBUG) {
      console.log('[Analytics] Identify:', userId, traits);
    }
  },
  page: (name: string, properties?: Record<string, any>) => {
    if (ANALYTICS_DEBUG) {
      console.log('[Analytics] Page:', name, properties);
    }
  },
};

/**
 * PostHog Provider (Optional)
 * Uncomment and configure if using PostHog
 */
// const posthogProvider: AnalyticsProvider = {
//   name: 'PostHog',
//   track: (event: string, properties?: AnalyticsProperties) => {
//     if (typeof window !== 'undefined' && window.posthog) {
//       window.posthog.capture(event, properties);
//     }
//   },
//   identify: (userId: string, traits?: Record<string, any>) => {
//     if (typeof window !== 'undefined' && window.posthog) {
//       window.posthog.identify(userId, traits);
//     }
//   },
//   page: (name: string, properties?: Record<string, any>) => {
//     if (typeof window !== 'undefined' && window.posthog) {
//       window.posthog.capture('$pageview', { page: name, ...properties });
//     }
//   },
// };

// Active providers list
const providers: AnalyticsProvider[] = [
  consoleProvider,
  // posthogProvider, // Uncomment when configured
];

// ============================================================================
// CORE ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Track an analytics event
 * Sends event to all configured providers
 *
 * @param event - Event name
 * @param properties - Event properties
 */
export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties
): void {
  if (!ANALYTICS_ENABLED && !ANALYTICS_DEBUG) return;

  const enrichedProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  providers.forEach((provider) => {
    try {
      provider.track(event, enrichedProperties);
    } catch (error) {
      console.error(`[Analytics] Error in ${provider.name}:`, error);
    }
  });
}

/**
 * Identify a user
 * Associates analytics events with a user
 *
 * @param userId - User ID
 * @param traits - User traits/properties
 */
export function identify(
  userId: string,
  traits?: Record<string, any>
): void {
  if (!ANALYTICS_ENABLED && !ANALYTICS_DEBUG) return;

  providers.forEach((provider) => {
    try {
      provider.identify(userId, traits);
    } catch (error) {
      console.error(`[Analytics] Error in ${provider.name}:`, error);
    }
  });
}

/**
 * Track a page view
 * Records when users navigate to different pages
 *
 * @param name - Page name
 * @param properties - Page properties
 */
export function page(
  name: string,
  properties?: Record<string, any>
): void {
  if (!ANALYTICS_ENABLED && !ANALYTICS_DEBUG) return;

  providers.forEach((provider) => {
    try {
      provider.page(name, properties);
    } catch (error) {
      console.error(`[Analytics] Error in ${provider.name}:`, error);
    }
  });
}

// ============================================================================
// SIGNUP FLOW TRACKING
// ============================================================================

/**
 * Track when user starts the signup flow
 */
export function trackSignupStarted(): void {
  track('signup_started', {
    totalSteps: 7,
  });
}

/**
 * Track completion of a signup step
 *
 * @param step - Step number (1-7)
 * @param stepName - Human-readable step name
 * @param properties - Additional step data
 */
export function trackSignupStepCompleted(
  step: number,
  stepName: string,
  properties?: AnalyticsProperties
): void {
  track('signup_step_completed', {
    step,
    totalSteps: 7,
    stepName,
    ...properties,
  });
}

/**
 * Track when user abandons a signup step
 * Called when user navigates away or closes tab
 *
 * @param step - Last step user was on
 * @param stepName - Step name
 */
export function trackSignupStepAbandoned(
  step: number,
  stepName: string
): void {
  track('signup_step_abandoned', {
    step,
    totalSteps: 7,
    stepName,
  });
}

/**
 * Track successful signup completion
 *
 * @param properties - League and user data
 */
export function trackSignupCompleted(
  properties: AnalyticsProperties
): void {
  track('signup_completed', {
    ...properties,
    success: true,
  });
}

/**
 * Track when user fully abandons signup (closes without completing)
 *
 * @param lastStep - Last step they reached
 * @param stepName - Step name
 */
export function trackSignupAbandoned(
  lastStep: number,
  stepName: string
): void {
  track('signup_abandoned', {
    step: lastStep,
    totalSteps: 7,
    stepName,
  });
}

// ============================================================================
// TEMPLATE TRACKING
// ============================================================================

/**
 * Track when user selects a template
 *
 * @param templateId - Template ID
 * @param templateSlug - Template slug
 * @param templateName - Template name
 * @param step - Which step they're on (for signup context)
 */
export function trackTemplateSelected(
  templateId: string,
  templateSlug: string,
  templateName: string,
  step?: number
): void {
  if (!TEMPLATE_TRACKING_ENABLED) return;

  track('template_selected', {
    templateId,
    templateSlug,
    templateName,
    step,
  });
}

/**
 * Track when user customizes template colors
 *
 * @param templateId - Template ID
 * @param hasCustomColors - Whether custom colors are used
 * @param selectedPreset - Preset name if using a preset
 */
export function trackTemplateCustomized(
  templateId: string,
  hasCustomColors: boolean,
  selectedPreset?: string
): void {
  if (!TEMPLATE_TRACKING_ENABLED) return;

  track('template_customized', {
    templateId,
    hasCustomColors,
    selectedPreset,
  });
}

/**
 * Track when user changes template (post-signup)
 *
 * @param leagueId - League ID
 * @param previousTemplateId - Previous template
 * @param newTemplateId - New template
 * @param newTemplateSlug - New template slug
 */
export function trackTemplateChanged(
  leagueId: string,
  previousTemplateId: string | null,
  newTemplateId: string,
  newTemplateSlug: string
): void {
  if (!TEMPLATE_TRACKING_ENABLED) return;

  track('template_changed', {
    leagueId,
    previousTemplateId,
    templateId: newTemplateId,
    templateSlug: newTemplateSlug,
  });
}

/**
 * Track when user resets template to defaults
 *
 * @param leagueId - League ID
 * @param templateId - Template ID
 */
export function trackTemplateReset(
  leagueId: string,
  templateId: string
): void {
  if (!TEMPLATE_TRACKING_ENABLED) return;

  track('template_reset', {
    leagueId,
    templateId,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a timer to track duration of an action
 * Returns a function to call when action completes
 *
 * @example
 * const endTimer = trackDuration();
 * // ... do something ...
 * const duration = endTimer(); // Returns duration in ms
 */
export function trackDuration(): () => number {
  const startTime = Date.now();
  return () => Date.now() - startTime;
}

/**
 * Sanitize properties to remove sensitive data
 * Ensures no PII (personally identifiable information) is tracked
 *
 * @param properties - Raw properties
 * @returns Sanitized properties
 */
export function sanitizeProperties(
  properties: Record<string, any>
): Record<string, any> {
  const sanitized = { ...properties };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'email', // Unless explicitly allowed
    'phone',
    'ssn',
    'creditCard',
    'token',
    'secret',
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return ANALYTICS_ENABLED || ANALYTICS_DEBUG;
}

/**
 * Get analytics configuration
 */
export function getAnalyticsConfig() {
  return {
    enabled: ANALYTICS_ENABLED,
    debug: ANALYTICS_DEBUG,
    templateTracking: TEMPLATE_TRACKING_ENABLED,
    providers: providers.map((p) => p.name),
  };
}

// ============================================================================
// BROWSER VISIBILITY API (Track abandonment)
// ============================================================================

/**
 * Track when user leaves page (potential abandonment)
 * Should be called in useEffect cleanup or beforeunload event
 *
 * @param context - Context data (step, page, etc.)
 */
export function trackPageExit(context: AnalyticsProperties): void {
  if (typeof window === 'undefined') return;

  // Use sendBeacon for reliable tracking on page unload
  const data = {
    event: 'page_exit',
    ...sanitizeProperties(context),
    timestamp: new Date().toISOString(),
  };

  // In production, send to analytics endpoint
  if (ANALYTICS_DEBUG) {
    console.log('[Analytics] Page Exit:', data);
  }

  // Example: navigator.sendBeacon('/api/analytics', JSON.stringify(data));
}

// ============================================================================
// REACT HOOKS (optional, for convenience)
// ============================================================================

/**
 * Hook for tracking component mount/unmount
 * Usage in React components:
 *
 * useEffect(() => {
 *   track('component_viewed', { component: 'TemplateSelector' });
 *   return () => trackPageExit({ component: 'TemplateSelector' });
 * }, []);
 */

// ============================================================================
// END OF ANALYTICS SYSTEM
// ============================================================================

// Export configuration check
if (ANALYTICS_DEBUG) {
  console.log('[Analytics] Configuration:', getAnalyticsConfig());
}
