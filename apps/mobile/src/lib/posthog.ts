import PostHog from 'posthog-react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  disabled: !POSTHOG_KEY,
});
