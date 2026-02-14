'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftPick, DraftTeam, DraftOrder } from './types';

interface DraftBoardProps {
  teams: DraftTeam[];
  picks: DraftPick[];
  draftOrder: DraftOrder[];
  currentRound: number;
  currentPick: number;
  currentTeamId: string | null;
  totalRounds: number;
}

export function DraftBoard({
  teams,
  picks,
  currentRound,
  currentPick,
  currentTeamId,
  totalRounds,
}: DraftBoardProps) {
  const t = useTranslations('draft');

  // Organize picks by round and team
  const picksByRoundAndTeam = useMemo(() => {
    const organized: Record<number, Record<string, DraftPick | null>> = {};

    for (let round = 1; round <= totalRounds; round++) {
      organized[round] = {};
      teams.forEach((team) => {
        organized[round][team.id] = null;
      });
    }

    picks.forEach((pick) => {
      if (organized[pick.round]) {
        organized[pick.round][pick.team_id] = pick;
      }
    });

    return organized;
  }, [picks, teams, totalRounds]);


  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{t('draftBoard')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('roundAndPick', { round: currentRound, pick: currentPick })}
        </p>
      </div>

      {/* Board */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-medium">
                {t('roundHeader')}
              </th>
              {teams.map((team) => (
                <th
                  key={team.id}
                  className={cn(
                    'px-4 py-3 text-center text-sm font-medium',
                    currentTeamId === team.id && 'bg-rink-500/10'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="h-8 w-8 rounded"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                        style={{ backgroundColor: team.colors || '#666' }}
                      >
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <span className="max-w-[80px] truncate">{team.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
              <tr key={round} className="border-b">
                <td className="sticky left-0 z-10 bg-card px-4 py-2 text-sm font-medium">
                  {round}
                </td>
                {teams.map((team) => {
                  const pick = picksByRoundAndTeam[round]?.[team.id];
                  const isCurrentPick =
                    round === currentRound && currentTeamId === team.id;
                  const isFuturePick = round > currentRound;
                  const isPastPick = round < currentRound || pick !== null;

                  return (
                    <td
                      key={`${round}-${team.id}`}
                      className={cn(
                        'px-2 py-2 text-center',
                        isCurrentPick && 'bg-rink-500/20 ring-2 ring-inset ring-rink-500',
                        isFuturePick && !pick && 'bg-muted/30',
                        isPastPick && !pick && round === currentRound && 'bg-muted/50'
                      )}
                    >
                      {pick ? (
                        <div
                          className={cn(
                            'rounded-md p-2 text-xs',
                            pick.auto_picked
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/10'
                          )}
                        >
                          <p className="font-medium truncate max-w-[100px]">
                            {pick.player_name || 'Player'}
                          </p>
                          {pick.auto_picked && (
                            <p className="text-[10px] text-muted-foreground">
                              {t('autoPicked')}
                            </p>
                          )}
                        </div>
                      ) : isCurrentPick ? (
                        <div className="flex items-center justify-center">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-rink-500" />
                        </div>
                      ) : isFuturePick ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
