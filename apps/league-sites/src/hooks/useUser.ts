'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UseUserReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get current authenticated user and session
 * Listens to auth state changes and updates automatically
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(new Error(error.message));
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get session'));
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, isLoading, error };
}
