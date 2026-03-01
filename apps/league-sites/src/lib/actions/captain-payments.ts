'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface CaptainPaymentPlayer {
  id: string;
  playerName: string;
  email: string | null;
  avatarUrl: string | null;
  amountOwedCents: number;
  amountPaidCents: number;
  status: string; // 'no_fee' when player has no payment record
  paymentPlan: string | null;
  lastReminderSentAt: string | null;
  reminderSentCount: number;
  paymentId: string | null; // null for players with no payment record
  nextPaymentDate: string | null;
}

export interface CaptainPaymentSummary {
  totalPlayers: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  totalExpectedCents: number;
  totalCollectedCents: number;
}

// ============================================================================
// Helper: Verify Captain Access
// ============================================================================

async function verifyCaptainRole(
  teamId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  // .limit(1) avoids .single() throwing PGRST116 when captain has entries
  // across multiple seasons for the same team.
  const { data: membership } = await supabase
    .from('team_rosters')
    .select('leadership_role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .in('leadership_role', ['captain', 'alternate_captain'])
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { authorized: false, error: 'Not authorized' };
  }

  return { authorized: true, userId: user.id };
}

// ============================================================================
// 1. Get Captain Team Payments
// ============================================================================

export async function getCaptainTeamPayments(
  teamId: string,
  seasonId: string
): Promise<{ success: boolean; data?: CaptainPaymentPlayer[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  // Use service role so RLS doesn't block reading teammates' team_rosters
  // entries or their profiles (auth client restricts both to auth.uid() only).
  const supabase = createServiceRoleClient();

  // Step 1: Fetch active roster members for the current season.
  const { data: rosterData, error: rosterError } = await supabase
    .from('team_rosters')
    .select(
      `
      player_id,
      jersey_number,
      position,
      profile:profiles!team_rosters_player_id_fkey(id, full_name, email, avatar_url)
    `
    )
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('status', 'active')
    .is('end_date', null);

  if (rosterError) {
    console.error('[CaptainPayments] roster fetch error:', rosterError.message);
    return { success: false, error: 'Failed to fetch team roster.' };
  }

  const playerIds = (rosterData || []).map((r: any) => r.player_id as string);

  // Step 2: Fetch payment records for those players (may be empty)
  const paymentsMap = new Map<string, any>();
  if (playerIds.length > 0) {
    const { data: payments } = await supabase
      .from('player_payments')
      .select(
        `
        id,
        player_id,
        status,
        payment_plan,
        total_amount_cents,
        amount_paid_cents,
        last_reminder_sent_at,
        reminder_sent_count,
        next_payment_date
      `
      )
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .in('player_id', playerIds);

    for (const p of payments || []) {
      paymentsMap.set(p.player_id, p);
    }
  }

  // Step 3: Merge — every roster player appears, payment data is null if missing
  const result: CaptainPaymentPlayer[] = (rosterData || []).map((r: any) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] : (r.profile as any);
    const payment = paymentsMap.get(r.player_id);
    return {
      id: profile?.id || r.player_id,
      playerName: profile?.full_name || 'Unknown',
      email: profile?.email || null,
      avatarUrl: profile?.avatar_url || null,
      amountOwedCents: payment?.total_amount_cents ?? 0,
      amountPaidCents: payment?.amount_paid_cents ?? 0,
      status: payment?.status ?? 'no_fee',
      paymentPlan: payment?.payment_plan ?? null,
      lastReminderSentAt: payment?.last_reminder_sent_at ?? null,
      reminderSentCount: payment?.reminder_sent_count ?? 0,
      paymentId: payment?.id ?? null,
      nextPaymentDate: payment?.next_payment_date ?? null,
    };
  });

  return { success: true, data: result };
}

// ============================================================================
// 2. Send Captain Payment Reminder
// ============================================================================

export async function sendCaptainPaymentReminder(
  teamId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // Fetch the payment and verify it belongs to this team
  const { data: payment, error: fetchError } = await supabase
    .from('player_payments')
    .select(
      `
      id,
      team_id,
      league_id,
      status,
      total_amount_cents,
      amount_paid_cents,
      reminder_sent_count,
      next_payment_date,
      player:player_id (
        id,
        full_name,
        email
      ),
      season_fee:season_fee_id (
        name
      ),
      leagues:league_id (
        name
      )
    `
    )
    .eq('id', paymentId)
    .single();

  if (fetchError || !payment) {
    return { success: false, error: 'Payment not found.' };
  }

  if (payment.team_id !== teamId) {
    return { success: false, error: 'Payment does not belong to this team.' };
  }

  // Don't send reminders for completed payments
  if (['paid', 'cancelled', 'refunded'].includes(payment.status)) {
    return { success: false, error: 'This payment does not need a reminder.' };
  }

  const player = payment.player as any;
  const seasonFee = payment.season_fee as any;
  const league = payment.leagues as any;

  if (!player?.email) {
    return { success: false, error: 'Player email not found.' };
  }

  // Send the reminder email using Resend (same pattern as league-builder)
  const { Resend } = await import('resend');
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@beerleaguehockey.ca';
  const amountDue = (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0);
  const reminderNumber = (payment.reminder_sent_count || 0) + 1;
  const isUrgent = reminderNumber >= 3;

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const paymentUrl = `${SITE_URL}/dashboard/payments?payment=${paymentId}`;

  const subject = `${isUrgent ? '[Urgent] ' : ''}Payment Reminder - ${seasonFee?.name || 'Season Fee'}`;
  const html = buildReminderEmailHtml({
    playerName: player.full_name || 'Player',
    leagueName: league?.name || 'Your League',
    feeName: seasonFee?.name || 'Season Fee',
    amountDue,
    dueDate: payment.next_payment_date,
    paymentUrl,
    reminderNumber,
    isUrgent,
  });

  if (resend) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: player.email,
        subject,
        html,
      });
    } catch (emailError) {
      console.error('[CaptainPayments] Email send error:', emailError);
      return { success: false, error: 'Failed to send reminder email.' };
    }
  } else {
    console.info('[CaptainPayments] Would send reminder email:', {
      to: player.email,
      subject,
    });
  }

  // Update reminder count using service role to bypass RLS
  const serviceSupabase = createServiceRoleClient();
  await serviceSupabase
    .from('player_payments')
    .update({
      reminder_sent_count: reminderNumber,
      last_reminder_sent_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  return { success: true };
}

// ============================================================================
// 3. Get Captain Payment Summary
// ============================================================================

export async function getCaptainPaymentSummary(
  teamId: string,
  seasonId: string
): Promise<{ success: boolean; data?: CaptainPaymentSummary; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = createServiceRoleClient();

  // Count active roster members for the current season
  const { count: rosterCount } = await supabase
    .from('team_rosters')
    .select('player_id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('status', 'active')
    .is('end_date', null);

  const { data: payments, error } = await supabase
    .from('player_payments')
    .select('status, total_amount_cents, amount_paid_cents')
    .eq('team_id', teamId)
    .eq('season_id', seasonId);

  if (error) {
    console.error('[CaptainPayments] getCaptainPaymentSummary error:', error.message);
    return { success: false, error: 'Failed to get payment summary.' };
  }

  const summary: CaptainPaymentSummary = {
    totalPlayers: rosterCount ?? 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalExpectedCents: 0,
    totalCollectedCents: 0,
  };

  for (const p of payments || []) {
    summary.totalExpectedCents += p.total_amount_cents ?? 0;
    summary.totalCollectedCents += p.amount_paid_cents ?? 0;

    switch (p.status) {
      case 'paid':
        summary.paidCount++;
        break;
      case 'overdue':
        summary.overdueCount++;
        break;
      case 'pending':
      case 'processing':
      case 'partially_paid':
        summary.pendingCount++;
        break;
    }
  }

  return { success: true, data: summary };
}

// ============================================================================
// Email Template Helper
// ============================================================================

function buildReminderEmailHtml(params: {
  playerName: string;
  leagueName: string;
  feeName: string;
  amountDue: number;
  dueDate: string | null;
  paymentUrl: string;
  reminderNumber: number;
  isUrgent: boolean;
}): string {
  const { playerName, leagueName, feeName, amountDue, dueDate, paymentUrl, reminderNumber, isUrgent } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #a3a3a3; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #070A0F; }
    .container { background-color: #0f172a; border-radius: 8px; padding: 40px; border: 1px solid rgba(255,255,255,0.10); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1e293b; }
    .logo { font-size: 24px; font-weight: bold; color: #fafafa; }
    h1 { color: #fafafa; }
    .payment-details { background-color: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment-details table { width: 100%; border-collapse: collapse; }
    .payment-details td { padding: 8px 0; }
    .label { color: #a3a3a3; }
    .value { text-align: right; font-weight: bold; color: #fafafa; }
    .amount-due { font-size: 24px; color: #22D3EE; }
    .highlight { background-color: rgba(34,211,238,0.1); padding: 15px; border-left: 4px solid #22D3EE; margin: 20px 0; }
    .warning { background-color: rgba(251,113,133,0.1); padding: 15px; border-left: 4px solid #FB7185; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(to right, #22D3EE, #3B82F6); color: #070A0F; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #404040; }
    .footer a { color: #22D3EE; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">Beer League Hockey</div></div>
    <div>
      <h1>Payment Reminder${isUrgent ? ' - Action Required' : ''}</h1>
      <p>Hi ${playerName},</p>
      <p>This is a friendly reminder that you have an outstanding payment for <strong>${leagueName}</strong>.</p>
      <div class="payment-details">
        <table>
          <tr><td class="label">Fee</td><td class="value">${feeName}</td></tr>
          <tr><td class="label">Amount Due</td><td class="value amount-due">$${(amountDue / 100).toFixed(2)}</td></tr>
          ${dueDate ? `<tr><td class="label">Due Date</td><td class="value">${new Date(dueDate).toLocaleDateString()}</td></tr>` : ''}
        </table>
      </div>
      ${
        isUrgent
          ? `<div class="warning"><p><strong>Important:</strong> This is reminder #${reminderNumber}. Please complete your payment as soon as possible.</p></div>`
          : `<div class="highlight"><p>Please complete your payment at your earliest convenience.</p></div>`
      }
      <a href="${paymentUrl}" class="button">Pay Now</a>
      <p>If you've already made this payment, please disregard this reminder.</p>
      <p>Best regards,<br>The ${leagueName} Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Beer League Hockey. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();
}
