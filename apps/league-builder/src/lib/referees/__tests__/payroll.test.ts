import { describe, expect, it } from '@jest/globals';
import { resolveRefereePayroll } from '../payroll';

const baseConfig = {
  game_fee_cents: 4500,
  solo_game_fee_cents: 6500,
  paired_game_fee_cents: 5000,
  linesman_fee_cents: 3500,
  single_game_fee_cents: 5500,
};

describe('resolveRefereePayroll', () => {
  it('uses linesman rate for linesmen when configured', () => {
    expect(
      resolveRefereePayroll(baseConfig, {
        role: 'linesman',
        officialsOnGame: 2,
        assignmentsThatDay: 2,
      })
    ).toEqual({
      amountCents: 3500,
      ruleApplied: 'linesman',
    });
  });

  it('uses single-game rate when it is the only assignment that day', () => {
    expect(
      resolveRefereePayroll(baseConfig, {
        role: 'referee',
        officialsOnGame: 2,
        assignmentsThatDay: 1,
      })
    ).toEqual({
      amountCents: 5500,
      ruleApplied: 'single_game',
    });
  });

  it('uses solo rate when the referee is working alone and no single-game override applies', () => {
    expect(
      resolveRefereePayroll(baseConfig, {
        role: 'referee',
        officialsOnGame: 1,
        assignmentsThatDay: 2,
      })
    ).toEqual({
      amountCents: 6500,
      ruleApplied: 'solo',
    });
  });

  it('uses paired rate when multiple officials are assigned and no higher-priority override applies', () => {
    expect(
      resolveRefereePayroll(baseConfig, {
        role: 'referee',
        officialsOnGame: 2,
        assignmentsThatDay: 2,
      })
    ).toEqual({
      amountCents: 5000,
      ruleApplied: 'paired',
    });
  });

  it('falls back to the standard game fee', () => {
    expect(
      resolveRefereePayroll(
        {
          game_fee_cents: 4200,
          solo_game_fee_cents: 0,
          paired_game_fee_cents: 0,
          linesman_fee_cents: 0,
          single_game_fee_cents: 0,
        },
        {
          role: 'referee',
          officialsOnGame: 2,
          assignmentsThatDay: 3,
        }
      )
    ).toEqual({
      amountCents: 4200,
      ruleApplied: 'standard',
    });
  });
});
