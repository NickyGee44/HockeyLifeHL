// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmailDraft } from "@/lib/email/actions";
import { RateLimiters, getClientIdentifier } from "@/lib/rate-limit";
import { validateOrigin, csrfErrorResponse } from "@/lib/csrf-protection";
import type { EmailDraft } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF protection - validate request origin
    if (!validateOrigin(request)) {
      return csrfErrorResponse();
    }
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // SECURITY: Rate limiting - 10 requests per minute
    const identifier = getClientIdentifier(request, user.id);
    const rateLimit = await RateLimiters.standard.check(identifier);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.reset).toISOString(),
            "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // SECURITY: Require owner role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to verify user permissions" },
        { status: 500 }
      );
    }

    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Unauthorized - owner access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const draft: EmailDraft = {
      type: body.type,
      subject: body.subject,
      html: body.html,
      recipients: body.recipients || [],
      isAutomated: body.isAutomated || false,
      context: body.context,
    };

    const result = await sendEmailDraft(draft, body.skipPreview || false);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, sent: result.sent });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
