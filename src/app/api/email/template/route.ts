import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmailTemplate } from "@/lib/email/templates";
import { RateLimiters, getClientIdentifier } from "@/lib/rate-limit";
import { validateOrigin, csrfErrorResponse } from "@/lib/csrf-protection";
import type { EmailType } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF protection
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

    // SECURITY: Rate limiting - 30 requests per minute (read-only endpoint)
    const identifier = getClientIdentifier(request, user.id);
    const rateLimit = await RateLimiters.generous.check(identifier);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
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
    const { type, ...context } = body;

    const template = getEmailTemplate(type as EmailType, context);

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Error getting email template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get email template" },
      { status: 500 }
    );
  }
}
