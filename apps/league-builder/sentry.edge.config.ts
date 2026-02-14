import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  initialScope: {
    tags: { app: 'league-builder' },
  },

  // Performance monitoring — 100% for payment flows, 10% for everything else
  tracesSampler: ({ name, attributes }) => {
    const url = name || (attributes?.['http.target'] as string) || '';

    if (url.includes('/api/stripe/') || url.includes('/api/webhooks/stripe/')) {
      return 1.0;
    }

    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  },

  enabled: process.env.NODE_ENV === 'production',
});
