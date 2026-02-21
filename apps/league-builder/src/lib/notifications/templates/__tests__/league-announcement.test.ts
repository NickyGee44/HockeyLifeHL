import { describe, expect, it } from '@jest/globals';
import {
  getLeagueAnnouncementEmail,
  sanitizeAnnouncementContent,
} from '@/lib/notifications/templates/league-announcement';

describe('league announcement template', () => {
  it('renders subject, sender, and formatted content', () => {
    const html = getLeagueAnnouncementEmail({
      recipientName: 'Taylor',
      subject: 'Schedule Update',
      content: '**Important:** New start time\n\nPlease arrive early.',
      priority: 'high',
      senderName: 'Commissioner',
      dashboardUrl: 'https://example.com/dashboard',
      leagueName: 'Metro League',
    });

    expect(html).toContain('Schedule Update');
    expect(html).toContain('Commissioner');
    expect(html).toContain('<strong>Important:</strong>');
    expect(html).toContain('Please arrive early.');
  });

  it('sanitizes dangerous inline content', () => {
    const sanitized = sanitizeAnnouncementContent(
      '<script>alert(1)</script><a href="javascript:alert(1)" onclick="evil()">Click</a>'
    );

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('onclick=');
  });
});

