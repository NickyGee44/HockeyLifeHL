'use client';

/**
 * Completed Games Tabs
 *
 * Tabbed interface for the "Completed Games" page, showing:
 * - Games list (existing GamesListClient)
 * - Standings (existing StandingsPageClient)
 * - Penalties & Infractions
 * - Suspensions
 * - Referee Notes
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Trophy,
  AlertTriangle,
  Ban,
  FileText,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GamesListClient } from './games-list-client';
import { CreateSuspensionModal } from './create-suspension-modal';
import { reviewSuspension } from '@/lib/actions/suspensions';
import type { Game } from '@/lib/actions/games';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface Suspension {
  id: string;
  player_name: string;
  team_name: string;
  reason: string;
  games_remaining: number;
  start_date: string;
  end_date: string | null;
  status: string | null;
  suspension_type?: string | null;
  severity?: string | null;
  behavior_category?: string | null;
  internal_notes?: string | null;
  review_notes?: string | null;
  appeal_eligible?: boolean | null;
  appeal_deadline?: string | null;
  is_indefinite?: boolean | null;
}

interface Penalty {
  id: string;
  player_name: string;
  team_name: string;
  penalty_type: string;
  penalty_severity: string | null;
  penalty_minutes: number;
  period: number;
  game_date: string;
  game_label: string;
}

interface RefereeNote {
  game_id: string;
  game_label: string;
  game_date: string;
  scorekeeper_notes: string;
}

interface CompletedGamesTabsProps {
  leagueId: string;
  initialGames: Game[];
  initialTeams: Array<{ id: string; name: string; short_name: string | null }>;
  initialSeasons: Array<{ id: string; name: string }>;
  suspensions: Suspension[];
  penalties: Penalty[];
  refereeNotes: RefereeNote[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CompletedGamesTabs({
  leagueId,
  initialGames,
  initialTeams,
  initialSeasons,
  suspensions,
  penalties,
  refereeNotes,
}: CompletedGamesTabsProps) {
  const t = useTranslations('completedGames');

  return (
    <Tabs defaultValue="games" className="space-y-6">
      <TabsList className="bg-neutral-800/50 border border-white/10 p-1 rounded-xl w-full flex flex-wrap gap-1">
        <TabsTrigger
          value="games"
          className="data-[state=active]:bg-rink-500/10 data-[state=active]:text-rink-500 data-[state=active]:border-rink-500/30 text-neutral-400 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 border border-transparent"
        >
          <CheckCircle2 className="w-4 h-4" />
          {t('tabs.games')}
        </TabsTrigger>
        <TabsTrigger
          value="penalties"
          className="data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500 data-[state=active]:border-yellow-500/30 text-neutral-400 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 border border-transparent"
        >
          <AlertTriangle className="w-4 h-4" />
          {t('tabs.penalties')}
          {penalties.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-400 rounded">
              {penalties.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="suspensions"
          className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500 data-[state=active]:border-red-500/30 text-neutral-400 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 border border-transparent"
        >
          <Ban className="w-4 h-4" />
          {t('tabs.suspensions')}
          {suspensions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 rounded">
              {suspensions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="refereeNotes"
          className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/30 text-neutral-400 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 border border-transparent"
        >
          <FileText className="w-4 h-4" />
          {t('tabs.refereeNotes')}
          {refereeNotes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-400 rounded">
              {refereeNotes.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Games Tab */}
      <TabsContent value="games">
        <GamesListClient
          leagueId={leagueId}
          initialGames={initialGames}
          initialTeams={initialTeams}
          initialSeasons={initialSeasons}
        />
      </TabsContent>

      {/* Penalties Tab */}
      <TabsContent value="penalties">
        <PenaltiesSection penalties={penalties} />
      </TabsContent>

      {/* Suspensions Tab */}
      <TabsContent value="suspensions">
        <SuspensionsSection
          suspensions={suspensions}
          leagueId={leagueId}
          teams={initialTeams}
          seasons={initialSeasons}
        />
      </TabsContent>

      {/* Referee Notes Tab */}
      <TabsContent value="refereeNotes">
        <RefereeNotesSection refereeNotes={refereeNotes} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================================
// PENALTIES SECTION
// ============================================================================

function PenaltiesSection({ penalties }: { penalties: Penalty[] }) {
  const t = useTranslations('completedGames');

  if (penalties.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-12 h-12 text-yellow-500/50" />}
        title={t('penalties.emptyTitle')}
        description={t('penalties.emptyDescription')}
      />
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.player')}
              </th>
              <th className="text-left text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.team')}
              </th>
              <th className="text-left text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.type')}
              </th>
              <th className="text-center text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.pim')}
              </th>
              <th className="text-center text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.period')}
              </th>
              <th className="text-left text-xs font-semibold text-neutral-400 px-4 py-3 uppercase tracking-wider">
                {t('penalties.game')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {penalties.map((penalty) => (
              <tr key={penalty.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {penalty.player_name}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-300">
                  {penalty.team_name}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-300">{penalty.penalty_type}</span>
                    {penalty.penalty_severity && (
                      <SeverityBadge severity={penalty.penalty_severity} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center text-yellow-400 font-bold">
                  {penalty.penalty_minutes}
                </td>
                <td className="px-4 py-3 text-sm text-center text-neutral-400">
                  P{penalty.period}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-400">
                  <div>{penalty.game_label}</div>
                  <div className="text-xs text-neutral-500">{penalty.game_date}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    minor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    major: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    misconduct: 'bg-red-500/10 text-red-400 border-red-500/30',
    game_misconduct: 'bg-red-500/20 text-red-300 border-red-500/40',
    match: 'bg-red-500/30 text-red-200 border-red-500/50',
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${colors[severity] || colors.minor}`}>
      {severity.replace('_', ' ')}
    </span>
  );
}

// ============================================================================
// SUSPENSIONS SECTION
// ============================================================================

function SuspensionsSection({
  suspensions,
  leagueId,
  teams,
  seasons,
}: {
  suspensions: Suspension[];
  leagueId: string;
  teams: Array<{ id: string; name: string; short_name: string | null }>;
  seasons: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations('completedGames');

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Active & Recent Suspensions</h3>
      <CreateSuspensionModal
        leagueId={leagueId}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        seasons={seasons}
        onSuccess={() => {/* revalidated server-side */}}
      />
    </div>
  );

  if (suspensions.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Ban className="w-12 h-12 text-red-500/50" />}
          title={t('suspensions.emptyTitle')}
          description={t('suspensions.emptyDescription')}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-3">
        {suspensions.map((suspension) => (
        <div
          key={suspension.id}
          className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4 hover:border-white/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold">{suspension.player_name}</span>
                <span className="text-neutral-500">-</span>
                <span className="text-neutral-300 text-sm">{suspension.team_name}</span>
              </div>
              <p className="text-sm text-neutral-400 mb-2">{suspension.reason}</p>
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                {suspension.suspension_type && (
                  <span className="rounded-full bg-white/5 px-2 py-1 text-neutral-300">
                    {formatSuspensionType(suspension.suspension_type)}
                  </span>
                )}
                {suspension.severity && (
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-300">
                    {formatSeverity(suspension.severity)}
                  </span>
                )}
                {suspension.is_indefinite && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">
                    Indefinite
                  </span>
                )}
                {suspension.behavior_category && (
                  <span className="rounded-full bg-white/5 px-2 py-1 text-neutral-300">
                    {suspension.behavior_category}
                  </span>
                )}
                {suspension.appeal_eligible && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">
                    Appeal eligible
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>
                  {t('suspensions.started')}: {new Date(suspension.start_date).toLocaleDateString()}
                </span>
                {suspension.end_date && (
                  <span>
                    {t('suspensions.ends')}: {new Date(suspension.end_date).toLocaleDateString()}
                  </span>
                )}
                {suspension.appeal_deadline && (
                  <span>
                    Appeal by: {new Date(suspension.appeal_deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              {(suspension.internal_notes || suspension.review_notes) && (
                <div className="mt-3 space-y-2 text-xs">
                  {suspension.internal_notes && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-neutral-300">
                      <span className="font-semibold text-neutral-200">Internal notes:</span> {suspension.internal_notes}
                    </div>
                  )}
                  {suspension.review_notes && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-neutral-300">
                      <span className="font-semibold text-neutral-200">Review notes:</span> {suspension.review_notes}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3">
                <SuspensionReviewActions suspension={suspension} />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {suspension.games_remaining}
                </div>
                <div className="text-xs text-neutral-500">{t('suspensions.gamesLeft')}</div>
              </div>
              <SuspensionStatusBadge status={suspension.status} />
            </div>
          </div>
        </div>
      ))}
      </div>
    </>
  );
}

function SuspensionReviewActions({ suspension }: { suspension: Suspension }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runReview = (decision: 'approve' | 'deny' | 'serve') => {
    startTransition(async () => {
      const result = await reviewSuspension({
        suspensionId: suspension.id,
        decision,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update suspension');
        return;
      }

      const label =
        decision === 'approve'
          ? 'Suspension approved'
          : decision === 'deny'
            ? 'Suspension denied'
            : 'Suspension marked served';
      toast.success(label);
      router.refresh();
    });
  };

  if (!['pending_review', 'active', 'appealed'].includes(suspension.status || '')) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suspension.status === 'pending_review' && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runReview('approve')}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Approve
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runReview('deny')}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Deny
          </button>
        </>
      )}
      {(suspension.status === 'active' || suspension.status === 'appealed') && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReview('serve')}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Mark Served
        </button>
      )}
    </div>
  );
}

function SuspensionStatusBadge({ status }: { status: string | null }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending_review: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Pending Review' },
    active: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Active' },
    served: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Served' },
    appealed: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Appealed' },
    denied: { bg: 'bg-neutral-500/10', text: 'text-neutral-300', label: 'Denied' },
  };

  const config = statusConfig[status || 'active'] || statusConfig.active;

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function formatSuspensionType(type: string) {
  if (type === 'date_range') return 'Date range';
  if (type === 'indefinite') return 'Indefinite';
  return 'Game-based';
}

function formatSeverity(severity: string) {
  return severity
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ============================================================================
// REFEREE NOTES SECTION
// ============================================================================

function RefereeNotesSection({ refereeNotes }: { refereeNotes: RefereeNote[] }) {
  const t = useTranslations('completedGames');

  if (refereeNotes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-12 h-12 text-blue-500/50" />}
        title={t('refereeNotes.emptyTitle')}
        description={t('refereeNotes.emptyDescription')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {refereeNotes.map((note) => (
        <div
          key={note.game_id}
          className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium text-sm">{note.game_label}</span>
            <span className="text-neutral-500 text-xs">{note.game_date}</span>
          </div>
          <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
            {note.scorekeeper_notes}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
      <div className="mx-auto mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 max-w-md mx-auto">{description}</p>
    </div>
  );
}
