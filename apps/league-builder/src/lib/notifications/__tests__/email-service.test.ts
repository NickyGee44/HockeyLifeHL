import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockResendSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}));

describe('email service', () => {
  beforeEach(() => {
    jest.resetModules();
    mockResendSend.mockReset();
    process.env.RESEND_API_KEY = 're_test_api_key';
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com';
  });

  it('sends via Resend API when configured', async () => {
    mockResendSend.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    });

    const { sendEmail } = await import('@/lib/notifications/email-service');

    const result = await sendEmail({
      to: 'player@example.com',
      subject: 'Game Update',
      html: '<p>Your game starts at 9 PM.</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('email_123');
    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: ['player@example.com'],
      subject: 'Game Update',
      html: '<p>Your game starts at 9 PM.</p>',
      replyTo: undefined,
      tags: undefined,
    });
  });
});

