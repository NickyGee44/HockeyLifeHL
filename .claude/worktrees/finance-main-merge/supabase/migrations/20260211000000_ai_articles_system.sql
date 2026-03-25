-- Canonicalized from legacy short migration version 20260211.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- AI Articles System: player tags, generation log, and articles enhancements
-- Adds division_id to articles, creates article_player_tags junction, and ai_generation_log

-- 1. Add division_id to articles (for per-division weekly wraps)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_division ON articles(division_id) WHERE division_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_game_id ON articles(game_id) WHERE game_id IS NOT NULL;

-- 2. Article player tags junction table
CREATE TABLE IF NOT EXISTS article_player_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mention_type TEXT NOT NULL DEFAULT 'mentioned'
    CHECK (mention_type IN ('star', 'mentioned', 'scored', 'assist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_apt_player ON article_player_tags(player_id);

CREATE INDEX IF NOT EXISTS idx_apt_article ON article_player_tags(article_id);

ALTER TABLE article_player_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apt_public_read" ON article_player_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_player_tags.article_id
      AND articles.published = true
    )
  );

CREATE POLICY "apt_service_write" ON article_player_tags
  FOR ALL USING (auth.role() = 'service_role');

-- 3. AI generation log (dedup + tracking)
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  article_type TEXT NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  week_start_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  tokens_used INTEGER,
  model_used TEXT,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_gen_game
  ON ai_generation_log(game_id, article_type)
  WHERE game_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_gen_weekly
  ON ai_generation_log(league_id, division_id, week_start_date, article_type)
  WHERE week_start_date IS NOT NULL;

ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_log_owner_read" ON ai_generation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leagues l
      JOIN organizations o ON l.organization_id = o.id
      WHERE l.id = ai_generation_log.league_id
      AND o.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "ai_log_service_write" ON ai_generation_log
  FOR ALL USING (auth.role() = 'service_role');

