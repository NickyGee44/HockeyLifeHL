import {
  buildTeamsDirectoryBumpChartData,
  buildTeamsDirectoryBumpChartNarrative,
  resolveTeamPrimaryColor,
  type TeamCommitmentSnapshot,
} from '@/lib/teams-directory-bump-chart';
import type { Team, TeamStanding } from '@/lib/types';

describe('teams directory bump chart helpers', () => {
  const teams: Team[] = [
    {
      id: 'team-a',
      name: 'Falcons',
      slug: 'falcons',
      colors: null,
      primary_color: '#112233',
      secondary_color: null,
      logo: '/falcons.png',
      logo_url: '/falcons.png',
      league_id: 'league-1',
      division_id: 'div-1',
      created_at: '2026-01-01',
    },
    {
      id: 'team-b',
      name: 'Blades',
      slug: 'blades',
      colors: '{"primary":"#445566"}',
      primary_color: null,
      secondary_color: null,
      logo: '/blades.png',
      logo_url: '/blades.png',
      league_id: 'league-1',
      division_id: 'div-1',
      created_at: '2026-01-01',
    },
    {
      id: 'team-c',
      name: 'Wolves',
      slug: 'wolves',
      colors: '#778899,#000000',
      primary_color: null,
      secondary_color: null,
      logo: '/wolves.png',
      logo_url: '/wolves.png',
      league_id: 'league-1',
      division_id: 'div-2',
      created_at: '2026-01-01',
    },
  ];

  const standings: TeamStanding[] = [
    {
      team_id: 'team-a',
      team_name: 'Falcons',
      team_logo: '/falcons.png',
      division_id: 'div-1',
      division_name: 'A',
      team_type: 'standard',
      games_played: 10,
      wins: 8,
      losses: 2,
      ties: 0,
      overtime_losses: 0,
      points: 16,
      goals_for: 42,
      goals_against: 18,
      goal_differential: 24,
      streak: null,
      last_10: null,
    },
    {
      team_id: 'team-b',
      team_name: 'Blades',
      team_logo: '/blades.png',
      division_id: 'div-1',
      division_name: 'A',
      team_type: 'standard',
      games_played: 10,
      wins: 7,
      losses: 3,
      ties: 0,
      overtime_losses: 0,
      points: 14,
      goals_for: 39,
      goals_against: 16,
      goal_differential: 23,
      streak: null,
      last_10: null,
    },
    {
      team_id: 'team-c',
      team_name: 'Wolves',
      team_logo: '/wolves.png',
      division_id: 'div-2',
      division_name: 'B',
      team_type: 'standard',
      games_played: 10,
      wins: 3,
      losses: 7,
      ties: 0,
      overtime_losses: 0,
      points: 6,
      goals_for: 21,
      goals_against: 34,
      goal_differential: -13,
      streak: null,
      last_10: null,
    },
  ];

  const commitment: TeamCommitmentSnapshot[] = [
    {
      teamId: 'team-a',
      attendancePct: 91.2,
      appearances: 73,
      possibleAppearances: 80,
      confirmedAppearances: 70,
      fallbackAppearances: 3,
      gamesPlayed: 10,
    },
    {
      teamId: 'team-b',
      attendancePct: 88.8,
      appearances: 71,
      possibleAppearances: 80,
      confirmedAppearances: 66,
      fallbackAppearances: 5,
      gamesPlayed: 10,
    },
    {
      teamId: 'team-c',
      attendancePct: 62.5,
      appearances: 50,
      possibleAppearances: 80,
      confirmedAppearances: 42,
      fallbackAppearances: 8,
      gamesPlayed: 10,
    },
  ];

  it('builds chart ranks across all four columns', () => {
    const result = buildTeamsDirectoryBumpChartData({
      seasonId: 'season-1',
      teams,
      standings,
      commitment,
    });

    expect(result).not.toBeNull();
    expect(result?.teams).toHaveLength(3);

    const falcons = result?.teams.find((team) => team.teamId === 'team-a');
    const blades = result?.teams.find((team) => team.teamId === 'team-b');

    expect(falcons?.metrics.overall.rank).toBe(1);
    expect(falcons?.metrics.offense.rank).toBe(1);
    expect(falcons?.metrics.defense.rank).toBe(2);
    expect(falcons?.metrics.commitment.rank).toBe(1);

    expect(blades?.metrics.defense.rank).toBe(1);
    expect(blades?.metrics.commitment.valueLabel).toBe('88.8%');
  });

  it('still builds a chart from public teams when standings are missing', () => {
    const result = buildTeamsDirectoryBumpChartData({
      seasonId: 'season-1',
      teams,
      standings: [],
      commitment,
    });

    expect(result).not.toBeNull();
    expect(result?.teams).toHaveLength(3);
    expect(result?.teams.find((team) => team.teamId === 'team-a')?.metrics.overall.valueLabel).toBe('0 pts');
  });

  it('builds deterministic narratives for selected team metrics', () => {
    const result = buildTeamsDirectoryBumpChartData({
      seasonId: 'season-1',
      teams,
      standings,
      commitment,
    });

    const falcons = result?.teams.find((team) => team.teamId === 'team-a');
    const wolves = result?.teams.find((team) => team.teamId === 'team-c');

    expect(falcons).toBeDefined();
    expect(wolves).toBeDefined();
    expect(buildTeamsDirectoryBumpChartNarrative(falcons!, 'offense', result!.totalTeams)).toBe(
      'Falcons sit 1st of 3 in offense with 42 GF. That is the top scoring mark on this chart. 🚨',
    );
    expect(buildTeamsDirectoryBumpChartNarrative(wolves!, 'commitment', result!.totalTeams)).toBe(
      'Wolves sit 3rd of 3 in commitment at 62.5% attendance. Commitment is the clearest place to tighten things up.',
    );
  });

  it('resolves team colors from multiple stored formats', () => {
    expect(resolveTeamPrimaryColor(teams[0])).toBe('#112233');
    expect(resolveTeamPrimaryColor(teams[1])).toBe('#445566');
    expect(resolveTeamPrimaryColor(teams[2])).toBe('#778899');
    expect(resolveTeamPrimaryColor({ primary_color: null, colors: null } as Team)).toBe('var(--league-primary)');
  });
});
