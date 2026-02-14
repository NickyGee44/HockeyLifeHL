import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Tag all events from this app
  initialScope: {
    tags: { app: 'league-builder' },
  },

  // Performance monitoring — sample 10% in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay — capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // Don't send in development by default
  enabled: process.env.NODE_ENV === 'production',
});
