// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmailTemplate } from "@/lib/email/templates";
import type { EmailType } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // SECURITY: Require owner role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner") {
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
