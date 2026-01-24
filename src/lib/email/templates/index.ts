// @ts-nocheck

import { getBaseEmailTemplate } from "./base";
import type { EmailType } from "../types";

export interface EmailTemplateContext {
  recipientName?: string;
  gameDetails?: {
    date: string;
    time: string;
    opponent: string;
    location?: string;
  };
  seasonName?: string;
  teamName?: string;
  customContext?: string;
  draftLink?: string;
  optInLink?: string;
  statsLink?: string;
  paymentLink?: string;
}

/**
 * Get pre-populated email template for a given type
 */
export function getEmailTemplate(
  type: EmailType,
  context: EmailTemplateContext = {}
): { subject: string; html: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  switch (type) {
    case "game_reminder":
      return getGameReminderTemplate(context, siteUrl);

    case "stat_reminder":
      return getStatReminderTemplate(context, siteUrl);

    case "draft_notification":
      return getDraftNotificationTemplate(context, siteUrl);

    case "payment_reminder":
      return getPaymentReminderTemplate(context, siteUrl);

    case "season_invite":
      return getSeasonInviteTemplate(context, siteUrl);

    case "team_invite":
      return getTeamInviteTemplate(context, siteUrl);

    case "suspension_notification":
      return getSuspensionNotificationTemplate(context, siteUrl);

    case "dispute_notification":
      return getDisputeNotificationTemplate(context, siteUrl);

    case "team_message":
      return getTeamMessageTemplate(context, siteUrl);

    case "weekly_digest":
      return getWeeklyDigestTemplate(context, siteUrl);

    case "custom":
    default:
      return getCustomTemplate(context, siteUrl);
  }
}

function getGameReminderTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, gameDetails } = context;
  const greeting = recipientName ? `Hey ${recipientName},` : "Hey there,";

  const gameInfo = gameDetails
    ? `
      <div class="info-box">
        <h3>📅 Game Details</h3>
        <ul>
          <li><strong>Date:</strong> ${gameDetails.date}</li>
          <li><strong>Time:</strong> ${gameDetails.time}</li>
          <li><strong>Opponent:</strong> ${gameDetails.opponent}</li>
          ${gameDetails.location ? `<li><strong>Location:</strong> ${gameDetails.location}</li>` : ""}
        </ul>
      </div>
    `
    : "";

  const content = `
    <p>${greeting}</p>
    <p>Just a friendly reminder that you have a game coming up!</p>
    ${gameInfo}
    <p>Make sure to check in and confirm your availability. See you on the ice! 🏒</p>
  `;

  return {
    subject: "🏒 Game Reminder - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Game Reminder",
      content,
      buttonText: "Check In for Game",
      buttonUrl: `${siteUrl}/dashboard`,
    }),
  };
}

function getStatReminderTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, gameDetails } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello Captain,";

  const gameInfo = gameDetails
    ? `
      <p><strong>Game:</strong> ${gameDetails.opponent} on ${gameDetails.date}</p>
    `
    : "";

  const content = `
    <p>${greeting}</p>
    <p>This is a reminder to enter or verify stats for a recent game.</p>
    ${gameInfo}
    <p>Please log in and complete the stat entry as soon as possible. Both captains need to verify stats for the game to be official.</p>
  `;

  return {
    subject: "📊 Stats Entry Reminder - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Stats Entry Reminder",
      content,
      buttonText: "Enter Stats",
      buttonUrl: context.statsLink || `${siteUrl}/captain/stats`,
    }),
  };
}

function getDraftNotificationTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, seasonName, draftLink } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello Captain,";

  const draftUrl = draftLink
    ? `${siteUrl}/captain/draft?draft=${draftLink}`
    : `${siteUrl}/captain/draft`;

  const content = `
    <p>${greeting}</p>
    <p>The draft for <strong>${seasonName || "the new season"}</strong> has officially started! It's time to build your team and compete for glory.</p>
    
    <div class="info-box">
      <h3>📋 Draft Rules & Guidelines</h3>
      <ul>
        <li><strong>Draft Order:</strong> Teams pick in snake draft format (Round 1: 1-6, Round 2: 6-1, etc.)</li>
        <li><strong>Pick Time:</strong> You'll be notified when it's your turn to pick</li>
        <li><strong>Player Grades:</strong> Players are rated A+ through D- based on attendance, performance, and stats</li>
        <li><strong>Strategy:</strong> Build a balanced team considering player grades, positions, and team chemistry</li>
      </ul>
    </div>

    <p><strong>Ready to make your picks?</strong> Click the button below to access the draft board.</p>
  `;

  return {
    subject: `🏒 Draft Has Begun - ${seasonName || "HockeyLifeHL"}`,
    html: getBaseEmailTemplate({
      title: "Draft Time!",
      content,
      buttonText: "Go to Draft Board",
      buttonUrl: draftUrl,
    }),
  };
}

function getPaymentReminderTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, seasonName } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const content = `
    <p>${greeting}</p>
    <p>This is a friendly reminder about your payment for <strong>${seasonName || "the current season"}</strong>.</p>
    <p>Please complete your payment as soon as possible to ensure your spot in the league.</p>
    <p>If you've already paid, you can ignore this message. Thank you for your prompt attention to this matter.</p>
  `;

  return {
    subject: "💳 Payment Reminder - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Payment Reminder",
      content,
      buttonText: "View Payment Status",
      buttonUrl: context.paymentLink || `${siteUrl}/dashboard/payments`,
    }),
  };
}

function getSeasonInviteTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, seasonName } = context;
  const greeting = recipientName ? `Hey ${recipientName},` : "Hey there,";

  const optInUrl = context.optInLink || `${siteUrl}/dashboard`;

  const content = `
    <p>${greeting}</p>
    <p>A new season of <strong>HockeyLifeHL</strong> is starting and we want YOU back on the ice!</p>
    
    <div class="info-box">
      <h3>📅 Season Details</h3>
      <ul>
        <li><strong>Season:</strong> ${seasonName || "New Season"}</li>
        <li><strong>Status:</strong> Now accepting opt-ins</li>
      </ul>
    </div>

    <p><strong>Ready to play?</strong> Click the button below to opt in for this season.</p>
    <p style="font-size: 14px; color: #666;">
      <strong>Note:</strong> You can choose to opt in as a full-time player (eligible for the draft) 
      or as a call-up (available as a substitute when needed).
    </p>
  `;

  return {
    subject: `🏒 New Season Starting: ${seasonName || "HockeyLifeHL"}`,
    html: getBaseEmailTemplate({
      title: "New Season Starting!",
      content,
      buttonText: "Opt In for Season",
      buttonUrl: optInUrl,
    }),
  };
}

function getTeamInviteTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, teamName, seasonName } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const content = `
    <p>${greeting}</p>
    <p>You've been invited to join <strong>${teamName || "a team"}</strong> for ${seasonName || "the current season"}!</p>
    <p>We'd love to have you on the team. Click the button below to accept the invitation and join the roster.</p>
  `;

  return {
    subject: `🏒 Team Invitation - ${teamName || "HockeyLifeHL"}`,
    html: getBaseEmailTemplate({
      title: "Team Invitation",
      content,
      buttonText: "View Invitation",
      buttonUrl: `${siteUrl}/dashboard`,
    }),
  };
}

function getSuspensionNotificationTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, customContext } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const content = `
    <p>${greeting}</p>
    <p>This email is to inform you about a suspension that has been issued.</p>
    ${customContext ? `<div class="info-box"><p>${customContext}</p></div>` : ""}
    <p>If you have any questions or concerns, please contact the league administrator.</p>
  `;

  return {
    subject: "⚠️ Suspension Notice - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Suspension Notice",
      content,
    }),
  };
}

function getDisputeNotificationTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, gameDetails } = context;
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const content = `
    <p>${greeting}</p>
    <p>A stats dispute has been created for a game and requires your attention.</p>
    ${gameDetails ? `<p><strong>Game:</strong> ${gameDetails.opponent} on ${gameDetails.date}</p>` : ""}
    <p>Please review the dispute and work with the other captain to resolve it. If needed, the league administrator can assist.</p>
  `;

  return {
    subject: "⚠️ Stats Dispute - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Stats Dispute",
      content,
      buttonText: "View Dispute",
      buttonUrl: `${siteUrl}/captain/stats`,
    }),
  };
}

function getTeamMessageTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { recipientName, teamName, customContext } = context;
  const greeting = recipientName ? `Hey ${recipientName},` : "Hey team,";

  const content = `
    <p>${greeting}</p>
    ${customContext ? `<div class="info-box"><p>${customContext}</p></div>` : ""}
    <p>If you have any questions, please reach out to your team captain.</p>
  `;

  return {
    subject: `📢 Team Message - ${teamName || "HockeyLifeHL"}`,
    html: getBaseEmailTemplate({
      title: "Team Message",
      content,
    }),
  };
}

function getWeeklyDigestTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { seasonName, customContext } = context;

  const content = `
    <p>Hey there!</p>
    <p>Here's your weekly summary for <strong>${seasonName || "HockeyLifeHL"}</strong>:</p>
    ${customContext ? `<div class="info-box">${customContext}</div>` : "<p>Check out the latest standings, top performers, and upcoming games.</p>"}
    <p>Keep up the great work and see you on the ice!</p>
  `;

  return {
    subject: "📊 Weekly Digest - HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "Weekly Digest",
      content,
      buttonText: "View Full Stats",
      buttonUrl: `${siteUrl}/stats`,
    }),
  };
}

function getCustomTemplate(context: EmailTemplateContext, siteUrl: string) {
  const { customContext } = context;

  const content = customContext || `
    <p>Hello,</p>
    <p>This is a custom email message. Edit the content as needed.</p>
  `;

  return {
    subject: "📧 Message from HockeyLifeHL",
    html: getBaseEmailTemplate({
      title: "League Message",
      content,
    }),
  };
}
