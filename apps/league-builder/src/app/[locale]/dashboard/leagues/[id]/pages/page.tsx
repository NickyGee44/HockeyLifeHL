import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeletePageButton } from './DeletePageButton';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function CustomPagesListPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  const [{ data: league, error: leagueError }, { data: pages, error: pagesError }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
    supabase.from('custom_pages').select('*').eq('league_id', leagueId).order('sort_order', { ascending: true }),
  ]);

  if (leagueError || !league) {
    notFound();
  }

  if (pagesError) {
    console.error('[Custom Pages] Failed to fetch pages:', pagesError.message);
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {league.name}
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Custom Pages</h1>
              <p className="mt-1 text-neutral-400">Manage custom website pages for {league.name}</p>
            </div>

            <Button asChild>
              <Link href={`/${locale}/dashboard/leagues/${leagueId}/pages/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Page
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {(pages || []).length > 0 ? (
            (pages || []).map((page) => (
              <Card key={page.id} className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">{page.title}</CardTitle>
                      <p className="mt-1 text-sm text-neutral-400">/p/{page.slug}</p>
                    </div>
                    <Badge variant={page.is_published ? 'default' : 'secondary'}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${locale}/dashboard/leagues/${leagueId}/pages/${page.id}`}>Edit</Link>
                    </Button>
                    <DeletePageButton pageId={page.id} leagueId={leagueId} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardContent className="py-10 text-center">
                <p className="text-neutral-300">No custom pages yet.</p>
                <p className="mt-1 text-sm text-neutral-500">Create your first page to customize your website.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
