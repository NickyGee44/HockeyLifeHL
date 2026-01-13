# Comprehensive Test Data Generation Guide

## Overview

The test data generator creates a realistic **mid-season scenario** with:
- **7 teams** (Maple Leafs, Canadiens, Oilers, Flames, Canucks, Jets, Bruins)
- **13 players per team** (91 total players)
- **Mid-season state**: 7 games played out of 13-game cycle

## What Gets Created

### 1. Season
- Active season (started 2 months ago)
- 7 games completed (mid-season)
- 42 total games scheduled
- Schedule generated
- Single elimination playoff format

### 2. Teams (7)
- All teams created with proper colors/logos
- Captains assigned (first player on each team)
- Captains have "captain" role

### 3. Players (91 total)
- Assigned to teams (13 per team)
- Jersey numbers (1-99)
- Positions assigned (C, LW, RW, D, G)
- **All players approved** (can participate)
- **All players opted in** as full-time (draftable)

### 4. Games
- **25 completed games** with:
  - Realistic scores (2-8 goals per team)
  - Both captains verified
  - Player stats (6-10 players per game get stats)
  - Goalie stats (saves, GAA, shutouts)
  - Various locations
  
- **8 upcoming games** (scheduled for next 8 weeks)
  
- **3 games pending verification** (recently completed, waiting for captain verification)

### 5. Player Stats
- Distributed across all completed games
- Realistic goal/assist distribution
- Some players have multi-point games
- Stats linked to season_id (NHL-style)

### 6. Goalie Stats
- Goals against
- Saves (15-40 per game)
- Shutouts (when applicable)
- GAA and save percentage calculated

### 7. Player Ratings
- Calculated for all players
- Based on games played, points, attendance
- Ratings: A, B+, B, C+, C, D
- Used for draft purposes

### 8. Draft
- Completed draft (Cycle 1)
- All 91 players drafted
- 13 rounds, 7 picks per round
- Draft history preserved

### 9. Articles
- Game recaps (for key games)
- Weekly wraps (2-3 articles)
- Draft grades (post-draft analysis)
- All published and visible on news page

### 10. Payments
- 70% of players have paid
- Various payment methods (cash, etransfer, credit, cheque)
- Payment dates spread over last 60 days
- $250 league fee

### 11. Suspensions
- 2-3 active suspensions
- Various reasons (fighting, unsportsmanlike, misconduct)
- 1-3 games remaining

### 12. Team Messages
- Game reminders from captains
- Practice announcements
- Team updates
- Visible to team members

### 13. Player Availability
- Some players marked unavailable for upcoming games
- Various reasons (work, family, injury, etc.)
- Visible to captains

## Prerequisites

### Minimum Requirements
- **At least 13 players** in the database (minimum to create teams)
- **Ideally 91 players** (7 teams × 13 players) for full demo

### How to Get Players

**Option 1: Manual Registration**
- Register accounts manually through `/auth/register`
- Approve them in `/admin/approvals`
- Need to do this 91 times (tedious but works)

**Option 2: Supabase Admin API** (Recommended for bulk creation)
- Use Supabase Admin API to create auth users programmatically
- Can create 91 users at once
- Requires service role key

**Option 3: Use Existing Players**
- If you have existing players, the generator will use them
- Will distribute them across teams
- If you have fewer than 91, teams will have fewer players

## Usage

1. **Navigate to Admin Dashboard**: `/admin`
2. **Click "Generate Test Data"** button
3. **Wait for completion** (may take 30-60 seconds)
4. **Review success message** with details

## What You Can Demo

After generation, you can demo:

### Public Pages
- ✅ **Standings** - Realistic standings with wins/losses/ties
- ✅ **Schedule** - 25 past games, 8 upcoming games
- ✅ **Stats** - Player and goalie leaderboards
- ✅ **Teams** - All 7 teams with rosters
- ✅ **News** - Articles (recaps, weekly wraps, draft grades)
- ✅ **Player Profiles** - Individual player stats pages

### Player Dashboard
- ✅ **Dashboard** - Personal stats, next game, recent activity
- ✅ **Team** - Your team, roster, captain info
- ✅ **Stats** - Your game-by-game stats
- ✅ **Schedule** - Your team's games

### Captain Dashboard
- ✅ **Dashboard** - Team stats, pending verifications
- ✅ **Team Management** - Roster, add/remove players
- ✅ **Stats Entry** - Enter stats for games
- ✅ **Verification** - Verify opponent stats
- ✅ **Messages** - Send team messages
- ✅ **Payments** - View team payment status

### Owner Dashboard
- ✅ **Overview** - League statistics
- ✅ **Players** - All players, approvals
- ✅ **Teams** - Manage teams, assign captains
- ✅ **Seasons** - Season management
- ✅ **Games** - All games, cancel/reschedule
- ✅ **Stats** - View all stats, disputes
- ✅ **Payments** - Payment tracking
- ✅ **Articles** - Manage articles
- ✅ **Draft** - Draft management
- ✅ **Test Data** - Generate/remove test data

## Data Realism

The generator creates realistic data:
- **Scores**: 2-8 goals per team (realistic beer league scores)
- **Stats Distribution**: Not everyone gets points every game
- **Goalie Stats**: Realistic save counts, some shutouts
- **Standings**: Teams have different records (not all tied)
- **Timeline**: Games spread over 8 weeks (past) and 8 weeks (future)
- **Verification States**: Mix of verified and pending games

## Removing Test Data

To remove all test data:
1. Navigate to `/admin`
2. Click "Remove All Test Data" button
3. Confirm deletion
4. All test data will be removed (teams and seasons remain but reset)

## Troubleshooting

### "Not enough players" error
- **Solution**: Create more player accounts or use Supabase Admin API
- **Minimum**: 13 players (will create 1-2 players per team)
- **Ideal**: 91 players (13 per team)

### Teams have fewer than 13 players
- **Cause**: Not enough players in database
- **Solution**: Create more player accounts
- **Workaround**: System will work with fewer players, but not ideal for demo

### Stats not showing
- **Check**: Games must be completed AND both captains verified
- **Check**: Stats are linked to season_id
- **Solution**: Re-run test data generation

### Standings look wrong
- **Check**: Games are verified (both captains)
- **Check**: Season game count is updated
- **Solution**: Re-run test data generation

---

**Status**: ✅ Ready to use
**Time to Generate**: 30-60 seconds
**Data Quality**: Realistic mid-season scenario
