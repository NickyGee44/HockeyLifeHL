"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

// Cache for profile data to avoid refetching
let profileCache: { userId: string; profile: Profile; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds for better role updates
const AUTH_TIMEOUT = 10000; // 10 second timeout for auth operations

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  
  // Get the singleton client instance - wrapped in try-catch for safety
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (e) {
      console.error("Failed to create Supabase client:", e);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    // Check cache first (but only if it's recent)
    if (profileCache && 
        profileCache.userId === userId && 
        Date.now() - profileCache.timestamp < CACHE_TTL) {
      return profileCache.profile;
    }

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
      
      if (data) {
        profileCache = { userId, profile: data, timestamp: Date.now() };
        return data;
      }
      
      return null;
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

  // Function to invalidate cache and refetch profile
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    profileCache = null;
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
    return freshProfile;
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initRef.current) return;
    initRef.current = true;

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
          // Don't set error - user might just not be logged in
        }
      }, AUTH_TIMEOUT);

      try {
        // First, try to get session from storage (faster, no API call)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        if (sessionError) {
          console.error("Session error:", sessionError);
          // Don't treat as fatal - user might just not be logged in
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        // If we have a session, validate it with getUser
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
            setError(null);
          }
        } else {
          // No session - user is not logged in
          profileCache = null;
          setUser(null);
          setProfile(null);
          setError(null);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        // Don't set error state - just log and continue
        // User can still use the site without being logged in
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
        
        // Invalidate cache on any auth state change
        profileCache = null;
        
        setUser(session?.user ?? null);

        if (session?.user) {
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
