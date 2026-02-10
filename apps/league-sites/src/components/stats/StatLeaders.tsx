import { Zap, Target, Trophy } from 'lucide-react';
import type { SpecialTeamsLeader } from '@/lib/types';

interface StatLeadersProps {
  leaders: SpecialTeamsLeader[];
  leagueSlug: string;
}

interface LeaderCardProps {
  title: string;
  icon: React.ReactNode;
  players: { name: string; value: number; playerId: string }[];
  leagueSlug: string;
  suffix?: string;
}

function LeaderCard({ title, icon, players, leagueSlug, suffix }: LeaderCardProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">{title}</h3>
      </div>
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={`${player.playerId}-${index}`}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`
                  text-xs font-bold w-5 text-center flex-shrink-0
                  ${index === 0 ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}
                `}
              >
                {index + 1}
              </span>
              <a
                href={`/${leagueSlug}/players/${player.playerId}`}
                className="text-sm truncate hover:text-[var(--league-primary)] transition-colors"
              >
                {player.name}
              </a>
            </div>
            <span
              className={`
                text-sm font-bold flex-shrink-0
                ${index === 0 ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-primary)]'}
              `}
            >
              {player.value}{suffix || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatLeaders({ leaders, leagueSlug }: StatLeadersProps) {
  if (leaders.length === 0) {
    return null;
  }

  // Power Play Points leaders (top 5)
  const ppLeaders = [...leaders]
    .sort((a, b) => b.pp_points - a.pp_points)
    .slice(0, 5)
    .map((p) => ({ name: p.full_name, value: p.pp_points, playerId: p.player_id }));

  // Short-Handed Goals leaders (top 5)
  const shLeaders = [...leaders]
    .sort((a, b) => b.sh_goals - a.sh_goals)
    .slice(0, 5)
    .filter((p) => p.sh_goals > 0)
    .map((p) => ({ name: p.full_name, value: p.sh_goals, playerId: p.player_id }));

  // Game-Winning Goals leaders (top 5)
  const gwgLeaders = [...leaders]
    .sort((a, b) => b.gwg - a.gwg)
    .slice(0, 5)
    .filter((p) => p.gwg > 0)
    .map((p) => ({ name: p.full_name, value: p.gwg, playerId: p.player_id }));

  const hasData = ppLeaders.length > 0 || shLeaders.length > 0 || gwgLeaders.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <LeaderCard
        title="PP Points Leaders"
        icon={<Zap className="w-4 h-4 text-amber-400" />}
        players={ppLeaders}
        leagueSlug={leagueSlug}
      />
      {shLeaders.length > 0 && (
        <LeaderCard
          title="SH Goals Leaders"
          icon={<Target className="w-4 h-4 text-blue-400" />}
          players={shLeaders}
          leagueSlug={leagueSlug}
        />
      )}
      {gwgLeaders.length > 0 && (
        <LeaderCard
          title="GWG Leaders"
          icon={<Trophy className="w-4 h-4 text-emerald-400" />}
          players={gwgLeaders}
          leagueSlug={leagueSlug}
        />
      )}
    </div>
  );
}
