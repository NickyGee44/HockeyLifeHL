/**
 * API Route: Send Account Deletion Notification Email
 *
 * Called when user requests account deletion
 * Sends initial notification with grace period details
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, scheduledFor, reason } = body;

    if (!email || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const deletionDate = new Date(scheduledFor).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const { data, error } = await resend.emails.send({
      from: 'HockeyLife <noreply@hockeylife.com>',
      to: email,
      subject: 'Account Deletion Request Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E31837;">Account Deletion Request</h2>

          <p>We've received your request to delete your HockeyLife account.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #E31837; margin: 20px 0;">
            <strong>Your account is scheduled for deletion on:</strong><br>
            <span style="font-size: 18px; color: #E31837;">${deletionDate}</span>
          </div>

          <h3>What happens next?</h3>
          <ul>
            <li>You have <strong>30 days</strong> to cancel this request</li>
            <li>During this grace period, you can still access your account</li>
            <li>After ${deletionDate}, your account and all data will be permanently deleted</li>
            <li>We'll send you a reminder 7 days before the deletion date</li>
          </ul>

          <h3>What will be deleted?</h3>
          <ul>
            <li>Your profile and personal information</li>
            <li>League memberships and team rosters</li>
            <li>Player statistics and game history</li>
            <li>All user settings and preferences</li>
          </ul>

          <h3>What will be retained?</h3>
          <p>For legal and security compliance, we will retain:</p>
          <ul>
            <li>Anonymized audit logs (no personal information)</li>
            <li>Payment records (required for 7-year tax retention, anonymized)</li>
          </ul>

          ${
            reason
              ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Reason for deletion:</strong><br>
            ${reason}
          </div>
          `
              : ''
          }

          <div style="margin-top: 30px; padding: 20px; background-color: #e7f3ff; border-radius: 5px;">
            <h3 style="margin-top: 0;">Changed your mind?</h3>
            <p>You can cancel this deletion request at any time before ${deletionDate}.</p>
            <p>Simply log in to your account and visit your account settings to cancel.</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>If you did not request this deletion, please contact support immediately.</p>
            <p>This is an automated message from HockeyLife. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send deletion notification:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Error in deletion notification route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
