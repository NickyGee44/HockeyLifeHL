// @ts-nocheck
"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmailGenerationContext {
  type: "game_reminder" | "stat_reminder" | "draft_notification" | "payment_reminder" | "season_invite" | "team_invite" | "custom";
  recipientName?: string;
  recipientRole?: "player" | "captain" | "admin";
  gameDetails?: {
    date: string;
    time: string;
    opponent: string;
    location?: string;
  };
  seasonName?: string;
  teamName?: string;
  customContext?: string;
  tone?: "friendly" | "professional" | "casual" | "urgent";
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  html: string;
}

/**
 * Generate email content using OpenAI
 * Optionally enhances an existing template
 */
export async function generateEmailContent(
  context: EmailGenerationContext,
  existingTemplate?: { subject: string; html: string }
): Promise<GeneratedEmail | { error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OpenAI API key not configured" };
  }

  try {
    const systemPrompt = existingTemplate
      ? `You are an email copywriter for HockeyLifeHL, a men's recreational hockey league in Canada. 
The league's tagline is "For Fun, For Beers, For Glory". 
You are enhancing an existing email template. Make it more engaging, personalized, and polished while keeping the same structure and key information.
Keep emails concise, clear, and action-oriented. Use emojis sparingly but appropriately (🏒🍁).
Always maintain a positive, community-focused tone.`
      : `You are an email copywriter for HockeyLifeHL, a men's recreational hockey league in Canada. 
The league's tagline is "For Fun, For Beers, For Glory". 
Write engaging, friendly, and professional emails that match the Canadian hockey culture.
Keep emails concise, clear, and action-oriented. Use emojis sparingly but appropriately (🏒🍁).
Always maintain a positive, community-focused tone.`;

    let userPrompt = "";

    switch (context.type) {
      case "game_reminder":
        userPrompt = `Write a ${context.tone || "friendly"} email reminder for a hockey game.
Recipient: ${context.recipientName || "Player"} (${context.recipientRole || "player"})
Game Details:
- Date: ${context.gameDetails?.date}
- Time: ${context.gameDetails?.time}
- Opponent: ${context.gameDetails?.opponent}
${context.gameDetails?.location ? `- Location: ${context.gameDetails.location}` : ""}
${context.customContext || ""}

Include a call-to-action to check in for the game.`;
        break;

      case "stat_reminder":
        userPrompt = `Write a ${context.tone || "professional"} email reminder to enter/verify stats for a game.
Recipient: ${context.recipientName || "Captain"} (captain)
Game: ${context.gameDetails?.opponent || "recent game"}
${context.customContext || ""}

Be polite but clear about the importance of timely stat entry.`;
        break;

      case "draft_notification":
        userPrompt = `Write an exciting ${context.tone || "friendly"} email about a draft starting.
Recipient: ${context.recipientName || "Captain"} (captain)
Season: ${context.seasonName || "current season"}
${context.customContext || ""}

Make it exciting and include draft rules/guidelines.`;
        break;

      case "payment_reminder":
        userPrompt = `Write a ${context.tone || "professional"} payment reminder email.
Recipient: ${context.recipientName || "Player"}
Season: ${context.seasonName || "current season"}
${context.customContext || ""}

Be clear about payment status and due dates.`;
        break;

      case "season_invite":
        userPrompt = `Write a welcoming ${context.tone || "friendly"} email inviting a player to opt in for a new season.
Recipient: ${context.recipientName || "Player"}
Season: ${context.seasonName || "new season"}
${context.customContext || ""}

Make it exciting and include season details.`;
        break;

      case "team_invite":
        userPrompt = `Write a ${context.tone || "friendly"} email inviting a player to join a team.
Recipient: ${context.recipientName || "Player"}
Team: ${context.teamName || "team"}
Season: ${context.seasonName || "current season"}
${context.customContext || ""}

Make it welcoming and include team details.`;
        break;

      case "custom":
        userPrompt = `Write a ${context.tone || "friendly"} email with the following context:
${context.customContext || "No additional context provided"}
Recipient: ${context.recipientName || "User"} (${context.recipientRole || "player"})`;
        break;
    }

    // If we have an existing template, include it in the prompt
    const enhancedPrompt = existingTemplate
      ? `${userPrompt}\n\nExisting template subject: ${existingTemplate.subject}\n\nExisting template content (HTML):\n${existingTemplate.html}\n\nPlease enhance this template with more engaging language while keeping the same structure and information.`
      : userPrompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: enhancedPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const generatedText = completion.choices[0]?.message?.content || "";
    
    // Parse subject and body from generated text
    // Format: SUBJECT: ...\n\nBODY: ...
    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
    const bodyMatch = generatedText.match(/BODY:\s*([\s\S]+?)(?:\n\n|$)/i) || 
                     generatedText.match(/(?:BODY:|SUBJECT:[\s\S]+?\n\n)([\s\S]+)/i);

    const subject = subjectMatch?.[1]?.trim() || 
                   (context.type === "game_reminder" ? "Game Reminder - HockeyLifeHL" :
                    context.type === "stat_reminder" ? "Stats Entry Reminder" :
                    context.type === "draft_notification" ? "Draft Starting - HockeyLifeHL" :
                    context.type === "payment_reminder" ? "Payment Reminder" :
                    context.type === "season_invite" ? "New Season Starting!" :
                    context.type === "team_invite" ? "Team Invitation" :
                    "HockeyLifeHL Notification");

    const body = bodyMatch?.[1]?.trim() || generatedText.trim();

    // Convert body to HTML (simple conversion)
    const html = body
      .split("\n\n")
      .map((paragraph) => {
        if (paragraph.trim() === "") return "";
        // Check if it's a list
        if (paragraph.includes("- ") || paragraph.includes("* ")) {
          const items = paragraph.split(/\n/).filter((line) => line.trim().startsWith("-") || line.trim().startsWith("*"));
          if (items.length > 0) {
            const listItems = items.map((item) => 
              `<li>${item.replace(/^[-*]\s+/, "").trim()}</li>`
            ).join("");
            return `<ul>${listItems}</ul>`;
          }
        }
        // Check if it's a heading
        if (paragraph.match(/^#{1,3}\s/)) {
          const level = paragraph.match(/^(#{1,3})/)?.[1]?.length || 1;
          const text = paragraph.replace(/^#{1,3}\s+/, "");
          return `<h${level}>${text}</h${level}>`;
        }
        return `<p>${paragraph.trim()}</p>`;
      })
      .filter((p) => p !== "")
      .join("");

    return {
      subject,
      body,
      html,
    };
  } catch (error: any) {
    console.error("Error generating email with OpenAI:", error);
    return { error: error.message || "Failed to generate email content" };
  }
}
