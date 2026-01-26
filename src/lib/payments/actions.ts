"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { logAuditEvent } from "@/lib/audit/logger";
import { requireLeagueRole, getActiveLeagueId } from "@/lib/auth/league-context";

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover",
  });
}

// Get all payments
export async function getAllPayments(seasonId?: string) {
  try {
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    let query = supabase
      .from("payments")
      .select(`
        *,
        player:profiles!payments_player_id_fkey(id, full_name, email, jersey_number),
        season:seasons!payments_season_id_fkey(id, name),
        entered_by_profile:profiles!payments_entered_by_fkey(id, full_name)
      `)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("payment_date", { ascending: false });

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
      return { error: error.message, payments: [] };
    }

    return { payments: payments || [] };
  } catch (error: any) {
    console.error("Error in getAllPayments:", error);
    return { error: error.message || 'Unauthorized', payments: [] };
  }
}

// Get payments for a specific player
export async function getPlayerPayments(playerId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated', payments: [] };
    }

    // Get league context - players can see their own payments, owners/admins can see all
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    // If not the player themselves and not admin/owner, deny access
    if (user.id !== playerId) {
      const { role } = await requireLeagueRole(['owner', 'admin']);
      if (!role) {
        return { error: 'Unauthorized', payments: [] };
      }
    }

    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        *,
        season:seasons!payments_season_id_fkey(id, name)
      `)
      .eq("player_id", playerId)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching player payments:", error);
      return { error: error.message, payments: [] };
    }

    return { payments: payments || [] };
  } catch (error: any) {
    console.error("Error in getPlayerPayments:", error);
    return { error: error.message || 'Unauthorized', payments: [] };
  }
}

// Create payment (manual entry)
export async function createPayment(formData: FormData) {
  try {
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

  const playerId = formData.get("player_id") as string;
  const seasonId = formData.get("season_id") as string;
  const amountStr = formData.get("amount") as string;
  const paymentMethod = formData.get("payment_method") as string;
  const paymentDate = formData.get("payment_date") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string || "completed";

  // SECURITY: Validate payment amount
  const amount = parseFloat(amountStr);

  if (isNaN(amount)) {
    return { error: "Invalid payment amount - must be a valid number" };
  }

  if (amount <= 0) {
    return { error: "Payment amount must be greater than zero" };
  }

  if (amount > 10000) {
    return { error: "Payment amount cannot exceed $10,000. Please contact admin for larger payments." };
  }

  // Round to 2 decimal places for currency precision
  const validatedAmount = Math.round(amount * 100) / 100;

  // SECURITY: Validate payment method is from allowed list
  const allowedPaymentMethods = ["cash", "etransfer", "credit_card", "debit", "check", "other"];
  if (!allowedPaymentMethods.includes(paymentMethod.toLowerCase())) {
    return { error: "Invalid payment method" };
  }

  if (!playerId || !validatedAmount || !paymentMethod || !paymentDate) {
    return { error: "Player, amount, payment method, and date are required" };
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      league_id: leagueId, // CRITICAL: Associate payment with league
      player_id: playerId,
      season_id: seasonId || null,
      amount: validatedAmount,  // Use validated amount
      payment_method: paymentMethod.toLowerCase() as any,  // Normalize to lowercase
      status: status as any,
      payment_date: paymentDate,
      notes: notes || null,
      entered_by: userId,
    })
    .select()
    .single();

  if (error || !payment) {
    console.error("Error creating payment:", error);
    return { error: error?.message || "Failed to create payment" };
  }

  // AUDIT: Log payment creation
  await logAuditEvent({
    action: "payment_created",
    resourceType: "payment",
    resourceId: payment.id,
    details: {
      league_id: leagueId,
      player_id: playerId,
      amount: validatedAmount,
      payment_method: paymentMethod,
      season_id: seasonId,
    },
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/dashboard/profile`);
  return { success: true, payment };
  } catch (error: any) {
    console.error("Error in createPayment:", error);
    return { error: error.message || 'Unauthorized or failed to create payment' };
  }
}

// Update payment
export async function updatePayment(paymentId: string, formData: FormData) {
  try {
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

  const supabase = await createClient();

  const amountStr = formData.get("amount") as string;
  let validatedAmount: number | undefined = undefined;

  // SECURITY: Validate payment amount if provided
  if (amountStr) {
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      return { error: "Invalid payment amount - must be a valid number" };
    }

    if (amount <= 0) {
      return { error: "Payment amount must be greater than zero" };
    }

    if (amount > 10000) {
      return { error: "Payment amount cannot exceed $10,000" };
    }

    // Round to 2 decimal places for currency precision
    validatedAmount = Math.round(amount * 100) / 100;
  }

  const paymentMethod = formData.get("payment_method") as string;
  const paymentDate = formData.get("payment_date") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string;

  // SECURITY: Validate payment method if provided
  if (paymentMethod) {
    const allowedPaymentMethods = ["cash", "etransfer", "credit_card", "debit", "check", "other"];
    if (!allowedPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return { error: "Invalid payment method" };
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (validatedAmount !== undefined) updateData.amount = validatedAmount;
  if (paymentMethod) updateData.payment_method = paymentMethod.toLowerCase();
  if (paymentDate) updateData.payment_date = paymentDate;
  if (notes !== undefined) updateData.notes = notes;
  if (status) updateData.status = status;

  const { error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", paymentId)
    .eq('league_id', leagueId); // CRITICAL: Only update payments in this league

  if (error) {
    console.error("Error updating payment:", error);
    return { error: error.message };
  }

  // AUDIT: Log payment update
  await logAuditEvent({
    action: "payment_updated",
    resourceType: "payment",
    resourceId: paymentId,
    details: {
      league_id: leagueId,
      amount: validatedAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
    },
  });

  revalidatePath("/admin/payments");
  return { success: true };
  } catch (error: any) {
    console.error("Error in updatePayment:", error);
    return { error: error.message || 'Unauthorized or failed to update payment' };
  }
}

// Delete payment
export async function deletePayment(paymentId: string) {
  try {
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq('league_id', leagueId); // CRITICAL: Only delete payments in this league

    if (error) {
      console.error("Error deleting payment:", error);
      return { error: error.message };
    }

    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deletePayment:", error);
    return { error: error.message || 'Unauthorized or failed to delete payment' };
  }
}

// Create Stripe payment intent
export async function createStripePaymentIntent(
  playerId: string,
  amount: number,
  seasonId?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== playerId) {
      return { error: "Not authorized" };
    }

    // Get league context for the player
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "cad",
      metadata: {
        player_id: playerId,
        season_id: seasonId || "",
        league_id: leagueId, // Include league_id in metadata
      },
    });

    return { success: true, clientSecret: paymentIntent.client_secret };
  } catch (error: any) {
    console.error("Error creating Stripe payment intent:", error);
    return { error: error.message || "Failed to create payment" };
  }
}

// Handle Stripe webhook (to be called from API route)
export async function handleStripeWebhook(event: Stripe.Event) {
  const supabase = await createClient();

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const playerId = paymentIntent.metadata.player_id;
    const seasonId = paymentIntent.metadata.season_id || null;
    const leagueId = paymentIntent.metadata.league_id; // Get league_id from metadata

    if (!playerId || !leagueId) {
      console.error("No player_id or league_id in payment intent metadata");
      return;
    }

    // Create payment record
    const { error } = await supabase
      .from("payments")
      .insert({
        league_id: leagueId, // CRITICAL: Associate payment with league
        player_id: playerId,
        season_id: seasonId,
        amount: paymentIntent.amount / 100, // Convert from cents
        payment_method: "stripe",
        status: "completed",
        payment_date: new Date().toISOString().split("T")[0],
        stripe_payment_intent_id: paymentIntent.id,
        entered_by: playerId, // Self-entered via Stripe
      });

    if (error) {
      console.error("Error creating payment from Stripe webhook:", error);
      throw error;
    }

    revalidatePath("/admin/payments");
    revalidatePath(`/dashboard/profile`);
  }
}

// Get payment summary for a player
export async function getPlayerPaymentSummary(playerId: string, seasonId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get league context
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    // Players can only see their own summary, owners/admins can see all
    if (user.id !== playerId) {
      const { role } = await requireLeagueRole(['owner', 'admin']);
      if (!role) {
        return { error: 'Unauthorized' };
      }
    }

    let query = supabase
      .from("payments")
      .select("amount, status, payment_method")
      .eq("player_id", playerId)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .eq("status", "completed");

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("Error fetching payment summary:", error);
      return { error: error.message };
    }

    const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
    const byMethod = payments?.reduce((acc: Record<string, number>, p) => {
      const method = p.payment_method;
      acc[method] = (acc[method] || 0) + parseFloat(p.amount.toString());
      return acc;
    }, {}) || {};

    return {
      totalPaid,
      paymentCount: payments?.length || 0,
      byMethod,
    };
  } catch (error: any) {
    console.error("Error in getPlayerPaymentSummary:", error);
    return { error: error.message || 'Unauthorized' };
  }
}

// Get team payment status (for captains)
export async function getTeamPaymentStatus(teamId: string, seasonId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", payments: [] };
    }

    // Get league context - captains can view their team's payment status
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    // Verify team exists and belongs to league
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .single();

    if (teamError || !team) {
      console.error("Error fetching team:", teamError);
      return { error: "Team not found or does not belong to your league", payments: [] };
    }

    // Get user's league membership role
    const { data: membership, error: membershipError } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("Error fetching membership:", membershipError);
      return { error: "Failed to verify user permissions", payments: [] };
    }

    // Allow owners, admins, and team captains
    if (membership.role !== "owner" && membership.role !== "admin" && team.captain_id !== user.id) {
      return { error: "Not authorized - must be team captain, admin, or owner", payments: [] };
    }

    // Get all players on this team for this season
    const { data: roster } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("team_id", teamId)
      .eq("season_id", seasonId);

    if (!roster || roster.length === 0) {
      return { payments: [] };
    }

    const playerIds = roster.map(r => r.player_id);

    // Get payments for all team players
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        *,
        player:profiles!payments_player_id_fkey(id, full_name, email, jersey_number)
      `)
      .eq("season_id", seasonId)
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .in("player_id", playerIds)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching team payments:", error);
      return { error: error.message, payments: [] };
    }

    return { payments: payments || [] };
  } catch (error: any) {
    console.error("Error in getTeamPaymentStatus:", error);
    return { error: error.message || 'Unauthorized', payments: [] };
  }
}
