"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "verify"
  | "approve"
  | "reject"
  | "invite"
  | "remove"
  | "assign"
  | "unassign"
  | "activate"
  | "deactivate"
  | "email_sent"
  | "payment_created"
  | "payment_updated"
  | "suspension_created"
  | "suspension_updated"
  | "suspension_deleted";

export type ResourceType =
  | "player"
  | "team"
  | "game"
  | "season"
  | "payment"
  | "suspension"
  | "draft"
  | "article"
  | "email"
  | "stats"
  | "roster"
  | "invite";

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Log an admin action to the audit log
 * @param entry - The audit log entry to create
 * @returns Success status
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No authenticated user" };
    }

    // Get request headers for IP and user agent
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ||
                     headersList.get("x-real-ip") ||
                     "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Insert audit log
    const { error } = await (supabase as any)
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        details: entry.details || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error("Failed to log audit event:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Audit logging error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  const supabase = await createClient();

  const { data: logs, error } = await (supabase as any)
    .from("audit_logs")
    .select(`
      *,
      user:profiles!audit_logs_user_id_fkey(id, full_name, email)
    `)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], error: error.message };
  }

  return { logs: logs || [], error: null };
}

/**
 * Get recent audit logs (last 100)
 */
export async function getRecentAuditLogs() {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { logs: [], error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { logs: [], error: "Not authorized - owner access required" };
  }

  const { data: logs, error } = await (supabase as any)
    .from("audit_logs")
    .select(`
      *,
      user:profiles!audit_logs_user_id_fkey(id, full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], error: error.message };
  }

  return { logs: logs || [], error: null };
}

/**
 * Search audit logs with filters
 */
export async function searchAuditLogs(filters: {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const supabase = await createClient();

  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { logs: [], error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { logs: [], error: "Not authorized - owner access required" };
  }

  let query = (supabase as any)
    .from("audit_logs")
    .select(`
      *,
      user:profiles!audit_logs_user_id_fkey(id, full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.resourceType) {
    query = query.eq("resource_type", filters.resourceType);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query.limit(filters.limit || 100);

  const { data: logs, error } = await query;

  if (error) {
    console.error("Error searching audit logs:", error);
    return { logs: [], error: error.message };
  }

  return { logs: logs || [], error: null };
}
