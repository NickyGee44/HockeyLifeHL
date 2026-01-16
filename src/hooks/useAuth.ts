"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

// Cache for profile data to avoid refetching
let profileCache: { userId: string; profile: Profile; timestamp: number } | null = null;
const CACHE_TTL = 10000; // Reduced to 10 seconds for better role updates

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the singleton client instance
  const supabase = useMemo(() => createClient(), []);

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
    let mounted = true;
    let loadingSet = false;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (authError) {
          console.error("Auth error:", authError);
          setError(authError.message);
          if (mounted && !loadingSet) {
            setLoading(false);
            loadingSet = true;
          }
          return;
        }

        setUser(user);

        if (user) {
          const profile = await fetchProfile(user.id);
          if (mounted) {
            setProfile(profile);
            if (!profile) {
              setError("Profile not found. Please contact support.");
            } else {
              setError(null);
            }
          }
        } else {
          profileCache = null;
          setProfile(null);
          setError(null);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setError("Failed to load authentication");
      } finally {
        if (mounted && !loadingSet) {
          setLoading(false);
          loadingSet = true;
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Invalidate cache on any auth state change
        profileCache = null;
        
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profile);
            if (!profile) {
              setError("Profile not found. Please contact support.");
            } else {
              setError(null);
            }
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
