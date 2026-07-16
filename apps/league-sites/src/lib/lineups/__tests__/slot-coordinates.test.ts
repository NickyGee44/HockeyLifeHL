import { describe, expect, it } from '@jest/globals';

import { getLineupSlotCoordinate } from '../slot-coordinates';

describe('lineup slot coordinates', () => {
  it('returns the exact clicked forward slot coordinate instead of the next compacted slot', () => {
    expect(getLineupSlotCoordinate('forward', 2, false)).toEqual({ x: 72, y: 22 });
    expect(getLineupSlotCoordinate('forward', 4, false)).toEqual({ x: 50, y: 38 });
  });

  it('returns the exact clicked defence slot coordinate', () => {
    expect(getLineupSlotCoordinate('defence', 1, false)).toEqual({ x: 65, y: 58 });
    expect(getLineupSlotCoordinate('defence', 3, false)).toEqual({ x: 65, y: 72 });
  });

  it('clamps out-of-range clicks to the last configured slot', () => {
    expect(getLineupSlotCoordinate('forward', 99, false)).toEqual({ x: 72, y: 38 });
    expect(getLineupSlotCoordinate('defence', 99, false)).toEqual({ x: 65, y: 72 });
    expect(getLineupSlotCoordinate('goalie', 99, false)).toEqual({ x: 50, y: 90 });
  });
});
