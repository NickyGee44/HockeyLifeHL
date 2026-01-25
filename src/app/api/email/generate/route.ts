// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmailDraft } from "@/lib/email/actions";
import type { EmailType, EmailGenerationContext } from "@/lib/email/types";

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
    const { type, enhanceTemplate, ...context } = body;

    const result = await generateEmailDraft(
      type as EmailType,
      context as EmailGenerationContext,
      enhanceTemplate
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error generating email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate email" },
      { status: 500 }
    );
  }
}
