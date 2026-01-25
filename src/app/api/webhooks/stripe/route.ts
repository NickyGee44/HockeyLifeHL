import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { handleStripeWebhook } from "@/lib/payments/actions";

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  let stripe: Stripe;

  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // SECURITY: Idempotency check - prevent duplicate webhook processing
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existing) {
      console.log(`Webhook event ${event.id} already processed - ignoring duplicate`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Process the webhook
    await handleStripeWebhook(event);

    // SECURITY: Log event as processed (idempotency)
    await supabase
      .from("webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
