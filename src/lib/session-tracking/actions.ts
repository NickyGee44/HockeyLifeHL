"use server";

import { createClient } from "@/lib/supabase/server";
import {
  checkSessionLimit,
  revokeSession,
  revokeOtherSessions,
  type UserSession,
} from "../session-tracking";

/**
 * Server actions for session management
 * These can be safely called from client components
 */

export async function getActiveSessionsAction(): Promise<{
  sessions: UserSession[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { sessions: [], error: "Not authenticated" };
    }

    const sessionInfo = await checkSessionLimit(user.id);
    return { sessions: sessionInfo.sessions };
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return { sessions: [], error: error.message };
  }
}

export async function revokeSessionAction(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const success = await revokeSession(user.id, sessionId);
    return { success };
  } catch (error: any) {
    console.error("Error revoking session:", error);
    return { success: false, error: error.message };
  }
}

export async function revokeAllOtherSessionsAction(
  currentSessionId: string
): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { count: 0, error: "Not authenticated" };
    }

    const count = await revokeOtherSessions(user.id, currentSessionId);
    return { count };
  } catch (error: any) {
    console.error("Error revoking sessions:", error);
    return { count: 0, error: error.message };
  }
}
