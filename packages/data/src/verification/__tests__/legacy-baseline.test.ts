import {
  buildLegacyBaselineAcceptanceFixture,
  mergeAllTimeGoalieStats,
  mergeAllTimeSkaterStats,
  runLegacyBaselineAcceptanceChecks,
  verifyLegacyArtifactSummary,
} from '../legacy-baseline';

describe('legacy baseline verification helpers', () => {
  it('passes the baseline plus native acceptance checks', () => {
    const checks = runLegacyBaselineAcceptanceChecks();
    expect(checks).toHaveLength(9);
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it('reuses stored baseline goalie save percentage when no native stats are present', () => {
    const fixture = buildLegacyBaselineAcceptanceFixture();
    const goalies = mergeAllTimeGoalieStats({
      baselineRows: fixture.baselineGoalies,
      nativeRows: [],
      useBaseline: true,
    });

    expect(goalies).toHaveLength(1);
    expect(goalies[0]?.save_percentage).toBe(0.91);
    expect(goalies[0]?.games_played).toBe(50);
    expect(goalies[0]?.baseline_games_played).toBe(50);
    expect(goalies[0]?.native_games_played).toBe(0);
  });

  it('keeps native-only all-time skater GP unchanged when baseline is disabled', () => {
    const fixture = buildLegacyBaselineAcceptanceFixture();
    const skaters = mergeAllTimeSkaterStats({
      baselineRows: fixture.baselineSkaters,
      nativeRows: fixture.nativeSkaters,
      useBaseline: false,
    });
    const matched = skaters.find((row) => row.player_id === 'profile-skater-1');

    expect(matched?.games_played).toBe(18);
    expect(matched?.baseline_games_played).toBe(0);
    expect(matched?.native_games_played).toBe(18);
  });

  it('verifies the checked-in legacy artifact counts', () => {
    const checks = verifyLegacyArtifactSummary({
      counts: {
        total_rows: 923,
        skaters: 795,
        goalies: 128,
        matched_profiles: 923,
      },
      repo_expected_counts: {
        total_rows: 923,
        skaters: 795,
        goalies: 128,
      },
    });

    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
