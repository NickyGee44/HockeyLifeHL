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
