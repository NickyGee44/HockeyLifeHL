/**
 * Season-scoped Eligibility page
 *
 * Displays playoff eligibility for players in a season.
 */
import { getPlayoffEligibility } from '@/lib/actions/playoff-eligibility';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonEligibilityPage({ params }: Props) {
  const { id: leagueId, seasonId } = await params;

  const result = await getPlayoffEligibility(seasonId);

  // Get teams for grouping
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  const teamMap = new Map(teams?.map((t) => [t.id, t.name]) ?? []);

  // Group players by team
  const playersByTeam = new Map<string, typeof players>();
  const players = result.success ? result.data : [];

  for (const player of players) {
    const teamPlayers = playersByTeam.get(player.team_id) ?? [];
    teamPlayers.push(player);
    playersByTeam.set(player.team_id, teamPlayers);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Playoff Eligibility</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Player eligibility based on games played requirements
        </p>
      </div>

      {!result.success ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <p className="text-red-400">{result.error}</p>
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-neutral-400">No eligibility data available yet.</p>
          <p className="text-sm text-neutral-500 mt-1">
            Eligibility will be calculated once games have been played and eligibility rules are configured.
          </p>
        </div>
      ) : (
        Array.from(playersByTeam.entries()).map(([teamId, teamPlayers]) => (
          <div key={teamId} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              {teamMap.get(teamId) ?? 'Unknown Team'}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-neutral-400 uppercase">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-neutral-400 uppercase">Player</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-neutral-400 uppercase">GP</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-neutral-400 uppercase">Team GP</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-neutral-400 uppercase">GP%</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-neutral-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teamPlayers.map((player) => (
                    <tr
                      key={player.player_id}
                      className={`hover:bg-white/[0.02] ${
                        player.is_eligible ? '' : 'bg-red-500/5'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-neutral-400">
                        {player.jersey_number ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-white">
                        {player.full_name ?? 'Unknown'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">
                        {player.games_played}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">
                        {player.total_team_games}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">
                        {Math.round(player.games_played_pct)}%
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            player.is_eligible
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {player.is_eligible ? 'Eligible' : 'Ineligible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
