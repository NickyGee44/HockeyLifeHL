// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendDraftNotificationEmail(draftId: string, seasonName: string, draftLink?: string) {
  try {
    const supabase = await createClient();

    // Get all team captains
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        captain:profiles!teams_captain_id_fkey(
          id,
          email,
          full_name
        )
      `)
      .not("captain_id", "is", null);

    if (teamsError) {
      console.error("Error fetching teams for draft email:", teamsError);
      return { error: teamsError.message };
    }

    if (!teams || teams.length === 0) {
      console.log("No teams with captains found for draft email");
      return { success: true, message: "No teams with captains to notify" };
    }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // Use unique draft link if provided, otherwise fall back to general draft page
  const draftUrl = draftLink 
    ? `${siteUrl}/captain/draft?draft=${draftLink}`
    : `${siteUrl}/captain/draft`;

  // Draft rules explanation
  const draftRules = `
    <h2>Draft Rules & Guidelines</h2>
    <ul>
      <li><strong>Draft Order:</strong> Teams pick in snake draft format (Round 1: 1-6, Round 2: 6-1, etc.)</li>
      <li><strong>Pick Time:</strong> You'll be notified when it's your turn to pick</li>
      <li><strong>Player Grades:</strong> Players are rated A+ through D- based on:
        <ul>
          <li>Attendance rate</li>
          <li>Points per game (for skaters)</li>
          <li>Goals against average & save percentage (for goalies)</li>
        </ul>
      </li>
      <li><strong>Strategy:</strong> Build a balanced team considering player grades, positions, and team chemistry</li>
      <li><strong>Draft Completion:</strong> The draft will continue until all teams have filled their rosters</li>
    </ul>
  `;

  // Email template
  const emailSubject = `🏒 HockeyLifeHL Draft Has Begun - ${seasonName}`;
  const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #E31837 0%, #003E7E 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #E31837; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .rules { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #E31837; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏒 Draft Time! 🏒</h1>
          <p>The ${seasonName} Draft Has Begun</p>
        </div>
        <div class="content">
          <p>Hello Captain,</p>
          <p>The draft for <strong>${seasonName}</strong> has officially started! It's time to build your team and compete for glory.</p>
          
          <div class="rules">
            ${draftRules}
          </div>

          <p><strong>Ready to make your picks?</strong></p>
          <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
            <strong>Your unique draft link:</strong><br/>
            <code style="background: #f0f0f0; padding: 5px; border-radius: 3px; word-break: break-all;">${draftUrl}</code>
          </p>
          <a href="${draftUrl}" class="button">Go to Draft Board →</a>

          <p>Good luck, and may the best team win! 🍁</p>
          <p><em>For Fun, For Beers, For Glory</em></p>
        </div>
        <div class="footer">
          <p>HockeyLifeHL - Men's Recreational Hockey League</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    // Send emails to all captains
    const teamsWithCaptains = teams.filter(team => team.captain && team.captain.email);
    
    if (teamsWithCaptains.length === 0) {
      console.log("No teams with valid captain emails found");
      return { success: true, message: "No valid captain emails to notify" };
    }

    const emailPromises = teamsWithCaptains.map(async (team) => {
      try {
        // Use Supabase's email function or external service
        // For now, we'll use a simple approach - in production you'd use SendGrid, Resend, etc.
        // Note: Supabase doesn't have a built-in email sending function, so you'd need to:
        // 1. Use a service like Resend, SendGrid, or AWS SES
        // 2. Or use Supabase Edge Functions to send emails
        
        // For now, we'll log it and return success
        // In production, implement actual email sending here
        console.log(`Would send draft email to ${team.captain.email} for team ${team.name}`);
        
        // TODO: Implement actual email sending
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'HockeyLifeHL <draft@hockeylifehl.com>',
        //   to: team.captain.email,
        //   subject: emailSubject,
        //   html: emailBody,
        // });
        
        return { success: true, email: team.captain.email };
      } catch (error) {
        console.error(`Error preparing email for ${team.captain.email}:`, error);
        return { success: false, email: team.captain.email, error };
      }
    });

    await Promise.all(emailPromises);

    return { success: true, message: `Draft notifications prepared for ${teamsWithCaptains.length} captains` };
  } catch (error: any) {
    console.error("Error in sendDraftNotificationEmail:", error);
    return { error: error.message || "Failed to send draft notification emails" };
  }
}
