'use server';

import { createClient } from '@/lib/supabase/server';

export type StaffAssignment = {
  id: string;
  game_id: string;
  league_id: string;
  assigned_at: string | null;
  checked_in_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  game: {
    id: string;
    scheduled_at: string | null;
    location: string | null;
    status: string | null;
    home_team: { id: string; name: string } | null;
    away_team: { id: string; name: string } | null;
    home_score: number | null;
    away_score: number | null;
  } | null;
};

export type StaffDashboardData = {
  isStaff: boolean;
  upcoming: StaffAssignment[];
  recent: StaffAssignment[];
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    upcomingCount: number;
  };
  assignmentDates: string[]; // ISO date strings for calendar
};

export async function getStaffDashboardData(): Promise<StaffDashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isStaff: false,
      upcoming: [],
      recent: [],
      stats: { totalAssignments: 0, completedAssignments: 0, upcomingCount: 0 },
      assignmentDates: [],
    };
  }

  // Check if user is a scorekeeper in any league
  const { data: scorekeeperEntries } = await (supabase.from('league_scorekeepers') as any)
    .select('id, league_id')
    .eq('scorekeeper_id', user.id)
    .eq('is_active', true);

  if (!scorekeeperEntries || scorekeeperEntries.length === 0) {
    return {
      isStaff: false,
      upcoming: [],
      recent: [],
      stats: { totalAssignments: 0, completedAssignments: 0, upcomingCount: 0 },
      assignmentDates: [],
    };
  }

  const now = new Date().toISOString();

  // Fetch upcoming assignments (games not yet completed, ordered by date)
  const { data: upcoming } = await (supabase.from('game_scorekeeper_assignments') as any)
    .select(
      `id, game_id, league_id, assigned_at, checked_in_at, started_at, completed_at, notes,
       game:games!game_id(id, scheduled_at, location, status, home_score, away_score,
         home_team:teams!home_team_id(id, name),
         away_team:teams!away_team_id(id, name)
       )`
    )
    .eq('scorekeeper_id', user.id)
    .is('completed_at', null)
    .order('assigned_at', { ascending: true })
    .limit(10);

  // Fetch recent completed assignments
  const { data: recent } = await (supabase.from('game_scorekeeper_assignments') as any)
    .select(
      `id, game_id, league_id, assigned_at, checked_in_at, started_at, completed_at, notes,
       game:games!game_id(id, scheduled_at, location, status, home_score, away_score,
         home_team:teams!home_team_id(id, name),
         away_team:teams!away_team_id(id, name)
       )`
    )
    .eq('scorekeeper_id', user.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5);

  // Get all assignments for stats count
  const { count: totalCount } = await (supabase.from('game_scorekeeper_assignments') as any)
    .select('id', { count: 'exact', head: true })
    .eq('scorekeeper_id', user.id);

  const { count: completedCount } = await (supabase.from('game_scorekeeper_assignments') as any)
    .select('id', { count: 'exact', head: true })
    .eq('scorekeeper_id', user.id)
    .not('completed_at', 'is', null);

  // Collect assignment dates for calendar (next 30 days)
  const upcomingList: StaffAssignment[] = upcoming || [];
  const assignmentDates = upcomingList
    .filter((a: StaffAssignment) => a.game?.scheduled_at)
    .map((a: StaffAssignment) => a.game!.scheduled_at!.split('T')[0]);

  return {
    isStaff: true,
    upcoming: upcomingList,
    recent: recent || [],
    stats: {
      totalAssignments: totalCount ?? 0,
      completedAssignments: completedCount ?? 0,
      upcomingCount: upcomingList.length,
    },
    assignmentDates: [...new Set(assignmentDates)],
  };
}
