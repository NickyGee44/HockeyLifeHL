# Migration Breaking Changes

**Date:** 2026-02-04
**Migration:** `20260204_fix_notification_analytics_view_security.sql`
**Status:** COMPLETED

---

## Overview

This document describes breaking changes introduced by the notification analytics security fix migration. While the migration itself is backward compatible (no existing code was using the view), this documents the proper way to use the new secure RPC function going forward.

---

## Breaking Change: notification_analytics View Access

### What Changed

The `notification_analytics` view (if it exists) has had all permissions revoked from `anon` and `authenticated` roles. Direct access to the view is no longer permitted.

### Why This Change Was Made

**Security Issue:** Views with broad GRANT permissions bypass Row Level Security (RLS) on underlying tables. This created a potential security vulnerability where:
- Any authenticated user could query notification analytics for ANY league
- Anonymous users could access aggregated notification data
- No access control was enforced on sensitive notification metrics

**Solution:** All notification analytics must now go through the secure `get_notification_analytics()` RPC function, which enforces proper access control.

### Who Is Affected

- **No existing code is affected** - our codebase search confirmed no code currently uses the `notification_analytics` view
- Future code that attempts to query the view directly will receive a permission error
- Any code that tries to use `.from('notification_analytics')` will fail

---

## Migration Guide

### Before (DEPRECATED - Will Fail)

```typescript
// This will FAIL with permission denied
const { data } = await supabase
  .from('notification_analytics')
  .select('*')
  .eq('league_id', leagueId)
  .gte('sent_date', startDate)
  .lte('sent_date', endDate);
```

### After (CORRECT - Use This)

```typescript
// Use the secure RPC function instead
const { data, error } = await supabase.rpc('get_notification_analytics', {
  p_league_id: leagueId,      // UUID of the league (required for non-platform-owners)
  p_start_date: startDate,    // Optional: filter by start date (timestamptz)
  p_end_date: endDate,        // Optional: filter by end date (timestamptz)
});

if (error) {
  console.error('Failed to fetch notification analytics:', error);
  return;
}

// Process the data
console.log('Notification analytics:', data);
```

---

## API Reference

### Function Signature

```sql
get_notification_analytics(
  p_league_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  league_id UUID,
  type TEXT,
  channel TEXT,
  status TEXT,
  count BIGINT,
  sent_date DATE
)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `p_league_id` | UUID | No | Specific league to query. If NULL and user is not platform owner, returns data for all user's admin leagues |
| `p_start_date` | TIMESTAMPTZ | No | Start of date range filter (inclusive) |
| `p_end_date` | TIMESTAMPTZ | No | End of date range filter (inclusive) |

### Return Columns

| Column | Type | Description |
|--------|------|-------------|
| `league_id` | UUID | ID of the league |
| `type` | TEXT | Notification type (e.g., 'game_reminder', 'roster_change') |
| `channel` | TEXT | Delivery channel ('email', 'sms', 'push') |
| `status` | TEXT | Delivery status ('sent', 'failed', 'pending', 'bounced') |
| `count` | BIGINT | Number of notifications matching this grouping |
| `sent_date` | DATE | Date the notifications were sent/created |

### Access Control

The function enforces the following access control rules:

1. **Authentication Required**: User must be authenticated (logged in)
2. **Platform Owners**: Users with role='owner' in profiles table can query any league
3. **League Admins/Owners**: Users must have admin or owner role in the specific league
4. **Automatic Filtering**: If no league_id specified, only returns data for leagues where user is admin/owner

---

## TypeScript Types

The function is already available in the generated types:

```typescript
// From packages/database/src/types.ts
export interface Database {
  public: {
    Functions: {
      get_notification_analytics: {
        Args: {
          p_end_date?: string;
          p_league_id?: string;
          p_start_date?: string;
        };
        Returns: {
          channel: string;
          count: number;
          league_id: string;
          sent_date: string;
          status: string;
          type: string;
        }[];
      };
    };
  };
}
```

---

## Usage Examples

### Example 1: Get Analytics for a Specific League

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getLeagueNotificationStats(leagueId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_notification_analytics', {
    p_league_id: leagueId,
    p_start_date: null, // No date filtering
    p_end_date: null,
  });

  if (error) {
    throw new Error(`Failed to fetch notification stats: ${error.message}`);
  }

  return data;
}
```

### Example 2: Get Analytics with Date Range

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getMonthlyNotificationStats(
  leagueId: string,
  year: number,
  month: number
) {
  const supabase = await createClient();

  // Create date range for the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase.rpc('get_notification_analytics', {
    p_league_id: leagueId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(`Failed to fetch monthly stats: ${error.message}`);
  }

  return data;
}
```

### Example 3: Get All Accessible Leagues (Admin Dashboard)

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getAllLeaguesNotificationStats() {
  const supabase = await createClient();

  // Passing NULL for league_id returns stats for all leagues
  // where the current user is an admin/owner
  const { data, error } = await supabase.rpc('get_notification_analytics', {
    p_league_id: null, // Returns all accessible leagues
    p_start_date: null,
    p_end_date: null,
  });

  if (error) {
    throw new Error(`Failed to fetch notification stats: ${error.message}`);
  }

  // Group by league for display
  const byLeague = data.reduce((acc, row) => {
    if (!acc[row.league_id]) {
      acc[row.league_id] = [];
    }
    acc[row.league_id].push(row);
    return acc;
  }, {} as Record<string, typeof data>);

  return byLeague;
}
```

### Example 4: Last 30 Days Analytics

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getRecentNotificationStats(leagueId: string) {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase.rpc('get_notification_analytics', {
    p_league_id: leagueId,
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to fetch recent stats: ${error.message}`);
  }

  return data;
}
```

### Example 5: Client-Side Usage with React

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function NotificationAnalytics({ leagueId }: { leagueId: string }) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_notification_analytics', {
        p_league_id: leagueId,
        p_start_date: null,
        p_end_date: null,
      });

      if (error) {
        setError(error.message);
      } else {
        setAnalytics(data || []);
      }

      setLoading(false);
    }

    loadAnalytics();
  }, [leagueId]);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Notification Analytics</h2>
      <pre>{JSON.stringify(analytics, null, 2)}</pre>
    </div>
  );
}
```

---

## Error Handling

### Common Errors

#### 1. Access Denied

```
Error: Access denied: You must be a league admin or owner to view notification analytics
```

**Cause:** User is not an admin/owner of the requested league.

**Solution:** Verify user has proper permissions or request access from league admin.

#### 2. Authentication Required

```
Error: Authentication required
```

**Cause:** User is not logged in.

**Solution:** Ensure user is authenticated before calling the function.

#### 3. Invalid League ID

If you pass an invalid or non-existent league ID, the function will return an empty result set (not an error).

### Recommended Error Handling Pattern

```typescript
import { createClient } from '@/lib/supabase/server';

export async function safeGetNotificationAnalytics(leagueId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_notification_analytics', {
      p_league_id: leagueId,
      p_start_date: null,
      p_end_date: null,
    });

    if (error) {
      // Log the error for debugging
      console.error('[Notification Analytics] RPC error:', error);

      // Check for specific error types
      if (error.message.includes('Access denied')) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You do not have permission to view these analytics',
        };
      }

      if (error.message.includes('Authentication required')) {
        return {
          success: false,
          error: 'UNAUTHENTICATED',
          message: 'Please log in to view analytics',
        };
      }

      // Generic error
      return {
        success: false,
        error: 'UNKNOWN',
        message: error.message,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error('[Notification Analytics] Unexpected error:', err);
    return {
      success: false,
      error: 'EXCEPTION',
      message: 'An unexpected error occurred',
    };
  }
}
```

---

## Performance Considerations

### Indexes

The migration relies on existing indexes on the `notifications` table:
- `idx_notifications_league_id` - for league filtering
- `idx_notifications_created_at` - for date range queries

### Query Optimization

1. **Always specify a league_id when possible** - this allows the query to use the league index efficiently
2. **Use date ranges to limit data** - prevents scanning the entire table
3. **Cache results** - analytics data doesn't change frequently, consider caching for 5-15 minutes

### Example with Caching (Next.js)

```typescript
import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

export const getCachedNotificationAnalytics = unstable_cache(
  async (leagueId: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_notification_analytics', {
      p_league_id: leagueId,
      p_start_date: null,
      p_end_date: null,
    });

    if (error) throw error;
    return data;
  },
  ['notification-analytics'], // Cache key
  {
    revalidate: 300, // Revalidate every 5 minutes
    tags: ['notification-analytics'],
  }
);
```

---

## Testing

### Manual Testing (SQL)

```sql
-- Test 1: As league admin, should succeed
SELECT * FROM get_notification_analytics(
  'your-league-id'::UUID,
  NULL,
  NULL
);

-- Test 2: As platform owner, should see all leagues
SELECT * FROM get_notification_analytics(
  NULL,
  NULL,
  NULL
);

-- Test 3: Date range filtering
SELECT * FROM get_notification_analytics(
  'your-league-id'::UUID,
  '2026-01-01 00:00:00+00'::TIMESTAMPTZ,
  '2026-02-01 00:00:00+00'::TIMESTAMPTZ
);

-- Test 4: Verify direct view access is denied
SELECT * FROM notification_analytics; -- Should fail with permission denied
```

### Automated Testing (TypeScript)

```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '@/lib/supabase/server';

describe('get_notification_analytics', () => {
  it('should return analytics for league admin', async () => {
    const supabase = await createClient();
    // Assumes user is logged in and has admin access to a league

    const { data, error } = await supabase.rpc('get_notification_analytics', {
      p_league_id: 'test-league-id',
      p_start_date: null,
      p_end_date: null,
    });

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('should fail for non-admin users', async () => {
    const supabase = await createClient();
    // Assumes user is logged in but NOT an admin of the league

    const { data, error } = await supabase.rpc('get_notification_analytics', {
      p_league_id: 'other-league-id',
      p_start_date: null,
      p_end_date: null,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Access denied');
  });

  it('should respect date range filters', async () => {
    const supabase = await createClient();

    const startDate = '2026-01-01T00:00:00Z';
    const endDate = '2026-01-31T23:59:59Z';

    const { data, error } = await supabase.rpc('get_notification_analytics', {
      p_league_id: 'test-league-id',
      p_start_date: startDate,
      p_end_date: endDate,
    });

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);

    // Verify all dates are within range
    data?.forEach((row) => {
      const sentDate = new Date(row.sent_date);
      expect(sentDate >= new Date(startDate)).toBe(true);
      expect(sentDate <= new Date(endDate)).toBe(true);
    });
  });
});
```

---

## Migration Checklist

- [x] Migration file created: `20260204_fix_notification_analytics_view_security.sql`
- [x] Function signature matches TypeScript types
- [x] Access control properly enforced
- [x] SECURITY DEFINER with search_path = public
- [x] Permissions granted to authenticated role
- [x] Function comments and documentation added
- [x] No existing code uses the old view (verified via codebase search)
- [x] Migration is idempotent (can be run multiple times safely)
- [x] Breaking changes documented
- [x] Usage examples provided
- [x] Error handling documented
- [x] Performance considerations documented

---

## Support

If you encounter issues with this migration:

1. **Check user permissions**: Verify the user has admin/owner role in the league
2. **Check authentication**: Ensure user is logged in before calling the function
3. **Check error messages**: The function provides descriptive error messages
4. **Review logs**: Check application logs for detailed error information
5. **Test with SQL**: Use the SQL testing examples above to isolate the issue

For questions or issues, refer to:
- `RLS_SECURITY_FIXES_2026-02-04.md` - Security fix details
- `supabase/migrations/20260204_fix_notification_analytics_view_security.sql` - Migration source code

---

## Related Documentation

- [RLS_SECURITY_FIXES_2026-02-04.md](./RLS_SECURITY_FIXES_2026-02-04.md) - Complete security fix documentation
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
