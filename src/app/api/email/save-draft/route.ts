// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmailDraft } from "@/lib/email/actions";
import type { EmailDraft } from "@/lib/email/types";

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
    const draft: EmailDraft = {
      type: body.type,
      subject: body.subject,
      html: body.html,
      recipients: body.recipients || [],
      isAutomated: body.isAutomated || false,
      context: body.context,
    };

    const result = await sendEmailDraft(draft, false); // Don't skip preview

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, draft: { id: "draft-id" } });
  } catch (error: any) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save draft" },
      { status: 500 }
    );
  }
}
