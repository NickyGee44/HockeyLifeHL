import { buildGeneratedPlayoffScopes } from '../bracket-generation';

describe('buildGeneratedPlayoffScopes', () => {
  it('builds one official bracket per division when division playoffs are enabled', () => {
    const result = buildGeneratedPlayoffScopes(
      [
        { team_id: 'east-1', division_id: 'east', division_name: 'East' },
        { team_id: 'east-2', division_id: 'east', division_name: 'East' },
        { team_id: 'east-3', division_id: 'east', division_name: 'East' },
        { team_id: 'east-4', division_id: 'east', division_name: 'East' },
        { team_id: 'west-1', division_id: 'west', division_name: 'West' },
        { team_id: 'west-2', division_id: 'west', division_name: 'West' },
        { team_id: 'west-3', division_id: 'west', division_name: 'West' },
        { team_id: 'west-4', division_id: 'west', division_name: 'West' },
      ],
      {
        useDivisionPlayoffs: true,
        playoffTeamsPerDivision: 4,
        playoffTeamsTotal: 8,
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(2);
    expect(result.data.map((scope) => scope.divisionId)).toEqual(['east', 'west']);
    expect(result.data[0]?.series[0]).toEqual(
      expect.objectContaining({
        division_id: 'east',
        round_number: 1,
        series_number: 1,
        high_seed_id: 'east-1',
        low_seed_id: 'east-4',
        status: 'pending',
      }),
    );
    expect(result.data[1]?.series[0]).toEqual(
      expect.objectContaining({
        division_id: 'west',
        round_number: 1,
        series_number: 1,
        high_seed_id: 'west-1',
        low_seed_id: 'west-4',
        status: 'pending',
      }),
    );
  });

  it('pre-populates later rounds from first-round byes', () => {
    const result = buildGeneratedPlayoffScopes(
      [
        { team_id: 'seed-1' },
        { team_id: 'seed-2' },
        { team_id: 'seed-3' },
      ],
      {
        useDivisionPlayoffs: false,
        playoffTeamsTotal: 3,
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const scope = result.data[0];
    expect(scope).toBeDefined();
    expect(scope?.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          round_number: 1,
          series_number: 1,
          high_seed_id: 'seed-1',
          low_seed_id: null,
          winner_id: 'seed-1',
          status: 'completed',
        }),
        expect.objectContaining({
          round_number: 2,
          series_number: 1,
          high_seed_id: 'seed-1',
          low_seed_id: null,
          winner_id: null,
          status: 'pending',
        }),
      ]),
    );
  });

  it('falls back to one overall bracket when division playoffs are disabled', () => {
    const result = buildGeneratedPlayoffScopes(
      [
        { team_id: 'seed-1', division_id: 'east', division_name: 'East' },
        { team_id: 'seed-2', division_id: 'west', division_name: 'West' },
        { team_id: 'seed-3', division_id: 'east', division_name: 'East' },
        { team_id: 'seed-4', division_id: 'west', division_name: 'West' },
      ],
      {
        useDivisionPlayoffs: false,
        playoffTeamsTotal: 4,
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.divisionId).toBeNull();
    expect(result.data[0]?.series[0]).toEqual(
      expect.objectContaining({
        division_id: null,
        high_seed_id: 'seed-1',
        low_seed_id: 'seed-4',
      }),
    );
  });
});
