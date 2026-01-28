/**
 * Session Tracking System
 *
 * Tracks concurrent user sessions for security monitoring and management.
 * Enables features like "Sign out other devices" and session limits.
 *
 * DATABASE MIGRATION: supabase/migrations/20260128_create_user_sessions.sql
 *
 * NOTE: @ts-nocheck is used because the user_sessions table types will be
 * available after applying the migration and regenerating Supabase types.
 * Run: npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
 */

// @ts-nocheck - Table types will be available after migration
import { createClient } from '@/lib/supabase/server';

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActive: Date;
  expiresAt: Date;
}

export interface SessionInfo {
  count: number;
  sessions: UserSession[];
  limit: number;
  canCreateNew: boolean;
}

const MAX_CONCURRENT_SESSIONS = 5;

/**
 * Log session creation and store in database
 * Creates a new session record for monitoring and management
 *
 * @param userId - User ID for the session
 * @param sessionToken - Unique session token (e.g., JWT token ID)
 * @param request - Optional request object to extract IP and user agent
 * @returns Promise that resolves when session is created
 */
export async function logSessionCreated(
  userId: string,
  sessionToken: string,
  request?: Request
): Promise<void> {
  const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request?.headers.get('x-real-ip') ||
                     'unknown';
  const userAgent = request?.headers.get('user-agent') || 'unknown';

  console.log('[SESSION] Created:', {
    userId,
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const { error } = await supabase.from('user_sessions').insert({
      user_id: userId,
      session_token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error('[SESSION] Error creating session:', error);
      // Don't throw - session tracking is non-critical, shouldn't break auth
    }
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
    // Silent fail - session tracking is monitoring feature
  }
}

/**
 * Log session termination and remove from database
 * Deletes session record(s) when user logs out
 *
 * @param userId - User ID
 * @param sessionId - Optional specific session ID to terminate
 * @returns Promise that resolves when session is terminated
 */
export async function logSessionTerminated(userId: string, sessionId?: string): Promise<void> {
  console.log('[SESSION] Terminated:', {
    userId,
    sessionId: sessionId || 'all',
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();

    let query = supabase.from('user_sessions').delete();

    if (sessionId) {
      // Delete specific session
      query = query.eq('id', sessionId);
    } else {
      // Delete all sessions for user
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('[SESSION] Error terminating session:', error);
    }
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
  }
}

/**
 * Check if user has exceeded concurrent session limit
 * Queries active sessions from database
 *
 * @param userId - User ID to check
 * @returns Session information including count and limit
 */
export async function checkSessionLimit(userId: string): Promise<SessionInfo> {
  console.log('[SESSION] Checking limit for user:', userId);

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SESSION] Error checking limit:', error);
      return {
        count: 0,
        sessions: [],
        limit: MAX_CONCURRENT_SESSIONS,
        canCreateNew: true,
      };
    }

    const activeSessions = sessions || [];

    return {
      count: activeSessions.length,
      sessions: activeSessions.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        sessionToken: s.session_token,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        createdAt: new Date(s.created_at),
        lastActive: new Date(s.last_active),
        expiresAt: new Date(s.expires_at),
      })),
      limit: MAX_CONCURRENT_SESSIONS,
      canCreateNew: activeSessions.length < MAX_CONCURRENT_SESSIONS,
    };
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
    return {
      count: 0,
      sessions: [],
      limit: MAX_CONCURRENT_SESSIONS,
      canCreateNew: true,
    };
  }
}

/**
 * Revoke a specific session
 * Useful for "Sign out other devices" functionality
 *
 * @param userId - User ID
 * @param sessionId - Session ID to revoke
 * @returns Success status
 */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  console.log('[SESSION] Revoking session:', { userId, sessionId });

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId); // Ensure user owns the session

    if (error) {
      console.error('[SESSION] Error revoking session:', error);
      return false;
    }

    await logSessionTerminated(userId, sessionId);
    return true;
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
    return false;
  }
}

/**
 * Revoke all sessions except the current one
 * Useful for "Sign out all other devices" functionality
 *
 * @param userId - User ID
 * @param currentSessionId - Current session to keep
 * @returns Number of sessions revoked
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  console.log('[SESSION] Revoking other sessions:', { userId, currentSessionId });

  try {
    const supabase = await createClient();

    // First get count of sessions to be deleted
    const { data: sessionsToDelete, error: selectError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .neq('id', currentSessionId);

    if (selectError) {
      console.error('[SESSION] Error querying sessions:', selectError);
      return 0;
    }

    const count = sessionsToDelete?.length || 0;

    if (count > 0) {
      const { error: deleteError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .neq('id', currentSessionId);

      if (deleteError) {
        console.error('[SESSION] Error revoking sessions:', deleteError);
        return 0;
      }

      console.log(`[SESSION] Revoked ${count} sessions for user ${userId}`);
    }

    return count;
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
    return 0;
  }
}

/**
 * Cleanup expired sessions
 * Should be run periodically (e.g., via cron job or API route)
 * Can also call the database function directly: SELECT cleanup_expired_sessions();
 *
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredSessions(): Promise<number> {
  console.log('[SESSION] Cleaning up expired sessions');

  try {
    const supabase = await createClient();

    // Use the database function for efficient cleanup
    const { data, error } = await supabase.rpc('cleanup_expired_sessions');

    if (error) {
      console.error('[SESSION] Error cleaning up sessions:', error);
      return 0;
    }

    const count = data || 0;
    console.log(`[SESSION] Cleaned up ${count} expired sessions`);
    return count;
  } catch (err) {
    console.error('[SESSION] Unexpected error:', err);
    return 0;
  }
}
