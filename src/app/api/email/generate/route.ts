// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { generateEmailDraft } from "@/lib/email/actions";
import type { EmailType, EmailGenerationContext } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
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
