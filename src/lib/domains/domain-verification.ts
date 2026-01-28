"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

export type DomainVerificationResult = {
  error?: string;
  success?: boolean;
  status?: "pending" | "verified" | "failed";
  verificationToken?: string;
};

/**
 * Generate a verification token for domain ownership
 */
function generateVerificationToken(): string {
  return `hockeylife-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Initiate domain verification process
 * Generates a token that must be added to DNS TXT records
 */
export async function initiateDomainVerification(
  leagueId: string,
  customDomain: string
): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // 2. Verify user is league owner or admin
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { error: "Only league owners and admins can manage domains" };
    }

    // 3. Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(customDomain)) {
      return { error: "Invalid domain format" };
    }

    // 4. Check if domain is already in use by another league
    const { data: existingLeague } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("custom_domain", customDomain)
      .neq("id", leagueId)
      .single();

    if (existingLeague) {
      return { error: `This domain is already in use by ${existingLeague.name}` };
    }

    // 5. Generate verification token
    const verificationToken = generateVerificationToken();

    // 6. Update league with custom domain and token
    const { error: updateError } = await supabase
      .from("leagues")
      .update({
        custom_domain: customDomain,
        custom_domain_verified: false,
        domain_verification_token: verificationToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leagueId);

    if (updateError) {
      console.error("Error updating league with domain:", updateError);
      return { error: "Failed to initiate domain verification" };
    }

    revalidatePath(`/${leagueId}/settings/general`);

    return {
      success: true,
      status: "pending",
      verificationToken,
    };
  } catch (error: any) {
    console.error("Error in initiateDomainVerification:", error);
    return { error: error.message || "Failed to initiate domain verification" };
  }
}

/**
 * Verify domain ownership by checking DNS TXT records
 * Looks for TXT record: hockeylife-verify=<token>
 */
export async function verifyDomainOwnership(
  leagueId: string
): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // 2. Verify user is league owner or admin
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { error: "Only league owners and admins can manage domains" };
    }

    // 3. Get league with custom domain and verification token
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("custom_domain, domain_verification_token, custom_domain_verified")
      .eq("id", leagueId)
      .single();

    if (leagueError || !league) {
      return { error: "League not found" };
    }

    // Type assertion until Supabase types are regenerated
    const leagueData = league as any;

    if (!leagueData.custom_domain) {
      return { error: "No custom domain configured" };
    }

    if (!leagueData.domain_verification_token) {
      return { error: "No verification token found. Please initiate verification first." };
    }

    // 4. Check DNS TXT records
    let txtRecords: string[][] = [];
    try {
      txtRecords = await resolveTxt(leagueData.custom_domain);
    } catch (dnsError: any) {
      console.error("DNS lookup error:", dnsError);
      return {
        error: "Failed to verify DNS records. Please ensure TXT record is properly configured.",
        status: "failed",
      };
    }

    // 5. Look for verification token in TXT records
    const expectedRecord = `hockeylife-verify=${leagueData.domain_verification_token}`;
    const isVerified = txtRecords.some(record =>
      record.join("").includes(expectedRecord)
    );

    if (!isVerified) {
      return {
        error: "Verification TXT record not found. Please add the TXT record to your DNS configuration.",
        status: "failed",
      };
    }

    // 6. Update league to mark domain as verified
    const { error: updateError } = await supabase
      .from("leagues")
      .update({
        custom_domain_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leagueId);

    if (updateError) {
      console.error("Error updating domain verification status:", updateError);
      return { error: "Failed to update verification status" };
    }

    revalidatePath(`/${leagueId}/settings/general`);

    return {
      success: true,
      status: "verified",
    };
  } catch (error: any) {
    console.error("Error in verifyDomainOwnership:", error);
    return { error: error.message || "Failed to verify domain ownership" };
  }
}

/**
 * Remove custom domain from league
 */
export async function removeCustomDomain(leagueId: string): Promise<DomainVerificationResult> {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // 2. Verify user is league owner or admin
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { error: "Only league owners and admins can manage domains" };
    }

    // 3. Remove custom domain
    const { error: updateError } = await supabase
      .from("leagues")
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        domain_verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leagueId);

    if (updateError) {
      console.error("Error removing custom domain:", updateError);
      return { error: "Failed to remove custom domain" };
    }

    revalidatePath(`/${leagueId}/settings/general`);

    return { success: true };
  } catch (error: any) {
    console.error("Error in removeCustomDomain:", error);
    return { error: error.message || "Failed to remove custom domain" };
  }
}
