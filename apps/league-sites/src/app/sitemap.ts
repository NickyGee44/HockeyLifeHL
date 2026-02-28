import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

const BASE_URL = 'https://beerleaguehockey.ca';

/**
 * League page routes included in the sitemap.
 * Each entry specifies the path suffix, change frequency, and priority.
 */
const LEAGUE_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}[] = [
  { path: '', changeFrequency: 'daily', priority: 0.9 },
  { path: '/schedule', changeFrequency: 'daily', priority: 0.8 },
  { path: '/scores', changeFrequency: 'daily', priority: 0.8 },
  { path: '/standings', changeFrequency: 'daily', priority: 0.8 },
  { path: '/stats', changeFrequency: 'daily', priority: 0.7 },
  { path: '/teams', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/news', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/about', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/history', changeFrequency: 'weekly', priority: 0.4 },
  { path: '/contact', changeFrequency: 'weekly', priority: 0.4 },
];

/**
 * Dynamic sitemap for all public, active leagues.
 *
 * Generates entries for each league's public pages so search engines
 * can discover and index league content across the multi-tenant platform.
 *
 * Uses the service role client to bypass RLS and avoid cookie requirements
 * during build-time or ISR revalidation.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('slug, updated_at, created_at')
    .eq('status', 'active')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error || !leagues) {
    // Return a minimal sitemap with just the homepage if the query fails
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ];
  }

  const entries: MetadataRoute.Sitemap = [
    // Platform homepage
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Static platform pages
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: new Date('2026-03-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/tos`,
      lastModified: new Date('2026-03-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  for (const league of leagues) {
    const lastModified = league.updated_at
      ? new Date(league.updated_at)
      : league.created_at
        ? new Date(league.created_at)
        : new Date();

    for (const route of LEAGUE_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${league.slug}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  return entries;
}
