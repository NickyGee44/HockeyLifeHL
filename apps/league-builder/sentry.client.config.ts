import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Tag all events from this app
  initialScope: {
    tags: { app: 'league-builder' },
  },

  // Performance monitoring — 100% for payment pages, 10% for everything else
  tracesSampler: ({ name, attributes }) => {
    const url = name || (attributes?.['http.target'] as string) || '';

    // 100% sampling for payment and billing pages
    if (url.includes('/payments') || url.includes('/billing')) {
      return 1.0;
    }

    // 10% for everything else in production, 100% in dev
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  },

  // Session replay — capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // Don't send in development by default
  enabled: process.env.NODE_ENV === 'production',
});
