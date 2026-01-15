// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Make current user owner
export async function makeCurrentUserOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", user.id);

  if (error) {
    console.error("Error making user owner:", error);
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

// Generate comprehensive mid-season test data
// 7 teams, 13 players per team, mid-season state
export async function generateTestData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only owners can generate test data" };
  }

  try {
    console.log("Starting comprehensive test data generation...");

    // 1. Create or get active season (mid-season: 7 games played out of 13)
    // First, ensure only one active season exists
    const { data: allActiveSeasons } = await supabase
      .from("seasons")
      .select("id, name, start_date")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false });

    // If multiple active seasons exist, deactivate all but the most recent
    if (allActiveSeasons && allActiveSeasons.length > 1) {
      const seasonToKeep = allActiveSeasons[0];
      const seasonsToDeactivate = allActiveSeasons.slice(1);
      const seasonIdsToDeactivate = seasonsToDeactivate.map(s => s.id);
      
      await supabase
        .from("seasons")
        .update({ 
          status: "completed",
          end_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .in("id", seasonIdsToDeactivate);
    }

    const seasonStart = new Date();
    seasonStart.setMonth(seasonStart.getMonth() - 2); // Started 2 months ago
    
    const { data: existingActiveSeason } = await supabase
      .from("seasons")
      .select("*")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    let activeSeason;
    if (existingActiveSeason) {
      activeSeason = existingActiveSeason;
      // Update to mid-season state
      await supabase
        .from("seasons")
        .update({
          current_game_count: 7,
          total_games: 42, // 7 teams, 6 games each = 42 total
          schedule_generated: true,
        })
        .eq("id", activeSeason.id);
    } else {
      const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .insert({
          name: "2025 Winter Season",
          status: "active",
          start_date: seasonStart.toISOString(),
          end_date: new Date(seasonStart.getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
          games_per_cycle: 13,
          current_game_count: 7, // Mid-season: 7 games played
          total_games: 42,
          playoff_format: "single_elimination",
          schedule_generated: true,
        })
        .select()
        .single();

      if (seasonError || !season) {
        return { error: `Failed to create season: ${seasonError?.message || "Unknown error"}` };
      }
      activeSeason = season;
    }

    if (!activeSeason) {
      return { error: "No active season found or created" };
    }

    console.log("Season ready:", activeSeason.id);

    // 2. Create 7 teams
    const teamNames = [
      { name: "Maple Leafs", short: "TOR", primary: "#003E7E", secondary: "#FFFFFF" },
      { name: "Canadiens", short: "MTL", primary: "#AF1E2D", secondary: "#FFFFFF" },
      { name: "Oilers", short: "EDM", primary: "#FF4C00", secondary: "#041E42" },
      { name: "Flames", short: "CGY", primary: "#C8102E", secondary: "#F1BE48" },
      { name: "Canucks", short: "VAN", primary: "#00205B", secondary: "#00843D" },
      { name: "Jets", short: "WPG", primary: "#041E42", secondary: "#004C97" },
      { name: "Bruins", short: "BOS", primary: "#FFB81C", secondary: "#000000" },
    ];

    const teamIds: string[] = [];
    const captainIds: string[] = [];
    
    for (const team of teamNames) {
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("id, captain_id")
        .eq("name", team.name)
        .single();

      if (existingTeam) {
        teamIds.push(existingTeam.id);
        if (existingTeam.captain_id) {
          captainIds.push(existingTeam.captain_id);
        }
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from("teams")
          .insert({
            name: team.name,
            short_name: team.short,
            primary_color: team.primary,
            secondary_color: team.secondary,
          })
          .select()
          .single();

        if (teamError) {
          console.error(`Error creating team ${team.name}:`, teamError);
        } else if (newTeam) {
          teamIds.push(newTeam.id);
        }
      }
    }

    if (teamIds.length < 7) {
      return { error: `Failed to create all teams. Only created ${teamIds.length}/7` };
    }

    console.log(`Created ${teamIds.length} teams`);

    // 3. Get all existing players (we'll work with what we have)
    // First try to get players, if not enough, get all profiles and set them as players
    let { data: allExistingPlayers } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "player")
      .limit(200);

    // If not enough players, get all profiles and use them
    if (!allExistingPlayers || allExistingPlayers.length < 13) {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .limit(200);
      
      if (allProfiles && allProfiles.length >= 13) {
        // Set non-owner profiles as players
        for (const profile of allProfiles) {
          if (profile.role !== "owner" && profile.role !== "captain") {
            await supabase
              .from("profiles")
              .update({ role: "player" })
              .eq("id", profile.id);
          }
        }
        allExistingPlayers = allProfiles.filter(p => p.role !== "owner");
      }
    }

    if (!allExistingPlayers || allExistingPlayers.length < 13) {
      return { 
        error: `Not enough players in database. Need at least 13 players (ideally 91 for 7 teams × 13 players), found ${allExistingPlayers?.length || 0}. 

To create test players:
1. Register multiple accounts manually, OR
2. Use Supabase Admin API to create auth users and profiles programmatically.

For now, the system will work with ${allExistingPlayers?.length || 0} players, but you'll have fewer players per team.` 
      };
    }

    // Use first 91 players (7 teams × 13 players)
    const playersToUse = allExistingPlayers.slice(0, Math.min(91, allExistingPlayers.length));
    const playersPerTeam = Math.floor(playersToUse.length / teamIds.length);
    
    console.log(`Using ${playersToUse.length} players, ${playersPerTeam} per team`);

    // 4. Assign players to teams and update profiles
    const positions = ["C", "LW", "RW", "D", "G"];
    const allPlayerIds: string[] = [];
    
    for (let i = 0; i < teamIds.length; i++) {
      const teamId = teamIds[i];
      const startIdx = i * playersPerTeam;
      const endIdx = Math.min(startIdx + playersPerTeam, playersToUse.length);
      const teamPlayers = playersToUse.slice(startIdx, endIdx);

      if (teamPlayers.length === 0) continue;

      // Update player profiles with jersey numbers and positions
      for (let j = 0; j < teamPlayers.length; j++) {
        const player = teamPlayers[j];
        const jerseyNumber = (j % 99) + 1;
        const position = j === 0 ? "G" : positions[(j - 1) % (positions.length - 1)]; // First is goalie
        
        await supabase
          .from("profiles")
          .update({
            jersey_number: jerseyNumber,
            position: position,
          })
          .eq("id", player.id);

        // Add to roster
        const { data: existingRoster } = await supabase
          .from("team_rosters")
          .select("id")
          .eq("team_id", teamId)
          .eq("player_id", player.id)
          .eq("season_id", activeSeason.id)
          .single();

        if (!existingRoster) {
          await supabase
            .from("team_rosters")
            .insert({
              team_id: teamId,
              player_id: player.id,
              season_id: activeSeason.id,
              is_goalie: j === 0,
            });
        }

        allPlayerIds.push(player.id);
      }

      // Set first player as captain and make them captain role
      if (teamPlayers.length > 0) {
        const captainId = teamPlayers[0].id;
        captainIds.push(captainId);
        
        await supabase
          .from("teams")
          .update({ captain_id: captainId })
          .eq("id", teamId);

        await supabase
          .from("profiles")
          .update({ role: "captain" })
          .eq("id", captainId);
      }
    }

    console.log("Players assigned to teams");

    // 5. Approve all players
    for (const playerId of allPlayerIds) {
      const { data: existingApproval } = await supabase
        .from("player_approvals")
        .select("id")
        .eq("player_id", playerId)
        .single();

      if (!existingApproval) {
        await supabase
          .from("player_approvals")
          .insert({
            player_id: playerId,
            approved_by: user.id,
            approval_method: "owner",
          });
      }
    }

    console.log("All players approved");

    // 6. Opt all players in as full-time
    for (const playerId of allPlayerIds) {
      const { data: existingOptIn } = await supabase
        .from("season_opt_ins")
        .select("id")
        .eq("player_id", playerId)
        .eq("season_id", activeSeason.id)
        .single();

      if (!existingOptIn) {
        await supabase
          .from("season_opt_ins")
          .insert({
            player_id: playerId,
            season_id: activeSeason.id,
            opt_in_type: "full_time",
          });
      }
    }

    console.log("All players opted in");

    // 7. Create completed games (25 games - mid-season)
    const completedGames: string[] = [];
    const gameDates: Date[] = [];
    const today = new Date();
    
    // Generate dates for past 8 weeks (one game per week, some weeks have multiple)
    for (let week = 8; week >= 1; week--) {
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() - (week * 7));
      gameDate.setHours(19, 0, 0, 0); // 7 PM
      gameDates.push(gameDate);
      
      // Some weeks have 2 games
      if (week <= 4) {
        const secondGame = new Date(gameDate);
        secondGame.setDate(secondGame.getDate() + 2);
        gameDates.push(secondGame);
      }
    }

    // Sort dates ascending
    gameDates.sort((a, b) => a.getTime() - b.getTime());
    const gamesToCreate = Math.min(25, gameDates.length);

    // Create matchups (round-robin style)
    const matchups: Array<{ home: number; away: number }> = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        matchups.push({ home: i, away: j });
        matchups.push({ home: j, away: i }); // Reverse
      }
    }

    // Shuffle matchups
    for (let i = matchups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
    }

    for (let i = 0; i < gamesToCreate; i++) {
      const matchup = matchups[i % matchups.length];
      const homeTeamId = teamIds[matchup.home];
      const awayTeamId = teamIds[matchup.away];
      
      // Realistic scores (2-8 goals per team)
      const homeScore = Math.floor(Math.random() * 7) + 2;
      const awayScore = Math.floor(Math.random() * 7) + 2;
      
      // Some games go to OT (tie, then one team wins)
      let finalHomeScore = homeScore;
      let finalAwayScore = awayScore;
      if (Math.random() > 0.7) {
        // OT game
        if (Math.random() > 0.5) {
          finalHomeScore = homeScore + 1;
        } else {
          finalAwayScore = awayScore + 1;
        }
      }

      const gameDate = gameDates[i] || new Date(Date.now() - (gamesToCreate - i) * 7 * 24 * 60 * 60 * 1000);

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          season_id: activeSeason.id,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          scheduled_at: gameDate.toISOString(),
          status: "completed",
          home_score: finalHomeScore,
          away_score: finalAwayScore,
          home_captain_verified: true,
          away_captain_verified: true,
          location: ["Main Arena", "Ice Palace", "Community Rink"][i % 3],
        })
        .select()
        .single();

      if (game && !gameError) {
        completedGames.push(game.id);

        // Get rosters
        const { data: homeRoster } = await supabase
          .from("team_rosters")
          .select("player_id, is_goalie")
          .eq("team_id", homeTeamId)
          .eq("season_id", activeSeason.id);

        const { data: awayRoster } = await supabase
          .from("team_rosters")
          .select("player_id, is_goalie")
          .eq("team_id", awayTeamId)
          .eq("season_id", activeSeason.id);

        // Add player stats (6-10 players per team get stats)
        if (homeRoster) {
          const skaters = homeRoster.filter(p => !p.is_goalie).slice(0, 13);
          const playersWithStats = skaters.slice(0, Math.floor(Math.random() * 5) + 6); // 6-10 players
          
          for (const player of playersWithStats) {
            const goals = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
            const assists = Math.random() > 0.4 ? Math.floor(Math.random() * 4) : 0;
            
            if (goals > 0 || assists > 0) {
              await supabase
                .from("player_stats")
                .insert({
                  game_id: game.id,
                  player_id: player.player_id,
                  team_id: homeTeamId,
                  season_id: activeSeason.id,
                  goals,
                  assists,
                });
            }
          }
        }

        if (awayRoster) {
          const skaters = awayRoster.filter(p => !p.is_goalie).slice(0, 13);
          const playersWithStats = skaters.slice(0, Math.floor(Math.random() * 5) + 6);
          
          for (const player of playersWithStats) {
            const goals = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
            const assists = Math.random() > 0.4 ? Math.floor(Math.random() * 4) : 0;
            
            if (goals > 0 || assists > 0) {
              await supabase
                .from("player_stats")
                .insert({
                  game_id: game.id,
                  player_id: player.player_id,
                  team_id: awayTeamId,
                  season_id: activeSeason.id,
                  goals,
                  assists,
                });
            }
          }
        }

        // Add goalie stats
        if (homeRoster) {
          const homeGoalie = homeRoster.find(r => r.is_goalie);
          if (homeGoalie) {
            const saves = Math.floor(Math.random() * 25) + 15;
            await supabase
              .from("goalie_stats")
              .insert({
                game_id: game.id,
                player_id: homeGoalie.player_id,
                team_id: homeTeamId,
                season_id: activeSeason.id,
                goals_against: finalAwayScore,
                saves,
                shutout: finalAwayScore === 0,
              });
          }
        }

        if (awayRoster) {
          const awayGoalie = awayRoster.find(r => r.is_goalie);
          if (awayGoalie) {
            const saves = Math.floor(Math.random() * 25) + 15;
            await supabase
              .from("goalie_stats")
              .insert({
                game_id: game.id,
                player_id: awayGoalie.player_id,
                team_id: awayTeamId,
                season_id: activeSeason.id,
                goals_against: finalHomeScore,
                saves,
                shutout: finalHomeScore === 0,
              });
          }
        }
      }
    }

    console.log(`Created ${completedGames.length} completed games with stats`);

    // 8. Create upcoming games (8 games)
    const upcomingDates: Date[] = [];
    for (let i = 1; i <= 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 7)); // Weekly games
      date.setHours(19, 0, 0, 0);
      upcomingDates.push(date);
    }

    for (let i = 0; i < upcomingDates.length; i++) {
      const matchup = matchups[(completedGames.length + i) % matchups.length];
      const homeTeamId = teamIds[matchup.home];
      const awayTeamId = teamIds[matchup.away];

      await supabase
        .from("games")
        .insert({
          season_id: activeSeason.id,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          scheduled_at: upcomingDates[i].toISOString(),
          status: "scheduled",
          location: ["Main Arena", "Ice Palace", "Community Rink", "Sports Complex"][i % 4],
        });
    }

    console.log("Created 8 upcoming games");

    // 9. Create games pending verification (3 games)
    for (let i = 0; i < 3; i++) {
      const matchup = matchups[(completedGames.length + upcomingDates.length + i) % matchups.length];
      const homeTeamId = teamIds[matchup.home];
      const awayTeamId = teamIds[matchup.away];
      
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() - (i + 1)); // Yesterday, 2 days ago, 3 days ago
      gameDate.setHours(19, 0, 0, 0);

      const homeScore = Math.floor(Math.random() * 6) + 2;
      const awayScore = Math.floor(Math.random() * 6) + 2;

      await supabase
        .from("games")
        .insert({
          season_id: activeSeason.id,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          scheduled_at: gameDate.toISOString(),
          status: "completed",
          home_score: homeScore,
          away_score: awayScore,
          home_captain_verified: i === 0, // First one has home verified
          away_captain_verified: false, // None have away verified yet
          location: "Main Arena",
        });
    }

    console.log("Created 3 games pending verification");

    // 10. Create player ratings for draft
    for (const playerId of allPlayerIds) {
      // Calculate realistic stats for rating
      const gamesPlayed = Math.floor(Math.random() * 7) + 1; // 1-7 games
      const totalPoints = Math.floor(Math.random() * 15); // 0-14 points
      const attendance = 0.7 + Math.random() * 0.3; // 70-100%

      // Simple rating calculation
      let rating = "C";
      const pointsPerGame = totalPoints / Math.max(gamesPlayed, 1);
      if (pointsPerGame > 1.5 && attendance > 0.85) rating = "A";
      else if (pointsPerGame > 1.0 && attendance > 0.8) rating = "B+";
      else if (pointsPerGame > 0.7) rating = "B";
      else if (pointsPerGame > 0.4) rating = "C+";
      else if (pointsPerGame > 0.2) rating = "C";
      else rating = "D";

      const { data: existingRating } = await supabase
        .from("player_ratings")
        .select("id")
        .eq("player_id", playerId)
        .eq("season_id", activeSeason.id)
        .single();

      if (!existingRating) {
        await supabase
          .from("player_ratings")
          .insert({
            player_id: playerId,
            season_id: activeSeason.id,
            rating: rating as any,
            games_played: gamesPlayed,
            attendance_rate: attendance,
            points_per_game: pointsPerGame,
          });
      }
    }

    console.log("Created player ratings");

    // 11. Create completed draft (from before season started)
    const { data: existingDraft } = await supabase
      .from("drafts")
      .select("id")
      .eq("season_id", activeSeason.id)
      .eq("cycle_number", 1)
      .single();

    let draftId: string | null = null;
    if (!existingDraft) {
      const { data: draft, error: draftError } = await supabase
        .from("drafts")
        .insert({
          season_id: activeSeason.id,
          cycle_number: 1,
          status: "completed",
          current_pick: 91, // All picks done
          completed_at: new Date(seasonStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week before season
        })
        .select()
        .single();

      if (draft && !draftError) {
        draftId = draft.id;
        
        // Create draft picks (simplified - assign players to teams in order)
        let pickNumber = 1;
        for (let round = 1; round <= 13; round++) {
          for (let teamIdx = 0; teamIdx < teamIds.length; teamIdx++) {
            const teamId = teamIds[teamIdx];
            const playerIdx = (round - 1) * teamIds.length + teamIdx;
            if (playerIdx < allPlayerIds.length) {
              const playerId = allPlayerIds[playerIdx];
              
              await supabase
                .from("draft_picks")
                .insert({
                  draft_id: draftId,
                  team_id: teamId,
                  player_id: playerId,
                  pick_number: pickNumber++,
                  round: round,
                });
            }
          }
        }
      }
    } else {
      draftId = existingDraft.id;
    }

    console.log("Draft created/completed");

    // 12. Create articles (game recaps, weekly wraps)
    const articles = [
      {
        title: "Season Opener: Maple Leafs Edge Canadiens in Thriller",
        content: "The 2025 Winter Season kicked off with an absolute barnburner as the Maple Leafs and Canadiens went toe-to-toe in a 5-4 overtime thriller. The game featured end-to-end action, multiple lead changes, and a dramatic OT winner that sent the home crowd into a frenzy.\n\nTop performers included several multi-point games, setting the tone for what promises to be an exciting season ahead. The intensity was palpable from the opening faceoff, and both teams left everything on the ice.",
        type: "game_recap" as const,
        game_id: completedGames[0] || null,
        season_id: activeSeason.id,
        published: true,
        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: "Week 2 Recap: Tight Races and Standout Performances",
        content: "Week 2 of the season saw some incredible individual performances and tight team battles. The standings are already starting to take shape, with several teams jockeying for position early in the season.\n\nGoalie performances have been outstanding, with multiple shutouts already recorded. The offensive firepower across the league is impressive, with several players already in double-digit points. The parity in the league is evident, as no team has pulled away from the pack yet.",
        type: "weekly_wrap" as const,
        season_id: activeSeason.id,
        published: true,
        published_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: "Mid-Season Update: Playoff Picture Taking Shape",
        content: "We're now past the halfway point of the season, and the playoff race is heating up! Several teams are separated by just a few points, making every game crucial.\n\nIndividual stat leaders are emerging, with some players putting up impressive numbers. The goalie race is particularly tight, with several netminders posting excellent save percentages.\n\nAs we head into the final stretch, every point matters. The battle for playoff positioning is intense, and we can expect some dramatic finishes in the coming weeks!",
        type: "weekly_wrap" as const,
        season_id: activeSeason.id,
        published: true,
        published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: "Draft Grades: Cycle 1 Analysis",
        content: "The first cycle draft is complete, and all teams have assembled their rosters. Here's a quick breakdown:\n\n**Maple Leafs (A-):** Strong core with excellent depth. Captain made smart picks throughout.\n\n**Canadiens (B+):** Solid team with good balance. Could use more scoring depth.\n\n**Oilers (A):** Excellent draft. Strong at every position.\n\n**Flames (B):** Good team, but questions about goaltending depth.\n\n**Canucks (B+):** Well-rounded roster with good potential.\n\n**Jets (B):** Solid picks, but may have reached on a few.\n\n**Bruins (A-):** Strong draft, excellent value picks in later rounds.",
        type: "draft_grades" as const,
        season_id: activeSeason.id,
        published: true,
        published_at: new Date(seasonStart.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const article of articles) {
      const { data: existingArticle } = await supabase
        .from("articles")
        .select("id")
        .eq("title", article.title)
        .single();

      if (!existingArticle) {
        await supabase
          .from("articles")
          .insert(article);
      }
    }

    console.log("Created articles");

    // 13. Create payments (some paid, some pending)
    const paymentMethods = ["cash", "etransfer", "credit_card", "cheque"];
    for (let i = 0; i < allPlayerIds.length; i++) {
      const playerId = allPlayerIds[i];
      const hasPaid = Math.random() > 0.3; // 70% have paid
      
      if (hasPaid) {
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("player_id", playerId)
          .eq("season_id", activeSeason.id)
          .single();

        if (!existingPayment) {
          const paymentDate = new Date();
          paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 60)); // Paid in last 60 days

          await supabase
            .from("payments")
            .insert({
              player_id: playerId,
              season_id: activeSeason.id,
              amount: 250.00,
              payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
              status: "completed",
              payment_date: paymentDate.toISOString(),
              entered_by: user.id,
            });
        }
      }
    }

    console.log("Created payments");

    // 14. Create some suspensions (2-3 players)
    const suspendedPlayers = allPlayerIds.slice(0, Math.min(3, Math.floor(allPlayerIds.length * 0.03)));
    for (let i = 0; i < suspendedPlayers.length; i++) {
      const playerId = suspendedPlayers[i];
      const { data: existingSuspension } = await supabase
        .from("suspensions")
        .select("id")
        .eq("player_id", playerId)
        .is("end_date", null) // Active suspension
        .single();

      if (!existingSuspension) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 14)); // Started 0-14 days ago
        const gamesRemaining = Math.floor(Math.random() * 3) + 1; // 1-3 games

        await supabase
          .from("suspensions")
          .insert({
            player_id: playerId,
            reason: ["Fighting", "Unsportsmanlike conduct", "Game misconduct"][i % 3],
            games_remaining: gamesRemaining,
            start_date: startDate.toISOString(),
            issued_by: user.id,
          });
      }
    }

    console.log("Created suspensions");

    // 15. Create team messages (from captains)
    for (let i = 0; i < captainIds.length; i++) {
      const captainId = captainIds[i];
      const teamId = teamIds[i];
      
      if (!captainId || !teamId) continue;

      const messages = [
        {
          team_id: teamId,
          season_id: activeSeason.id,
          sent_by: captainId,
          message_type: "game_reminder" as const,
          subject: "Game This Saturday - 7 PM",
          message: "Hey team, just a reminder we have a game this Saturday at 7 PM at Main Arena. Please confirm your availability. Let's bring the energy!",
          is_urgent: false,
        },
        {
          team_id: teamId,
          season_id: activeSeason.id,
          sent_by: captainId,
          message_type: "announcement" as const,
          subject: "Team Practice This Week",
          message: "We're having an optional practice this Thursday at 8 PM. All are welcome. Focus on power play and penalty kill.",
          is_urgent: false,
        },
      ];

      for (const msg of messages) {
        const { data: existingMsg } = await supabase
          .from("team_messages")
          .select("id")
          .eq("team_id", teamId)
          .eq("subject", msg.subject)
          .single();

        if (!existingMsg) {
          await supabase
            .from("team_messages")
            .insert(msg);
        }
      }
    }

    console.log("Created team messages");

    // 16. Create player availability (some players marked unavailable for upcoming games)
    const { data: upcomingGames } = await supabase
      .from("games")
      .select("id, home_team_id, away_team_id")
      .eq("season_id", activeSeason.id)
      .eq("status", "scheduled")
      .limit(5);

    if (upcomingGames) {
      for (const game of upcomingGames) {
        // Get rosters for both teams
        const { data: homeRoster } = await supabase
          .from("team_rosters")
          .select("player_id")
          .eq("team_id", game.home_team_id)
          .eq("season_id", activeSeason.id);

        const { data: awayRoster } = await supabase
          .from("team_rosters")
          .select("player_id")
          .eq("team_id", game.away_team_id)
          .eq("season_id", activeSeason.id);

        const allGamePlayers = [
          ...(homeRoster?.map(r => r.player_id) || []),
          ...(awayRoster?.map(r => r.player_id) || []),
        ];

        // Mark 10-20% as unavailable
        const unavailableCount = Math.floor(allGamePlayers.length * (0.1 + Math.random() * 0.1));
        const unavailablePlayers = allGamePlayers.slice(0, unavailableCount);

        for (const playerId of unavailablePlayers) {
          const { data: existingAvail } = await supabase
            .from("player_availability")
            .select("id")
            .eq("player_id", playerId)
            .eq("game_id", game.id)
            .single();

          if (!existingAvail) {
            await supabase
              .from("player_availability")
              .insert({
                player_id: playerId,
                team_id: homeRoster?.some(r => r.player_id === playerId) ? game.home_team_id : game.away_team_id,
                season_id: activeSeason.id,
                game_id: game.id,
                status: Math.random() > 0.5 ? "unavailable" : "maybe",
                reason: ["Work", "Family", "Injury", "Other commitment"][Math.floor(Math.random() * 4)],
              });
          }
        }
      }
    }

    console.log("Created player availability");

    // Update season game count
    await supabase
      .from("seasons")
      .update({ current_game_count: completedGames.length })
      .eq("id", activeSeason.id);

    // Revalidate all paths
    const pathsToRevalidate = [
      "/admin",
      "/dashboard",
      "/captain",
      "/standings",
      "/schedule",
      "/stats",
      "/teams",
      "/news",
      "/dashboard/team",
      "/dashboard/stats",
      "/dashboard/schedule",
      "/captain/team",
    ];

    for (const path of pathsToRevalidate) {
      revalidatePath(path);
    }

    console.log("Test data generation complete!");

    return { 
      success: true, 
      message: `Comprehensive test data generated! Created: ${teamIds.length} teams, ${allPlayerIds.length} players, ${completedGames.length} completed games, 8 upcoming games, 3 pending verification, articles, payments, and more. The site is now in a realistic mid-season state.` 
    };
  } catch (error: any) {
    console.error("Error generating test data:", error);
    return { error: error.message || "Failed to generate test data" };
  }
}

// Remove all test data
export async function removeAllTestData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only owners can remove test data" };
  }

  try {
    // Delete in order to respect foreign key constraints
    await supabase.from("player_availability").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("team_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("goalie_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("player_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("draft_picks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("drafts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("player_ratings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("team_rosters").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("season_opt_ins").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("player_approvals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("suspensions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("articles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("invite_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Reset teams (remove captains but keep teams)
    await supabase.from("teams").update({ captain_id: null }).neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Reset player roles (set captains back to players)
    await supabase
      .from("profiles")
      .update({ role: "player" })
      .eq("role", "captain");
    
    // Reset seasons (set to completed)
    await supabase
      .from("seasons")
      .update({ status: "completed", current_game_count: 0 })
      .in("status", ["active", "playoffs", "draft"]);

    const pathsToRevalidate = [
      "/admin",
      "/dashboard",
      "/captain",
      "/standings",
      "/schedule",
      "/stats",
      "/teams",
      "/news",
    ];

    for (const path of pathsToRevalidate) {
      revalidatePath(path);
    }

    return { success: true, message: "All test data removed successfully!" };
  } catch (error: any) {
    console.error("Error removing test data:", error);
    return { error: error.message || "Failed to remove test data" };
  }
}
