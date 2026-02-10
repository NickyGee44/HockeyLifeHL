'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Trash2,
  ArrowRight,
  Calendar,
  Users,
  Play,
  UserPlus,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';
import type { SeasonStatus, SeasonWithCounts } from '@/lib/actions/seasons';
import {
  updateSeasonStatus,
  deleteSeason,
  cloneSeason,
} from '@/lib/actions/seasons';

const STATUS_TABS: (SeasonStatus | 'all')[] = ['all', 'draft', 'active', 'playoffs', 'completed', 'archived'];

const STATUS_COLORS: Record<SeasonStatus, string> = {
  draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  active: 'bg-green-500/10 text-green-500 border-green-500/30',
  playoffs: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  completed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  archived: 'bg-neutral-800/50 text-neutral-500 border-neutral-700/50',
};

const VALID_TRANSITIONS: Record<SeasonStatus, SeasonStatus[]> = {
  draft: ['active'],
  active: ['playoffs', 'completed'],
  playoffs: ['completed'],
  completed: ['archived'],
  archived: ['completed'],
};

interface SeasonsTableProps {
  seasons: SeasonWithCounts[];
  leagueId: string;
  locale: string;
}

export function SeasonsTable({ seasons, leagueId, locale }: SeasonsTableProps) {
  const t = useTranslations('seasons');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SeasonStatus | 'all'>('all');
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SeasonWithCounts | null>(null);
  const [cloneTarget, setCloneTarget] = useState<SeasonWithCounts | null>(null);
  const [cloneName, setCloneName] = useState('');

  const filteredSeasons = activeTab === 'all'
    ? seasons
    : seasons.filter(s => (s.status || 'draft') === activeTab);

  const handleStatusChange = (seasonId: string, newStatus: SeasonStatus) => {
    startTransition(async () => {
      const result = await updateSeasonStatus(seasonId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('statusUpdated'));
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteSeason(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('seasonDeleted'));
        router.refresh();
      }
      setDeleteTarget(null);
    });
  };

  const handleClone = () => {
    if (!cloneTarget || !cloneName.trim()) return;
    startTransition(async () => {
      const result = await cloneSeason(cloneTarget.id, cloneName.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('seasonCloned'));
        router.refresh();
      }
      setCloneTarget(null);
      setCloneName('');
    });
  };

  const openCloneDialog = (season: SeasonWithCounts) => {
    setCloneTarget(season);
    setCloneName(`${season.name} (Copy)`);
  };

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-rink-500/20 text-rink-400 border border-rink-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
            )}
          >
            {t(`filter.${tab}`)}
            {tab !== 'all' && (
              <span className="ml-2 text-xs opacity-70">
                {seasons.filter(s => (s.status || 'draft') === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredSeasons.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.04] border border-white/10 rounded-2xl">
          <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">{t('noSeasons')}</h3>
          <p className="text-neutral-400 text-sm">{t('noSeasonsDescription')}</p>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-neutral-400">{t('table.name')}</TableHead>
                <TableHead className="text-neutral-400">{t('table.status')}</TableHead>
                <TableHead className="text-neutral-400 hidden md:table-cell">{t('table.dates')}</TableHead>
                <TableHead className="text-neutral-400 hidden lg:table-cell text-center">
                  <Users className="w-4 h-4 inline-block" />
                </TableHead>
                <TableHead className="text-neutral-400 hidden lg:table-cell text-center">
                  <Play className="w-4 h-4 inline-block" />
                </TableHead>
                <TableHead className="text-neutral-400 hidden lg:table-cell text-center">
                  <UserPlus className="w-4 h-4 inline-block" />
                </TableHead>
                <TableHead className="text-neutral-400 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeasons.map(season => {
                const status = (season.status || 'draft') as SeasonStatus;
                const transitions = VALID_TRANSITIONS[status] || [];

                return (
                  <TableRow key={season.id} className="border-white/10 hover:bg-white/[0.02]">
                    <TableCell>
                      <Link
                        href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}`}
                        className="font-medium text-white hover:text-rink-400 transition-colors"
                      >
                        {season.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', STATUS_COLORS[status])}
                      >
                        {t(`status.${status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-neutral-400 text-sm">
                      {new Date(season.start_date).toLocaleDateString()} -{' '}
                      {season.end_date
                        ? new Date(season.end_date).toLocaleDateString()
                        : t('ongoing')}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center text-neutral-300">
                      {season.teams_count}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center text-neutral-300">
                      {season.games_count}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center text-neutral-300">
                      {season.registrations_count}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4 text-neutral-400" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('actions.title')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}`}>
                              <ArrowRight className="w-4 h-4 mr-2" />
                              {t('actions.view')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('actions.edit')}
                            </Link>
                          </DropdownMenuItem>
                          {transitions.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                {t('actions.changeStatus')}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {transitions.map(newStatus => (
                                  <DropdownMenuItem
                                    key={newStatus}
                                    onClick={() => handleStatusChange(season.id, newStatus)}
                                  >
                                    <Badge
                                      variant="outline"
                                      className={cn('capitalize mr-2', STATUS_COLORS[newStatus])}
                                    >
                                      {t(`status.${newStatus}`)}
                                    </Badge>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openCloneDialog(season)}>
                            <Copy className="w-4 h-4 mr-2" />
                            {t('actions.clone')}
                          </DropdownMenuItem>
                          {status !== 'archived' && status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(season.id, 'archived')}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              {t('actions.archive')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(season)}
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <AlertDialog open={!!cloneTarget} onOpenChange={open => !open && setCloneTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cloneDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cloneDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label htmlFor="clone-name" className="block text-sm font-medium text-neutral-300 mb-2">
              {t('cloneDialog.nameLabel')}
            </label>
            <input
              id="clone-name"
              type="text"
              value={cloneName}
              onChange={e => setCloneName(e.target.value)}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-rink-500 focus:outline-none focus:ring-1 focus:ring-rink-500'
              )}
              placeholder={t('cloneDialog.namePlaceholder')}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cloneDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClone}
              disabled={!cloneName.trim()}
              className="bg-rink-500 text-black hover:bg-rink-600"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {t('cloneDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
