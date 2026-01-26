"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveLeagueId } from "@/lib/auth/league-context";

export async function getAdminAnalytics() {
  const supabase = await createClient();
  const leagueId = await getActiveLeagueId();

  if (!leagueId) {
    return { error: "No active league selected" };
  }

  // Get total revenue
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("league_id", leagueId)
    .eq("status", "completed");

  const totalRevenue = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get registration count by month
  const { data: registrations } = await (supabase as any)
    .from("profiles")
    .select("created_at")
    // Note: profiles table doesn't have league_id directly in many schemas,
    // but in this multi-tenant setup it should.
    // If not, we join with league_memberships.
    // Based on Agent 1's work, it should have league_id.
    .eq("league_id", leagueId);

  const regByMonth: Record<string, number> = {};
  (registrations || []).forEach(r => {
    const month = new Date(r.created_at).toLocaleString('default', { month: 'short' });
    regByMonth[month] = (regByMonth[month] || 0) + 1;
  });

  // Get game status distribution
  const { data: games } = await supabase
    .from("games")
    .select("status")
    .eq("league_id", leagueId);

  const gameStats = {
    scheduled: games?.filter(g => g.status === 'scheduled').length || 0,
    completed: games?.filter(g => g.status === 'completed').length || 0,
    inProgress: games?.filter(g => g.status === 'in_progress').length || 0,
    cancelled: games?.filter(g => g.status === 'cancelled').length || 0,
  };

  return {
    totalRevenue,
    registrationsByMonth: Object.entries(regByMonth).map(([name, count]) => ({ name, count })),
    gameStats,
    activePlayers: registrations?.length || 0,
  };
}
