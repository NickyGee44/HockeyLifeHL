"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export function useDraftRealtime(draftId: string | null) {
  const [draft, setDraft] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!draftId) {
      setDraft(null);
      setPicks([]);
      setIsConnected(false);
      return;
    }

    // Initial load
    async function loadInitialData() {
      try {
        const { data: draftData, error: draftError } = await supabase
          .from("drafts")
          .select(`
            *,
            season:seasons!drafts_season_id_fkey(id, name)
          `)
          .eq("id", draftId)
          .single();

        if (draftError) {
          console.error("Error loading draft:", draftError);
          return;
        }

        if (draftData) {
          setDraft(draftData);
        }

        const { data: picksData, error: picksError } = await supabase
          .from("draft_picks")
          .select(`
            *,
            team:teams!draft_picks_team_id_fkey(id, name, short_name, primary_color),
            player:profiles!draft_picks_player_id_fkey(id, full_name, jersey_number, position)
          `)
          .eq("draft_id", draftId)
          .order("pick_number", { ascending: true });

        if (picksError) {
          console.error("Error loading picks:", picksError);
          return;
        }

        if (picksData) {
          setPicks(picksData);
        }
      } catch (error) {
        console.error("Error in loadInitialData:", error);
      }
    }

    loadInitialData();

    // Subscribe to draft changes
    const draftChannel = supabase
      .channel(`draft:${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          console.log("Draft updated:", payload.new);
          setDraft((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "draft_picks",
          filter: `draft_id=eq.${draftId}`,
        },
        async (payload) => {
          console.log("New pick made:", payload.new);
          // Fetch the full pick data with relations
          const { data: newPick } = await supabase
            .from("draft_picks")
            .select(`
              *,
              team:teams!draft_picks_team_id_fkey(id, name, short_name, primary_color),
              player:profiles!draft_picks_player_id_fkey(id, full_name, jersey_number, position)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newPick) {
            setPicks((prev) => [...prev, newPick].sort((a, b) => a.pick_number - b.pick_number));
          }
        }
      )
      .subscribe((status) => {
        console.log("Draft channel status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(draftChannel);
    };
  }, [draftId, supabase]);

  return { draft, picks, isConnected };
}
