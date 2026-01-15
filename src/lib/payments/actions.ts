// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover",
  });
}

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isOwner: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Not authorized - owner access required", isOwner: false };
  }

  return { isOwner: true, userId: user.id };
}

// Get all payments
export async function getAllPayments(seasonId?: string) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error, payments: [] };

  const supabase = await createClient();
  
  let query = supabase
    .from("payments")
    .select(`
      *,
      player:profiles!payments_player_id_fkey(id, full_name, email, jersey_number),
      season:seasons!payments_season_id_fkey(id, name),
      entered_by_profile:profiles!payments_entered_by_fkey(id, full_name)
    `)
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
}

// Get payments for a specific player
export async function getPlayerPayments(playerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Players can only see their own payments, owners can see all
  if (user?.id !== playerId) {
    const auth = await requireOwner();
    if (auth.error) return { error: auth.error, payments: [] };
  }

  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      *,
      season:seasons!payments_season_id_fkey(id, name)
    `)
    .eq("player_id", playerId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching player payments:", error);
    return { error: error.message, payments: [] };
  }

  return { payments: payments || [] };
}

// Create payment (manual entry)
export async function createPayment(formData: FormData) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const playerId = formData.get("player_id") as string;
  const seasonId = formData.get("season_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = formData.get("payment_method") as string;
  const paymentDate = formData.get("payment_date") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string || "completed";

  if (!playerId || !amount || !paymentMethod || !paymentDate) {
    return { error: "Player, amount, payment method, and date are required" };
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      player_id: playerId,
      season_id: seasonId || null,
      amount: amount,
      payment_method: paymentMethod,
      status: status,
      payment_date: paymentDate,
      notes: notes || null,
      entered_by: auth.userId!,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating payment:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/dashboard/profile`);
  return { success: true, payment };
}

// Update payment
export async function updatePayment(paymentId: string, formData: FormData) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : undefined;
  const paymentMethod = formData.get("payment_method") as string;
  const paymentDate = formData.get("payment_date") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string;

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (amount !== undefined) updateData.amount = amount;
  if (paymentMethod) updateData.payment_method = paymentMethod;
  if (paymentDate) updateData.payment_date = paymentDate;
  if (notes !== undefined) updateData.notes = notes;
  if (status) updateData.status = status;

  const { error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", paymentId);

  if (error) {
    console.error("Error updating payment:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/payments");
  return { success: true };
}

// Delete payment
export async function deletePayment(paymentId: string) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) {
    console.error("Error deleting payment:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/payments");
  return { success: true };
}

// Create Stripe payment intent
export async function createStripePaymentIntent(
  playerId: string,
  amount: number,
  seasonId?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.id !== playerId) {
    return { error: "Not authorized" };
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "cad",
      metadata: {
        player_id: playerId,
        season_id: seasonId || "",
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

    if (!playerId) {
      console.error("No player_id in payment intent metadata");
      return;
    }

    // Create payment record
    const { error } = await supabase
      .from("payments")
      .insert({
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Players can only see their own summary, owners can see all
  if (user?.id !== playerId) {
    const auth = await requireOwner();
    if (auth.error) return { error: auth.error };
  }

  let query = supabase
    .from("payments")
    .select("amount, status, payment_method")
    .eq("player_id", playerId)
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
}

// Get team payment status (for captains)
export async function getTeamPaymentStatus(teamId: string, seasonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", payments: [] };
  }

  // Verify user is captain of this team
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Allow owners and team captains
  if (profile?.role !== "owner" && team?.captain_id !== user.id) {
    return { error: "Not authorized - must be team captain", payments: [] };
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
    .in("player_id", playerIds)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching team payments:", error);
    return { error: error.message, payments: [] };
  }

  return { payments: payments || [] };
}
