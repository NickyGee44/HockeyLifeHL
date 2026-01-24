// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { sendEmailDraft } from "@/lib/email/actions";
import type { EmailDraft } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
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
