import { describe, expect, it } from '@jest/globals';
import { getDraftOrderByRound, getDraftRoundOrder } from '@/lib/draft/order';

describe('draft round ordering', () => {
  const teams = ['team-a', 'team-b', 'team-c', 'team-d'];

  it('keeps a linear order for every round', () => {
    expect(getDraftRoundOrder(teams, 1, 'linear')).toEqual(teams);
    expect(getDraftRoundOrder(teams, 2, 'linear')).toEqual(teams);
  });

  it('reverses order on even rounds for snake drafts', () => {
    expect(getDraftRoundOrder(teams, 1, 'snake')).toEqual(teams);
    expect(getDraftRoundOrder(teams, 2, 'snake')).toEqual([...teams].reverse());
    expect(getDraftRoundOrder(teams, 3, 'snake')).toEqual(teams);
  });

  it('builds full round-by-round order for a snake draft', () => {
    expect(getDraftOrderByRound(teams, 4, 'snake')).toEqual([
      teams,
      [...teams].reverse(),
      teams,
      [...teams].reverse(),
    ]);
  });
});

