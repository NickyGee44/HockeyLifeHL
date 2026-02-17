/**
 * Subscription Page - Redirects to Billing & Subscriptions
 *
 * The subscription and billing pages have been consolidated into a single
 * page at /settings/billing. This page redirects any old links.
 */

import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;

  // Forward any checkout query params to the billing page
  const queryString = new URLSearchParams();
  if (search.checkout) queryString.set('checkout', search.checkout as string);
  if (search.addon_activated) queryString.set('addon_activated', search.addon_activated as string);

  const qs = queryString.toString();
  const target = `/${locale}/dashboard/settings/billing${qs ? `?${qs}` : ''}`;

  redirect(target);
}
