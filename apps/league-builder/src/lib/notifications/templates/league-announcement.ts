/**
 * League Announcement Email Template
 *
 * Custom message from league owner/admin to all members
 */

import { getBaseEmailTemplate, createBadge } from './base';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface LeagueAnnouncementEmailProps {
  recipientName: string;
  subject: string;
  content: string;
  priority: AnnouncementPriority;
  senderName: string;
  senderRole?: string;
  actionButtonText?: string;
  actionButtonUrl?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getLeagueAnnouncementEmail(props: LeagueAnnouncementEmailProps): string {
  const {
    recipientName,
    subject,
    content: announcementContent,
    priority,
    senderName,
    senderRole = 'League Administrator',
    actionButtonText,
    actionButtonUrl,
    attachmentName,
    attachmentUrl,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'HockeyLifeHL',
  } = props;

  const priorityBadge = {
    low: '',
    normal: '',
    high: createBadge('Important', 'warning'),
    urgent: createBadge('Urgent', 'error'),
  }[priority];

  // Convert markdown-style formatting to HTML
  const formattedContent = announcementContent
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const emailContent = `
    <p>Hi ${recipientName},</p>

    ${priorityBadge}

    <div style="
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border-left: 4px solid ${priority === 'urgent' ? '#ef4444' : priority === 'high' ? '#eab308' : '#D4AF37'};
    ">
      <p style="color: #fafafa; margin: 0;">
        ${formattedContent}
      </p>
    </div>

    ${attachmentName && attachmentUrl ? `
    <div style="
      background: rgba(212, 175, 55, 0.1);
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      display: flex;
      align-items: center;
    ">
      <span style="font-size: 24px; margin-right: 12px;">📎</span>
      <div>
        <p style="margin: 0; color: #fafafa; font-weight: 500;">Attachment</p>
        <a href="${attachmentUrl}" style="color: #D4AF37; text-decoration: none; font-size: 14px;">
          ${attachmentName} &rarr;
        </a>
      </div>
    </div>
    ` : ''}

    <div style="
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(212, 175, 55, 0.2);
    ">
      <p style="color: #737373; font-size: 14px; margin: 0;">
        Sent by <strong style="color: #a3a3a3;">${senderName}</strong>
        <br>
        <span style="font-size: 12px;">${senderRole}</span>
      </p>
    </div>
  `;

  return getBaseEmailTemplate({
    title: subject,
    preheader: `${priority === 'urgent' ? '[URGENT] ' : priority === 'high' ? '[Important] ' : ''}${subject}`,
    content: emailContent,
    buttonText: actionButtonText || 'View in Dashboard',
    buttonUrl: actionButtonUrl || dashboardUrl,
    footerNote: 'This announcement was sent to all league members.',
    unsubscribeUrl,
    leagueName,
  });
}

/**
 * Helper to sanitize user-provided content for email
 */
export function sanitizeAnnouncementContent(content: string): string {
  return content
    // Remove potential script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove onclick and similar event handlers
    .replace(/\bon\w+\s*=/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Escape HTML entities (but preserve allowed markdown)
    .replace(/&(?!(amp|lt|gt|quot|#39);)/g, '&amp;')
    .replace(/<(?!\/?(?:strong|em|br)\b)/gi, '&lt;')
    .replace(/(?<!<\/?(?:strong|em|br))>/gi, '&gt;');
}
