-- ============================================
-- 🍁🏒 HockeyLifeHL Database Schema 🏒🍁
-- "For Fun, For Beers, For Glory"
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('owner', 'captain', 'player');
CREATE TYPE player_rating AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE season_status AS ENUM ('active', 'playoffs', 'completed', 'draft');
CREATE TYPE article_type AS ENUM ('game_recap', 'weekly_wrap', 'draft_grades', 'announcement');
CREATE TYPE draft_status AS ENUM ('pending', 'in_progress', 'completed');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  jersey_number INTEGER CHECK (jersey_number >= 0 AND jersey_number <= 99),
  position TEXT CHECK (position IN ('C', 'LW', 'RW', 'D', 'G')),
  role user_role DEFAULT 'player',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAMS
-- ============================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL CHECK (char_length(short_name) <= 5),
  logo_url TEXT,
  primary_color TEXT DEFAULT '#E31837',
  secondary_color TEXT DEFAULT '#FFFFFF',
  captain_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEASONS
-- ============================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status season_status DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  games_per_cycle INTEGER DEFAULT 13,
  current_game_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GAMES
-- ============================================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER DEFAULT 0 CHECK (home_score >= 0),
  away_score INTEGER DEFAULT 0 CHECK (away_score >= 0),
  status game_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  home_captain_verified BOOLEAN DEFAULT FALSE,
  away_captain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

-- ============================================
-- TEAM ROSTERS (player-team assignments per season)
-- ============================================

CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  is_goalie BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (player_id, season_id) -- A player can only be on one team per season
);

-- ============================================
-- PLAYER STATS (per game)
-- ============================================

CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER DEFAULT 0 CHECK (assists >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (game_id, player_id) -- One stat entry per player per game
);

-- ============================================
-- GOALIE STATS (per game)
-- ============================================

CREATE TABLE goalie_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  goals_against INTEGER DEFAULT 0 CHECK (goals_against >= 0),
  saves INTEGER DEFAULT 0 CHECK (saves >= 0),
  shutout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (game_id, player_id)
);

-- ============================================
-- SUSPENSIONS
-- ============================================

CREATE TABLE suspensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  games_remaining INTEGER NOT NULL CHECK (games_remaining >= 0),
  start_date DATE NOT NULL,
  end_date DATE,
  issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ARTICLES (AI-generated and manual)
-- ============================================

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type article_type NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRAFTS
-- ============================================

CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
  status draft_status DEFAULT 'pending',
  current_pick INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE (season_id, cycle_number)
);

-- ============================================
-- DRAFT PICKS
-- ============================================

CREATE TABLE draft_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pick_number INTEGER NOT NULL,
  round INTEGER NOT NULL CHECK (round > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (draft_id, pick_number),
  UNIQUE (draft_id, player_id) -- Player can only be picked once per draft
);

-- ============================================
-- PLAYER RATINGS (calculated for drafts)
-- ============================================

CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  rating player_rating NOT NULL,
  games_played INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0,
  points_per_game DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (player_id, season_id)
);

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_scheduled ON games(scheduled_at);
CREATE INDEX idx_player_stats_game ON player_stats(game_id);
CREATE INDEX idx_player_stats_player ON player_stats(player_id);
CREATE INDEX idx_player_stats_season ON player_stats(season_id);
CREATE INDEX idx_player_stats_player_season ON player_stats(player_id, season_id);
CREATE INDEX idx_goalie_stats_game ON goalie_stats(game_id);
CREATE INDEX idx_goalie_stats_season ON goalie_stats(season_id);
CREATE INDEX idx_goalie_stats_player_season ON goalie_stats(player_id, season_id);
CREATE INDEX idx_team_rosters_season ON team_rosters(season_id);
CREATE INDEX idx_team_rosters_team ON team_rosters(team_id);
CREATE INDEX idx_articles_published ON articles(published, published_at DESC);
CREATE INDEX idx_suspensions_player ON suspensions(player_id);
CREATE INDEX idx_draft_picks_draft ON draft_picks(draft_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalie_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- TEAMS: Anyone can read
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage teams" ON teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- SEASONS: Anyone can read
CREATE POLICY "Seasons are viewable by everyone" ON seasons
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage seasons" ON seasons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- GAMES: Anyone can read
CREATE POLICY "Games are viewable by everyone" ON games
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage games" ON games
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- TEAM ROSTERS: Anyone can read
CREATE POLICY "Rosters are viewable by everyone" ON team_rosters
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage rosters" ON team_rosters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- PLAYER STATS: Anyone can read
CREATE POLICY "Stats are viewable by everyone" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Captains can enter stats for their team" ON player_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Captains can update stats for their team" ON player_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- GOALIE STATS: Same as player stats
CREATE POLICY "Goalie stats are viewable by everyone" ON goalie_stats
  FOR SELECT USING (true);

CREATE POLICY "Captains can enter goalie stats" ON goalie_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Captains can update goalie stats" ON goalie_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- SUSPENSIONS: Anyone can read, only owners can manage
CREATE POLICY "Suspensions are viewable by everyone" ON suspensions
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage suspensions" ON suspensions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ARTICLES: Published articles are public
CREATE POLICY "Published articles are viewable by everyone" ON articles
  FOR SELECT USING (published = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY "Only owners can manage articles" ON articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- DRAFTS: Anyone can view, only owners manage
CREATE POLICY "Drafts are viewable by everyone" ON drafts
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage drafts" ON drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- DRAFT PICKS: Anyone can view
CREATE POLICY "Draft picks are viewable by everyone" ON draft_picks
  FOR SELECT USING (true);

CREATE POLICY "Captains can make picks during draft" ON draft_picks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id AND captain_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- PLAYER RATINGS: Anyone can view
CREATE POLICY "Ratings are viewable by everyone" ON player_ratings
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage ratings" ON player_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VIEWS for common queries
-- ============================================

-- Player season totals (NHL-style: stats per player per season)
CREATE OR REPLACE VIEW player_season_stats AS
SELECT 
  ps.player_id,
  p.full_name,
  p.jersey_number,
  ps.season_id,
  s.name as season_name,
  tr.team_id,
  t.name as team_name,
  COUNT(DISTINCT ps.game_id) as games_played,
  SUM(ps.goals) as total_goals,
  SUM(ps.assists) as total_assists,
  SUM(ps.goals + ps.assists) as total_points,
  ROUND(AVG(ps.goals + ps.assists), 2) as points_per_game,
  ROUND(AVG(ps.goals), 2) as goals_per_game,
  ROUND(AVG(ps.assists), 2) as assists_per_game
FROM player_stats ps
JOIN profiles p ON ps.player_id = p.id
JOIN seasons s ON ps.season_id = s.id
JOIN games g ON ps.game_id = g.id
LEFT JOIN team_rosters tr ON ps.player_id = tr.player_id 
  AND ps.season_id = tr.season_id
  AND ps.team_id = tr.team_id
LEFT JOIN teams t ON tr.team_id = t.id
WHERE g.status = 'completed'
  AND g.home_captain_verified = true
  AND g.away_captain_verified = true
GROUP BY ps.player_id, p.full_name, p.jersey_number, ps.season_id, s.name, tr.team_id, t.name;

-- Goalie season totals (NHL-style: stats per goalie per season)
CREATE OR REPLACE VIEW goalie_season_stats AS
SELECT 
  gs.player_id,
  p.full_name,
  p.jersey_number,
  gs.season_id,
  s.name as season_name,
  tr.team_id,
  t.name as team_name,
  COUNT(DISTINCT gs.game_id) as games_played,
  SUM(gs.goals_against) as total_goals_against,
  SUM(gs.saves) as total_saves,
  COUNT(CASE WHEN gs.shutout THEN 1 END) as shutouts,
  ROUND(SUM(gs.goals_against)::DECIMAL / NULLIF(COUNT(DISTINCT gs.game_id), 0), 2) as gaa,
  ROUND(
    (SUM(gs.saves)::DECIMAL / NULLIF(SUM(gs.goals_against) + SUM(gs.saves), 0)) * 100, 
    2
  ) as save_percentage
FROM goalie_stats gs
JOIN profiles p ON gs.player_id = p.id
JOIN seasons s ON gs.season_id = s.id
JOIN games g ON gs.game_id = g.id
LEFT JOIN team_rosters tr ON gs.player_id = tr.player_id 
  AND gs.season_id = tr.season_id
  AND gs.team_id = tr.team_id
LEFT JOIN teams t ON tr.team_id = t.id
WHERE g.status = 'completed'
  AND g.home_captain_verified = true
  AND g.away_captain_verified = true
GROUP BY gs.player_id, p.full_name, p.jersey_number, gs.season_id, s.name, tr.team_id, t.name;

-- Team standings
CREATE OR REPLACE VIEW team_standings AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.short_name,
  s.id as season_id,
  s.name as season_name,
  COUNT(DISTINCT g.id) as games_played,
  COUNT(DISTINCT CASE 
    WHEN (g.home_team_id = t.id AND g.home_score > g.away_score) 
      OR (g.away_team_id = t.id AND g.away_score > g.home_score) 
    THEN g.id 
  END) as wins,
  COUNT(DISTINCT CASE 
    WHEN (g.home_team_id = t.id AND g.home_score < g.away_score) 
      OR (g.away_team_id = t.id AND g.away_score < g.home_score) 
    THEN g.id 
  END) as losses,
  COUNT(DISTINCT CASE 
    WHEN g.home_score = g.away_score THEN g.id 
  END) as ties,
  SUM(CASE WHEN g.home_team_id = t.id THEN g.home_score ELSE g.away_score END) as goals_for,
  SUM(CASE WHEN g.home_team_id = t.id THEN g.away_score ELSE g.home_score END) as goals_against
FROM teams t
CROSS JOIN seasons s
LEFT JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id) 
  AND g.season_id = s.id 
  AND g.status = 'completed'
GROUP BY t.id, t.name, t.short_name, s.id, s.name;

-- ============================================
-- DONE! 🏒
-- ============================================
