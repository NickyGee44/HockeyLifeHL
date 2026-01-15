"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

// Cache for profile data to avoid refetching
let profileCache: { userId: string; profile: Profile; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get the singleton client instance
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    if (profileCache && 
        profileCache.userId === userId && 
        Date.now() - profileCache.timestamp < CACHE_TTL) {
      return profileCache.profile;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      profileCache = { userId, profile: data, timestamp: Date.now() };
    }
    
    return data;
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!mounted) return;
        setUser(user);

        if (user) {
          const profile = await fetchProfile(user.id);
          if (mounted) setProfile(profile);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);

        if (session?.user) {
          // Invalidate cache on auth change
          profileCache = null;
          const profile = await fetchProfile(session.user.id);
          if (mounted) setProfile(profile);
        } else {
          profileCache = null;
          setProfile(null);
        }

        setLoading(false);
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
    isLoggedIn: !!user,
    isOwner: profile?.role === "owner",
    isCaptain: profile?.role === "captain" || profile?.role === "owner",
    isPlayer: !!profile,
  }), [user, profile, loading]);
}
