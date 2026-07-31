import { getGameAdminActionAvailability } from '../game-admin-actions';

describe('getGameAdminActionAvailability', () => {
  it.each([
    ['scheduled', true, false],
    ['in_progress', true, false],
    ['pending_verification', true, false],
    ['completed', false, true],
    ['cancelled', false, false],
    ['postponed', false, false],
  ] as const)('returns game admin actions for %s games', (status, canCompleteGame, canGenerateGameRecap) => {
    expect(getGameAdminActionAvailability(status)).toEqual({
      canCompleteGame,
      canGenerateGameRecap,
    });
  });
});
