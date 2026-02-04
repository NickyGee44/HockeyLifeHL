/**
 * New Season Page
 *
 * Form for creating a new season within a league.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { NewSeasonForm } from './NewSeasonForm';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewSeasonPage({ params }: PageProps) {
  const { id: leagueId } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get league info
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-gold-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: league.primary_color || '#D4AF37' }}
            >
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Season</h1>
              <p className="text-neutral-400 mt-1">
                Set up a new season for {league.name}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <NewSeasonForm leagueId={leagueId} />
      </div>
    </div>
  );
}
