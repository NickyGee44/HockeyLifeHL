import type { TeamRatingRecord } from '@/lib/ratings';
import { TEAM_RATING_METRIC_HELP } from '@/lib/ratings';
import { RatingsHelpTooltip } from './RatingsHelpTooltip';

interface TeamRatingsCardProps {
  teamRatings: (TeamRatingRecord & { teamName: string; divisionName: string })[];
}

export function TeamRatingsCard({ teamRatings }: TeamRatingsCardProps) {
  if (teamRatings.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 text-neutral-400">
        No team ratings yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {teamRatings.map((team) => (
        <div key={team.team_id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-white">{team.teamName}</p>
              <p className="text-xs text-neutral-500">{team.divisionName}</p>
            </div>
            <span className="px-2 py-1 rounded bg-rink-500/20 text-rink-400 text-xs font-semibold">
              {team.overall_grade}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Overall" value={team.overall_percentile} help={TEAM_RATING_METRIC_HELP.overall} />
            <Metric label="Record" value={team.record_factor} help={TEAM_RATING_METRIC_HELP.record} />
            <Metric label="Offense" value={team.offense_rating} help={TEAM_RATING_METRIC_HELP.offense} />
            <Metric label="Defense" value={team.defense_rating} help={TEAM_RATING_METRIC_HELP.defense} />
            <Metric label="Goalies" value={team.goaltending_rating} help={TEAM_RATING_METRIC_HELP.goalies} />
            <Metric label="Roster" value={team.roster_count} integer help={TEAM_RATING_METRIC_HELP.roster} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  integer,
  help,
}: {
  label: string;
  value: number | null;
  integer?: boolean;
  help?: string;
}) {
  const safe = Number(value ?? 0);
  return (
    <div className="bg-neutral-900/60 rounded px-2 py-1.5">
      <div className="flex items-center gap-1 text-neutral-500">
        {label}
        {help ? <RatingsHelpTooltip label={label} description={help} /> : null}
      </div>
      <div className="text-white font-semibold">{integer ? Math.round(safe) : safe.toFixed(1)}</div>
    </div>
  );
}
