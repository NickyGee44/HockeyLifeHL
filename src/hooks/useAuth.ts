"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const AUTH_TIMEOUT = 30000; // 30 second timeout for auth operations

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
      console.log(`[useAuth] Fetching profile for user ${userId} (attempt ${retryCount + 1})`);

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("[useAuth] Profile fetch error:", fetchError);
        // Retry up to 3 times on any error (network, timeout, etc)
        if (retryCount < 3) {
          console.log(`[useAuth] Retrying profile fetch in ${(retryCount + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        console.error("[useAuth] Profile fetch failed after 3 retries");
        return null;
      }

      console.log("[useAuth] Profile fetched successfully:", data?.email);
      return data || null;
    } catch (err) {
      console.error("[useAuth] Profile fetch exception:", err);
      // Retry up to 3 times on exception
      if (retryCount < 3) {
        console.log(`[useAuth] Retrying after exception in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return fetchProfile(userId, retryCount + 1);
      }
      console.error("[useAuth] Profile fetch failed after 3 retries");
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
      console.log("[useAuth] Getting initial session...");

      // Set loading to false after maximum wait time (even if profile fetch isn't done)
      const maxWaitTime = process.env.NODE_ENV === 'production' ? AUTH_TIMEOUT : 5000; // 5s in dev, 30s in prod
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn(`[useAuth] Auth initialization exceeded ${maxWaitTime}ms, setting loading to false anyway`);
          // Set loading to false so app can proceed even if profile isn't loaded yet
          setLoading(false);
          // Profile might still load in the background via the auth state listener
        }
      }, maxWaitTime);

      try {
        // Get session from storage - this reads from localStorage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) {
          clearTimeout(timeoutId);
          console.log("[useAuth] Component unmounted, aborting session fetch");
          return;
        }

        if (sessionError) {
          console.error("[useAuth] Session error:", sessionError);
          clearTimeout(timeoutId);
          setLoading(false);
          setError("Failed to load session");
          return;
        }

        if (session?.user) {
          console.log("[useAuth] Session found for user:", session.user.email);
          setUser(session.user);

          // Fetch profile on initial load - allow more time if needed
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
            if (userProfile) {
              console.log("[useAuth] Profile loaded successfully");
              setError(null);
            } else {
              console.error("[useAuth] Profile not loaded - user may have limited access");
              setError("Profile could not be loaded. Some features may be unavailable.");
            }
          }
        } else {
          // No session - user is not logged in
          console.log("[useAuth] No session found");
          setUser(null);
          setProfile(null);
          setError(null);
        }
      } catch (err) {
        console.error("[useAuth] Auth initialization error:", err);
        setError("Failed to initialize authentication");
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (mounted) {
          console.log("[useAuth] Auth initialization complete, setting loading to false");
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (!mounted) return;

          console.log("Auth state changed:", event);

          // Only refetch profile on actual auth changes, not on token refresh
          const shouldRefetchProfile = event === 'SIGNED_IN' ||
                                       event === 'SIGNED_OUT' ||
                                       event === 'USER_UPDATED';

          setUser(session?.user ?? null);

          if (session?.user) {
            if (shouldRefetchProfile || !profile) {
              // Fetch profile on auth change or if we don't have one yet
              const userProfile = await fetchProfile(session.user.id);
              if (mounted) {
                setProfile(userProfile);
                setError(null);
              }
            }
            // On TOKEN_REFRESHED, keep existing profile (don't refetch)
          } else {
            setProfile(null);
            setError(null);
          }

          if (mounted) {
            setLoading(false);
          }
        } catch (err: any) {
          // Catch AbortErrors silently - these are expected when unmounting
          if (err.name === 'AbortError') {
            console.log("Auth state change aborted (component unmounted)");
          } else {
            console.error("Auth state change error:", err);
          }
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
