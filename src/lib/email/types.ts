// @ts-nocheck

export type EmailType =
  | "game_reminder"
  | "stat_reminder"
  | "draft_notification"
  | "payment_reminder"
  | "season_invite"
  | "team_invite"
  | "suspension_notification"
  | "dispute_notification"
  | "team_message"
  | "weekly_digest"
  | "custom";

export type EmailRecipientType = "player" | "captain" | "admin" | "all_players" | "all_captains";

export interface EmailRecipient {
  email: string;
  name?: string;
  role?: EmailRecipientType;
}

export interface EmailDraft {
  id?: string;
  type: EmailType;
  subject: string;
  html: string;
  recipients: EmailRecipient[];
  scheduledFor?: Date;
  isAutomated: boolean;
  context?: Record<string, any>;
}

export interface EmailPreview {
  draft: EmailDraft;
  generatedAt: Date;
  canEdit: boolean;
}
