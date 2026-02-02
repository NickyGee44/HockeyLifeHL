/**
 * Supabase Edge Function: Process Scheduled Account Deletions
 *
 * Runs daily (via cron trigger) to:
 * 1. Find accounts past their grace period
 * 2. Execute permanent deletion
 * 3. Delete Stripe customers
 * 4. Send completion emails
 * 5. Retry failed Stripe deletions
 *
 * Cron schedule: 0 2 * * * (2am UTC daily)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

interface DeletionLogEntry {
  id: string;
  user_id: string;
  profile_email: string;
  scheduled_for: string;
  stripe_customer_id: string | null;
  stripe_deleted: boolean;
  stripe_deletion_attempted_at: string | null;
  stripe_deletion_error: string | null;
}

Deno.serve(async (req) => {
  // Verify authorization (cron secret or service role token)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('X-Cron-Secret');

  if (!authHeader && cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    stripe_retries: 0,
    errors: [] as Array<{ user_id: string; error: string }>,
  };

  try {
    // 1. Find accounts scheduled for deletion (grace period expired)
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from('account_deletion_log')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process max 50 per run to avoid timeout

    if (fetchError) {
      throw new Error(`Failed to fetch pending deletions: ${fetchError.message}`);
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log('No pending deletions found');
      return new Response(JSON.stringify({ message: 'No pending deletions', results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingDeletions.length} accounts to delete`);

    // 2. Process each deletion
    for (const deletion of pendingDeletions as DeletionLogEntry[]) {
      results.processed++;

      try {
        // 2a. Update status to 'processing'
        await supabase
          .from('account_deletion_log')
          .update({ status: 'processing' })
          .eq('id', deletion.id);

        // 2b. Execute database deletion (calls Postgres function)
        const { data: deletionResult, error: deleteError } = await supabase.rpc('execute_account_deletion', {
          p_user_id: deletion.user_id,
        });

        if (deleteError) {
          throw new Error(`Database deletion failed: ${deleteError.message}`);
        }

        console.log(`Account deleted in database:`, deletionResult);

        // 2c. Delete Stripe customer (if exists)
        if (deletion.stripe_customer_id && !deletion.stripe_deleted) {
          try {
            await stripe.customers.del(deletion.stripe_customer_id);
            console.log(`Stripe customer deleted: ${deletion.stripe_customer_id}`);

            // Mark Stripe deletion as successful
            await supabase
              .from('account_deletion_log')
              .update({
                stripe_deleted: true,
                stripe_deletion_attempted_at: new Date().toISOString(),
                stripe_deletion_error: null,
              })
              .eq('id', deletion.id);
          } catch (stripeError: unknown) {
            const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
            console.error(`Stripe deletion failed for ${deletion.stripe_customer_id}:`, errorMessage);

            // Log Stripe error but don't fail the whole deletion
            await supabase
              .from('account_deletion_log')
              .update({
                stripe_deletion_attempted_at: new Date().toISOString(),
                stripe_deletion_error: errorMessage,
              })
              .eq('id', deletion.id);
          }
        }

        // 2d. Send completion email
        await sendDeletionCompletionEmail(deletion.profile_email);

        // Mark email as sent
        await supabase
          .from('account_deletion_log')
          .update({ completion_notification_sent: true })
          .eq('id', deletion.id);

        results.succeeded++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to delete account ${deletion.user_id}:`, errorMessage);

        results.failed++;
        results.errors.push({
          user_id: deletion.user_id,
          error: errorMessage,
        });

        // Status already set to 'failed' by execute_account_deletion function
      }
    }

    // 3. Retry failed Stripe deletions (from previous runs)
    const { data: failedStripeDeletions } = await supabase
      .from('account_deletion_log')
      .select('*')
      .eq('status', 'completed')
      .eq('stripe_deleted', false)
      .not('stripe_customer_id', 'is', null)
      .not('stripe_deletion_attempted_at', 'is', null)
      .limit(10);

    if (failedStripeDeletions && failedStripeDeletions.length > 0) {
      console.log(`Retrying ${failedStripeDeletions.length} failed Stripe deletions`);

      for (const deletion of failedStripeDeletions as DeletionLogEntry[]) {
        // Only retry if less than 7 days old
        const attemptedAt = new Date(deletion.stripe_deletion_attempted_at!);
        const daysSinceAttempt = (Date.now() - attemptedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceAttempt > 7) {
          console.log(`Skipping Stripe deletion retry for ${deletion.stripe_customer_id} (too old)`);
          continue;
        }

        try {
          await stripe.customers.del(deletion.stripe_customer_id!);
          console.log(`Stripe customer deleted on retry: ${deletion.stripe_customer_id}`);

          await supabase
            .from('account_deletion_log')
            .update({
              stripe_deleted: true,
              stripe_deletion_attempted_at: new Date().toISOString(),
              stripe_deletion_error: null,
            })
            .eq('id', deletion.id);

          results.stripe_retries++;
        } catch (stripeError: unknown) {
          const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
          console.error(`Stripe retry failed for ${deletion.stripe_customer_id}:`, errorMessage);
        }
      }
    }

    // 4. Send 7-day reminder emails (7 days before scheduled deletion)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7);

    const { data: upcomingDeletions } = await supabase
      .from('account_deletion_log')
      .select('*')
      .eq('status', 'pending')
      .eq('reminder_7day_sent', false)
      .gte('scheduled_for', new Date().toISOString())
      .lte('scheduled_for', reminderDate.toISOString());

    if (upcomingDeletions && upcomingDeletions.length > 0) {
      console.log(`Sending ${upcomingDeletions.length} reminder emails`);

      for (const deletion of upcomingDeletions as DeletionLogEntry[]) {
        try {
          await sendDeletionReminderEmail(deletion.profile_email, deletion.scheduled_for);

          await supabase
            .from('account_deletion_log')
            .update({ reminder_7day_sent: true })
            .eq('id', deletion.id);
        } catch (emailError: unknown) {
          console.error(`Failed to send reminder email:`, emailError);
        }
      }
    }

    console.log('Deletion processing complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Account deletions processed',
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fatal error in deletion processor:', errorMessage);

    return new Response(
      JSON.stringify({
        error: 'Failed to process deletions',
        details: errorMessage,
        results,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Send deletion completion email via Resend
 */
async function sendDeletionCompletionEmail(email: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'HockeyLife <noreply@hockeylife.com>',
      to: email,
      subject: 'Your account has been deleted',
      html: `
        <h2>Account Deletion Complete</h2>
        <p>Your account has been permanently deleted as requested.</p>
        <p>All your personal data has been removed from our systems in compliance with GDPR Article 17.</p>
        <p>If you did not request this deletion or believe this was done in error, please contact support immediately.</p>
        <p>Thank you for using HockeyLife.</p>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send completion email: ${error}`);
  }
}

/**
 * Send 7-day reminder email
 */
async function sendDeletionReminderEmail(email: string, scheduledFor: string): Promise<void> {
  const deletionDate = new Date(scheduledFor).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'HockeyLife <noreply@hockeylife.com>',
      to: email,
      subject: 'Reminder: Your account will be deleted in 7 days',
      html: `
        <h2>Account Deletion Reminder</h2>
        <p>This is a reminder that your account is scheduled for permanent deletion on <strong>${deletionDate}</strong>.</p>
        <p>You have <strong>7 days</strong> remaining to cancel this request if you change your mind.</p>
        <p>To cancel, log in to your account and visit your account settings.</p>
        <p>If you take no action, your account and all data will be permanently deleted.</p>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send reminder email: ${error}`);
  }
}
