/**
 * Season-scoped Standings page
 *
 * Displays league standings for a specific season, grouped by division.
 */
import { getStandingsByDivision } from '@/lib/standings/actions';
import { DEFAULT_COLUMNS } from '@/lib/standings/types';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonStandingsPage({ params }: Props) {
  const { id: leagueId, seasonId } = await params;

  const divisionStandings = await getStandingsByDivision(seasonId, leagueId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Standings</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Current standings for this season
        </p>
      </div>

      {divisionStandings.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-neutral-400">No standings data available yet.</p>
          <p className="text-sm text-neutral-500 mt-1">
            Standings will appear once games have been played.
          </p>
        </div>
      ) : (
        divisionStandings.map((division) => (
          <div key={division.divisionId ?? 'unassigned'} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{division.divisionName}</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10">
                    {DEFAULT_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {col.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {division.teams.map((team) => (
                    <tr
                      key={team.teamId}
                      className={`hover:bg-white/[0.02] ${
                        team.isPlayoffSpot ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center text-neutral-300 font-medium">
                        {team.rank}
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        <span className="font-medium text-white">{team.teamName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.gamesPlayed}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.wins}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.losses}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.ties}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-white">{team.points}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.goalsFor}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-300">{team.goalsAgainst}</td>
                      <td className={`px-3 py-2.5 text-center font-medium ${
                        team.goalDiff > 0 ? 'text-emerald-400' : team.goalDiff < 0 ? 'text-red-400' : 'text-neutral-400'
                      }`}>
                        {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-400 text-xs">{team.homeRecord}</td>
                      <td className="px-3 py-2.5 text-center text-neutral-400 text-xs">{team.awayRecord}</td>
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
