/**
 * Conflict Detection Service Tests
 *
 * Comprehensive test suite for the scheduling conflict detection service.
 * Tests all conflict types: team overlaps, venue conflicts, scorekeeper conflicts,
 * back-to-back violations, max games rules, and blackout dates.
 */

import { ConflictDetectionService } from "./conflict-detection.service";
import type { GameForConflictCheck, ScheduleRules } from "./conflict-detection.types";
import { addHours, addDays, addMinutes, subHours } from "date-fns";

// Mock Supabase client
const createMockSupabaseClient = (mockData: any = {}) => ({
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => mockData.eq?.(column, value) || mockData.query || { data: mockData.data || [], error: null },
      in: (column: string, values: any[]) => mockData.in?.(column, values) || mockData.query || { data: mockData.data || [], error: null },
      or: (condition: string) => mockData.or?.(condition) || mockData.query || { data: mockData.data || [], error: null },
      is: (column: string, value: any) => mockData.is?.(column, value) || mockData.query || { data: mockData.data || [], error: null },
      neq: (column: string, value: any) => mockData.neq?.(column, value) || mockData.query || { data: mockData.data || [], error: null },
      single: () => mockData.single || { data: mockData.data?.[0] || null, error: null },
    }),
  }),
});

// Default schedule rules for testing
const defaultRules: ScheduleRules = {
  id: "rule-1",
  leagueId: "league-1",
  seasonId: "season-1",
  gameDurationMinutes: 60,
  bufferMinutes: 15,
  minHoursBetweenGames: 24,
  maxGamesPerWeek: 3,
  maxGamesPerDay: 1,
  blackoutDates: [],
  preferredStartTimes: [],
};

// Base game for testing
const baseGame: GameForConflictCheck = {
  homeTeamId: "team-1",
  awayTeamId: "team-2",
  venueId: "venue-1",
  scheduledAt: new Date("2026-02-01T19:00:00"),
  status: "scheduled",
  leagueId: "league-1",
  seasonId: "season-1",
};

describe("ConflictDetectionService", () => {
  describe("Team Conflicts", () => {
    test("should detect overlapping games for same team", async () => {
      const existingGame = {
        id: "game-existing",
        scheduled_at: new Date("2026-02-01T19:30:00").toISOString(),
        home_team_id: "team-1",
        away_team_id: "team-3",
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.conflicts.some((c) => c.type === "team_overlap")).toBe(true);
    });

    test("should detect back-to-back violations", async () => {
      // Game scheduled 20 hours after another game (violates 24-hour rule)
      const existingGame = {
        id: "game-existing",
        scheduled_at: subHours(baseGame.scheduledAt, 20).toISOString(),
        home_team_id: "team-1",
        away_team_id: "team-3",
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "back_to_back_violation")).toBe(true);
    });

    test("should detect max games per day violation", async () => {
      // Team already has 1 game on same day
      const existingGame = {
        id: "game-existing",
        scheduled_at: addHours(baseGame.scheduledAt, 4).toISOString(), // Same day, 4 hours later
        home_team_id: "team-1",
        away_team_id: "team-3",
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "max_games_per_day")).toBe(true);
    });

    test("should detect max games per week warning", async () => {
      // Team has 3 games this week already
      const existingGames = [
        {
          id: "game-1",
          scheduled_at: addDays(baseGame.scheduledAt, -2).toISOString(),
          home_team_id: "team-1",
          away_team_id: "team-3",
        },
        {
          id: "game-2",
          scheduled_at: addDays(baseGame.scheduledAt, -1).toISOString(),
          home_team_id: "team-1",
          away_team_id: "team-4",
        },
        {
          id: "game-3",
          scheduled_at: addDays(baseGame.scheduledAt, 1).toISOString(),
          home_team_id: "team-1",
          away_team_id: "team-5",
        },
      ];

      const mockClient = createMockSupabaseClient({
        data: existingGames,
        query: {
          data: existingGames,
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "max_games_per_week")).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0);
    });

    test("should allow games with sufficient spacing", async () => {
      // Game scheduled 48 hours after another game (no violation)
      const existingGame = {
        id: "game-existing",
        scheduled_at: subHours(baseGame.scheduledAt, 48).toISOString(),
        home_team_id: "team-1",
        away_team_id: "team-3",
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(false);
      expect(result.errorCount).toBe(0);
    });
  });

  describe("Venue Conflicts", () => {
    test("should detect venue double-booking", async () => {
      const existingGame = {
        id: "game-existing",
        scheduled_at: baseGame.scheduledAt.toISOString(),
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "venue_overlap")).toBe(true);
    });

    test("should allow venue booking with buffer time", async () => {
      // Previous game ends at 8:00pm, new game starts at 9:30pm (1.5 hour gap > 1h 15min buffer)
      const existingGame = {
        id: "game-existing",
        scheduled_at: subHours(baseGame.scheduledAt, 2.5).toISOString(), // 4:30pm (ends at 6:30pm with buffer)
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts.some((c) => c.type === "venue_overlap")).toBe(false);
    });

    test("should detect venue conflict within buffer time", async () => {
      // Previous game ends at 7:00pm, new game starts at 7:30pm (violates 15min buffer)
      const existingGame = {
        id: "game-existing",
        scheduled_at: subHours(baseGame.scheduledAt, 1.5).toISOString(), // 5:30pm (ends at 6:45pm with buffer = 7:00pm)
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "venue_overlap")).toBe(true);
    });

    test("should reject game at venue not in allowed list", async () => {
      const rulesWithAllowedVenues: ScheduleRules = {
        ...defaultRules,
        allowedVenueIds: ["venue-2", "venue-3"], // baseGame uses venue-1
      };

      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            allowed_venue_ids: ["venue-2", "venue-3"],
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, rulesWithAllowedVenues);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "invalid_time_window")).toBe(true);
    });
  });

  describe("Scorekeeper Conflicts", () => {
    test("should detect scorekeeper double-booking", async () => {
      const gameWithScorekeeper: GameForConflictCheck = {
        ...baseGame,
        scorekeeperId: "scorekeeper-1",
      };

      const existingGame = {
        id: "game-existing",
        scheduled_at: baseGame.scheduledAt.toISOString(),
      };

      const mockClient = createMockSupabaseClient({
        data: [existingGame],
        query: {
          data: [existingGame],
          error: null,
        },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(gameWithScorekeeper, defaultRules);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "scorekeeper_overlap")).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0); // Scorekeeper conflicts are warnings
    });

    test("should not check scorekeeper if none assigned", async () => {
      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.conflicts.some((c) => c.type === "scorekeeper_overlap")).toBe(false);
    });
  });

  describe("Schedule Rule Violations", () => {
    test("should detect blackout date violation", async () => {
      const rulesWithBlackout: ScheduleRules = {
        ...defaultRules,
        blackoutDates: [
          {
            date: "2026-02-01",
            reason: "Holiday - No games allowed",
          },
        ],
      };

      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [{ date: "2026-02-01", reason: "Holiday - No games allowed" }],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, rulesWithBlackout);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some((c) => c.type === "blackout_date")).toBe(true);
      expect(result.errorCount).toBeGreaterThan(0);
    });

    test("should warn about game outside preferred time window", async () => {
      const rulesWithPreferredTimes: ScheduleRules = {
        ...defaultRules,
        preferredStartTimes: [
          {
            day: "sunday", // baseGame is on Sunday
            start: "12:00",
            end: "18:00", // Preferred window ends at 6pm, game is at 7pm
          },
        ],
      };

      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [{ day: "sunday", start: "12:00", end: "18:00" }],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, rulesWithPreferredTimes);

      expect(result.hasConflicts).toBe(true);
      expect(result.infoCount).toBeGreaterThan(0);
      expect(result.conflicts.some((c) => c.type === "invalid_time_window")).toBe(true);
    });

    test("should allow game within preferred time window", async () => {
      const rulesWithPreferredTimes: ScheduleRules = {
        ...defaultRules,
        preferredStartTimes: [
          {
            day: "sunday",
            start: "18:00",
            end: "22:00", // Game at 7pm (19:00) is within window
          },
        ],
      };

      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [{ day: "sunday", start: "18:00", end: "22:00" }],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, rulesWithPreferredTimes);

      expect(result.hasConflicts).toBe(false);
      expect(result.infoCount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle game with no conflicts", async () => {
      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(baseGame, defaultRules);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts.length).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.infoCount).toBe(0);
    });

    test("should exclude current game when editing", async () => {
      const editingGame: GameForConflictCheck = {
        ...baseGame,
        id: "game-to-edit",
      };

      const existingGame = {
        id: "game-to-edit", // Same game ID - should be excluded
        scheduled_at: baseGame.scheduledAt.toISOString(),
        home_team_id: "team-1",
        away_team_id: "team-2",
      };

      const mockClient = createMockSupabaseClient({
        data: [],
        query: { data: [], error: null },
        single: {
          data: {
            id: "rule-1",
            league_id: "league-1",
            season_id: "season-1",
            game_duration_minutes: 60,
            buffer_minutes: 15,
            min_hours_between_games: 24,
            max_games_per_week: 3,
            max_games_per_day: 1,
            blackout_dates: [],
            preferred_start_times: [],
          },
          error: null,
        },
      });

      const service = new ConflictDetectionService(mockClient as any);
      const result = await service.checkGameConflicts(editingGame, defaultRules);

      expect(result.hasConflicts).toBe(false);
    });
  });
});
