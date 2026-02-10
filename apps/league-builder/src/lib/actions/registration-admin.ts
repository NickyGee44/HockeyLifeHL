'use server';

/**
 * Registration Admin Server Actions
 *
 * Clean re-exports of admin-facing registration actions from player-registration.ts
 * plus any additional admin-specific actions.
 */

export {
  getPendingRegistrations as getRegistrations,
  approveRegistration,
  rejectRegistration,
  waitlistRegistration,
  bulkUpdateRegistrations as bulkApprove,
  getRegistrationSummary,
  getRegistrationDetails,
} from './player-registration';
