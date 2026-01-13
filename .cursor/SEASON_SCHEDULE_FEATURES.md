# Season Schedule Generation Features

## Overview
Enhanced season creation with schedule management capabilities including total games specification, playoff format selection, draft scheduling, and automatic schedule generation.

## New Database Fields

### Seasons Table
- `total_games` (INTEGER, nullable): Total number of games to be played in the regular season
- `playoff_format` (TEXT): Playoff format - options: `none`, `single_elimination`, `double_elimination`, `round_robin`
- `draft_scheduled_at` (TIMESTAMPTZ, nullable): Scheduled date and time for the draft
- `schedule_generated` (BOOLEAN): Whether the season schedule has been generated

## Migration

Run the migration to add the new fields:
```sql
-- File: supabase/migrations/add_season_schedule_fields.sql
```

## Features

### 1. Season Creation Form
When creating a new season, you can now specify:
- **Total Games**: The total number of games to be played in the season
- **Playoff Format**: Choose from:
  - No Playoffs
  - Single Elimination
  - Double Elimination
  - Round Robin
- **Draft Date & Time**: Schedule when the draft will take place (optional, can be set later)

### 2. Automatic Schedule Generation
After a draft is completed, if the season has `total_games` specified and the schedule hasn't been generated yet, the system will automatically:
- Generate a round-robin schedule for all teams
- Distribute games across weeks (typically 1-2 games per week)
- Schedule games on weekends (Saturday/Sunday evenings by default)
- Create all game records in the database
- Mark the schedule as generated

### 3. Manual Schedule Generation
If needed, you can manually trigger schedule generation from the admin seasons page:
- Button appears when a season has `total_games` set but schedule not yet generated
- Choose between "random" or "ai" generation method (AI is placeholder for future enhancement)

## Schedule Generation Algorithm

### Round-Robin Method
1. Creates all possible matchups between teams
2. Shuffles matchups for randomness
3. Selects the required number of games
4. Distributes games across weeks:
   - Calculates weeks needed based on total games and number of teams
   - Schedules games on weekends (Saturday/Sunday, 7 PM default)
   - Spaces games appropriately

### AI Method (Future)
- Placeholder for future AI-based scheduling
- Could consider:
  - Team strength/ratings
  - Previous matchups
  - Venue availability
  - Player availability patterns
  - Optimal game spacing

## Usage Workflow

1. **Create Season**:
   - Fill in season name, start date
   - Set games per draft cycle (default: 13)
   - **Set total games** (e.g., 20)
   - Choose playoff format
   - Optionally set draft date/time
   - Create season

2. **Draft Players**:
   - When ready, trigger draft mode
   - Complete the draft with all captains

3. **Schedule Auto-Generation**:
   - After draft completion, schedule is automatically generated
   - All games are created and visible across the site

4. **Manual Generation** (if needed):
   - If schedule wasn't auto-generated, use the "Generate Schedule" button
   - Schedule will be created immediately

## Integration Points

- **Draft Completion**: Automatically triggers schedule generation
- **Schedule Page**: Shows all generated games
- **Team Dashboards**: Display upcoming games
- **Admin Games Page**: All games are visible and manageable

## Notes

- Schedule generation requires at least 2 teams
- Games are scheduled starting the day after season start date
- Default game time is 7 PM on weekends
- Schedule can only be generated once per season (prevents duplicates)
- Games can be manually edited after generation if needed
