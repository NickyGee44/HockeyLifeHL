/**
 * API Route: Send Account Deletion Cancellation Email
 *
 * Called when user cancels their deletion request
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'HockeyLife <noreply@hockeylife.com>',
      to: email,
      subject: 'Account Deletion Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Account Deletion Cancelled</h2>

          <p>Good news! Your account deletion request has been successfully cancelled.</p>

          <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <strong>Your account is safe and will not be deleted.</strong>
          </div>

          <p>You can continue using your HockeyLife account as normal.</p>

          <h3>What's next?</h3>
          <ul>
            <li>All your data remains intact</li>
            <li>You can access all features immediately</li>
            <li>No further action is required</li>
          </ul>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>If you did not cancel this deletion request, please contact support immediately.</p>
            <p>This is an automated message from HockeyLife. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send cancellation notification:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Error in cancellation notification route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
