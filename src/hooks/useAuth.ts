"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const AUTH_TIMEOUT = 10000; // 10 second timeout for auth operations

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the singleton client instance - wrapped in try-catch for safety
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (e) {
      console.error("Failed to create Supabase client:", e);
      return null;
    }
  }, []);

  // Always fetch fresh profile data - no caching
  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    if (!supabase) return null;
    
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (fetchError) {
        console.error("Profile fetch error:", fetchError);
        // Retry once if it's a network error
        if (retryCount < 1 && (fetchError.code === 'PGRST116' || fetchError.message.includes('network'))) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        return null;
      }
      
      return data || null;
    } catch (err) {
      console.error("Profile fetch exception:", err);
      // Retry once on exception
      if (retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfile(userId, retryCount + 1);
      }
      return null;
    }
  }, [supabase]);

  // Function to refetch profile
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
    return freshProfile;
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // If supabase client failed to create, stop loading immediately
    if (!supabase) {
      setError("Configuration error. Please refresh the page.");
      setLoading(false);
      return;
    }

    // Get initial session with timeout
    const getInitialSession = async () => {
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn("Auth initialization timed out");
          setLoading(false);
        }
      }, AUTH_TIMEOUT);

      try {
        // Get session from storage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        if (sessionError) {
          console.error("Session error:", sessionError);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          
          // Always fetch fresh profile on load
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
            setError(null);
          }
        } else {
          // No session - user is not logged in
          setUser(null);
          setProfile(null);
          setError(null);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", event);
        
        setUser(session?.user ?? null);

        if (session?.user) {
          // Always fetch fresh profile on auth change
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
            setError(null);
          }
        } else {
          setProfile(null);
          setError(null);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    user,
    profile,
    loading,
    error,
    isLoggedIn: !!user,
    isOwner: profile?.role === "owner",
    isCaptain: profile?.role === "captain" || profile?.role === "owner",
    isPlayer: !!profile,
    refreshProfile, // Expose refresh function
  }), [user, profile, loading, error, refreshProfile]);
}
