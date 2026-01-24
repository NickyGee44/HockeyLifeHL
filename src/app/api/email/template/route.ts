// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getEmailTemplate } from "@/lib/email/templates";
import type { EmailType } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
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
