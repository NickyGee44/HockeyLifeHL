import Link from 'next/link';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type {
  TeamWithStats,
  GameSheetGoal,
  GameSheetPenalty,
  GameSheetGoalie,
  GamePlayerStats,
} from '@/lib/types';

interface GameBoxScoreProps {
  goals: GameSheetGoal[];
  penalties: GameSheetPenalty[];
  goalies: GameSheetGoalie[];
  playerStats: GamePlayerStats[];
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  leagueSlug: string;
}

export function GameBoxScore({
  goals,
  penalties,
  goalies,
  playerStats,
  homeTeam,
  awayTeam,
  leagueSlug,
}: GameBoxScoreProps) {
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayColors = awayTeam.colors?.split(',') || [];
  const homePrimary = homeColors[0] || 'var(--league-primary)';
  const awayPrimary = awayColors[0] || 'var(--league-primary)';

  const homePlayerStats = playerStats
    .filter((p) => p.team_id === homeTeam.id)
    .sort((a, b) => b.points - a.points || b.goals - a.goals);
  const awayPlayerStats = playerStats
    .filter((p) => p.team_id === awayTeam.id)
    .sort((a, b) => b.points - a.points || b.goals - a.goals);

  const homeGoalies = goalies.filter((g) => g.team_id === homeTeam.id);
  const awayGoalies = goalies.filter((g) => g.team_id === awayTeam.id);

  return (
    <div className="space-y-8">
      {/* Scoring Summary */}
      {goals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-bold">Scoring Summary</h3>
          </div>
          <div className="p-4 sm:p-6">
            <ScoringByPeriod
              goals={goals}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homePrimary={homePrimary}
              awayPrimary={awayPrimary}
              leagueSlug={leagueSlug}
            />
          </div>
        </div>
      )}

      {/* Penalty Summary */}
      {penalties.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-bold">Penalty Summary</h3>
          </div>
          <div className="p-4 sm:p-6">
            <PenaltyByPeriod
              penalties={penalties}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homePrimary={homePrimary}
              awayPrimary={awayPrimary}
              leagueSlug={leagueSlug}
            />
          </div>
        </div>
      )}

      {/* Player Stats Tables */}
      {playerStats.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <PlayerStatsTable
            players={awayPlayerStats}
            team={awayTeam}
            teamColor={awayPrimary}
            leagueSlug={leagueSlug}
          />
          <PlayerStatsTable
            players={homePlayerStats}
            team={homeTeam}
            teamColor={homePrimary}
            leagueSlug={leagueSlug}
          />
        </div>
      )}

      {/* Goalie Stats */}
      {goalies.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-bold">Goalie Stats</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wide border-b border-[var(--color-border-muted)]">
                    <th className="text-left py-2 pr-4">Goalie</th>
                    <th className="text-left py-2 pr-4">Team</th>
                    <th className="text-center py-2 px-2">SA</th>
                    <th className="text-center py-2 px-2">SV</th>
                    <th className="text-center py-2 px-2">GA</th>
                    <th className="text-center py-2 px-2">SV%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...awayGoalies, ...homeGoalies].map((goalie) => {
                    const isHome = goalie.team_id === homeTeam.id;
                    const color = isHome ? homePrimary : awayPrimary;
                    const team = isHome ? homeTeam : awayTeam;
                    return (
                      <tr
                        key={goalie.player_id}
                        className="border-b border-[var(--color-border-muted)] last:border-b-0"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/${leagueSlug}/players/${goalie.player_id}`}
                            className="font-medium hover:underline"
                            style={{ color }}
                          >
                            {goalie.player_name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/${leagueSlug}/teams/${team.slug}`}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <TeamLogo
                              logoUrl={team.logo}
                              teamName={team.name}
                              teamColor={color}
                              size="xs"
                            />
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {team.name}
                            </span>
                          </Link>
                        </td>
                        <td className="text-center py-3 px-2">{goalie.shots_against}</td>
                        <td className="text-center py-3 px-2">{goalie.saves}</td>
                        <td className="text-center py-3 px-2">{goalie.goals_against}</td>
                        <td className="text-center py-3 px-2 font-semibold">
                          {goalie.save_percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Scoring By Period ---------- */

function ScoringByPeriod({
  goals,
  homeTeam,
  awayTeam,
  homePrimary,
  awayPrimary,
  leagueSlug,
}: {
  goals: GameSheetGoal[];
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homePrimary: string;
  awayPrimary: string;
  leagueSlug: string;
}) {
  const periods = [...new Set(goals.map((g) => g.period))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {periods.map((period) => {
        const periodGoals = goals.filter((g) => g.period === period);
        const periodLabel = period <= 3 ? `${ordinal(period)} Period` : period === 4 ? 'Overtime' : `OT${period - 3}`;

        return (
          <div key={period}>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-2">
              {periodLabel}
            </div>
            <div className="space-y-2">
              {periodGoals.map((goal, idx) => {
                const isHome = goal.team_id === homeTeam.id;
                const color = isHome ? homePrimary : awayPrimary;
                const team = isHome ? homeTeam : awayTeam;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--color-surface-hover) 50%, transparent)',
                    }}
                  >
                    {/* Time */}
                    <span className="text-xs text-[var(--color-text-muted)] font-mono w-12 flex-shrink-0">
                      {goal.time || '—'}
                    </span>

                    {/* Team logo */}
                    <TeamLogo
                      logoUrl={team.logo}
                      teamName={team.name}
                      teamColor={color}
                      size="xs"
                    />

                    {/* Scorer + Assists */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${leagueSlug}/players/${goal.scorer.id}`}
                          className="font-semibold text-sm hover:underline"
                          style={{ color }}
                        >
                          {goal.scorer.name}
                        </Link>
                        {/* Badges */}
                        {goal.is_power_play && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--league-primary)]">
                            PPG
                          </span>
                        )}
                        {goal.is_short_handed && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                            SHG
                          </span>
                        )}
                        {goal.is_empty_net && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                            EN
                          </span>
                        )}
                      </div>
                      {(goal.assist1 || goal.assist2) && (
                        <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          Assists:{' '}
                          {goal.assist1 && (
                            <Link
                              href={`/${leagueSlug}/players/${goal.assist1.id}`}
                              className="hover:underline"
                            >
                              {goal.assist1.name}
                            </Link>
                          )}
                          {goal.assist1 && goal.assist2 && ', '}
                          {goal.assist2 && (
                            <Link
                              href={`/${leagueSlug}/players/${goal.assist2.id}`}
                              className="hover:underline"
                            >
                              {goal.assist2.name}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Penalties By Period ---------- */

function PenaltyByPeriod({
  penalties,
  homeTeam,
  awayTeam,
  homePrimary,
  awayPrimary,
  leagueSlug,
}: {
  penalties: GameSheetPenalty[];
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homePrimary: string;
  awayPrimary: string;
  leagueSlug: string;
}) {
  const periods = [...new Set(penalties.map((p) => p.period))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {periods.map((period) => {
        const periodPenalties = penalties.filter((p) => p.period === period);
        const periodLabel = period <= 3 ? `${ordinal(period)} Period` : period === 4 ? 'Overtime' : `OT${period - 3}`;

        return (
          <div key={period}>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-2">
              {periodLabel}
            </div>
            <div className="space-y-2">
              {periodPenalties.map((penalty, idx) => {
                const isHome = penalty.team_id === homeTeam.id;
                const color = isHome ? homePrimary : awayPrimary;
                const team = isHome ? homeTeam : awayTeam;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--color-surface-hover) 50%, transparent)',
                    }}
                  >
                    <span className="text-xs text-[var(--color-text-muted)] font-mono w-12 flex-shrink-0">
                      {penalty.time || '—'}
                    </span>
                    <TeamLogo
                      logoUrl={team.logo}
                      teamName={team.name}
                      teamColor={color}
                      size="xs"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${leagueSlug}/players/${penalty.player.id}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color }}
                      >
                        {penalty.player.name}
                      </Link>
                      <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                        {penalty.infraction}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex-shrink-0">
                      {penalty.minutes} min
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Player Stats Table ---------- */

function PlayerStatsTable({
  players,
  team,
  teamColor,
  leagueSlug,
}: {
  players: GamePlayerStats[];
  team: TeamWithStats;
  teamColor: string;
  leagueSlug: string;
}) {
  if (players.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <Link
          href={`/${leagueSlug}/teams/${team.slug}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <TeamLogo
            logoUrl={team.logo}
            teamName={team.name}
            teamColor={teamColor}
            size="sm"
          />
          <h3 className="text-lg font-bold">{team.name}</h3>
        </Link>
      </div>
      <div className="p-2 sm:p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wide border-b border-[var(--color-border-muted)]">
              <th className="text-left py-2 pr-2">Player</th>
              <th className="text-center py-2 px-1">G</th>
              <th className="text-center py-2 px-1">A</th>
              <th className="text-center py-2 px-1">PTS</th>
              <th className="text-center py-2 px-1">SOG</th>
              <th className="text-center py-2 px-1">PIM</th>
              <th className="text-center py-2 px-1">+/-</th>
              <th className="text-center py-2 px-1 hidden sm:table-cell">PPG</th>
              <th className="text-center py-2 px-1 hidden sm:table-cell">SHG</th>
              <th className="text-center py-2 px-1 hidden sm:table-cell">GWG</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.player_id}
                className="border-b border-[var(--color-border-muted)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <td className="py-2 pr-2">
                  <Link
                    href={`/${leagueSlug}/players/${player.player_id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    {player.jersey_number && (
                      <span className="text-xs text-[var(--color-text-muted)] w-5 text-right">
                        #{player.jersey_number}
                      </span>
                    )}
                    <span className="font-medium text-sm truncate max-w-[120px]" style={{ color: teamColor }}>
                      {player.player_name}
                    </span>
                    {player.position && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {player.position}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="text-center py-2 px-1 font-semibold">
                  {player.goals || '—'}
                </td>
                <td className="text-center py-2 px-1">{player.assists || '—'}</td>
                <td className="text-center py-2 px-1 font-bold">
                  {player.points || '—'}
                </td>
                <td className="text-center py-2 px-1">{player.shots || '—'}</td>
                <td className="text-center py-2 px-1">{player.penalty_minutes || '—'}</td>
                <td className="text-center py-2 px-1">
                  {player.plus_minus > 0
                    ? `+${player.plus_minus}`
                    : player.plus_minus === 0
                      ? '—'
                      : player.plus_minus}
                </td>
                <td className="text-center py-2 px-1 hidden sm:table-cell">
                  {player.power_play_goals || '—'}
                </td>
                <td className="text-center py-2 px-1 hidden sm:table-cell">
                  {player.short_handed_goals || '—'}
                </td>
                <td className="text-center py-2 px-1 hidden sm:table-cell">
                  {player.game_winning_goals || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default GameBoxScore;
