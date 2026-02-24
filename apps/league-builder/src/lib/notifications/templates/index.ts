/**
 * Email Templates Index
 *
 * All email templates using BRAND-KIT gold/black styling
 */

export * from './base';
export * from './game-reminder';
export * from './roster-change';
export * from './schedule-change';
export * from './payment-receipt';
export * from './registration-complete';
export * from './password-reset';
export * from './captain-invite';
export * from './league-announcement';
export * from './registration-submitted';
export * from './registration-approved';
export * from './registration-rejected';
export * from './registration-admin-alert';
export * from './scorekeeper-assignment';
export * from './suspension-issued';
export * from './goalie-request-notification';
export * from './goalie-request-filled-captain';
export * from './goalie-request-filled-goalie';
export * from './goalie-rating-prompt';

export type EmailTemplateType =
  | 'game_reminder'
  | 'roster_change'
  | 'schedule_change'
  | 'payment_receipt'
  | 'registration_complete'
  | 'password_reset'
  | 'captain_invite'
  | 'league_announcement'
  | 'registration_submitted'
  | 'registration_approved'
  | 'registration_rejected'
  | 'registration_admin_alert'
  | 'scorekeeper_assignment'
  | 'suspension_issued'
  | 'goalie_request_notification'
  | 'goalie_request_filled_captain'
  | 'goalie_request_filled_goalie'
  | 'goalie_rating_prompt';
