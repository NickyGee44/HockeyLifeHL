-- Explicit article entity tags for public link rendering and editorial overrides.

CREATE TABLE IF NOT EXISTS article_team_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_att_article ON article_team_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_att_team ON article_team_tags(team_id);

ALTER TABLE article_team_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_public_read" ON article_team_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM articles
      WHERE articles.id = article_team_tags.article_id
      AND articles.published = true
    )
  );

CREATE POLICY "att_service_write" ON article_team_tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS article_game_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_agt_article ON article_game_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_agt_game ON article_game_tags(game_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agt_primary_per_article
  ON article_game_tags(article_id)
  WHERE is_primary = true;

ALTER TABLE article_game_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agt_public_read" ON article_game_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM articles
      WHERE articles.id = article_game_tags.article_id
      AND articles.published = true
    )
  );

CREATE POLICY "agt_service_write" ON article_game_tags
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO article_game_tags (article_id, game_id, is_primary)
SELECT a.id, a.game_id, TRUE
FROM articles a
WHERE a.game_id IS NOT NULL
ON CONFLICT (article_id, game_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary;

INSERT INTO article_team_tags (article_id, team_id)
SELECT a.id, g.home_team_id
FROM articles a
JOIN games g ON g.id = a.game_id
WHERE a.game_id IS NOT NULL
AND g.home_team_id IS NOT NULL
ON CONFLICT (article_id, team_id) DO NOTHING;

INSERT INTO article_team_tags (article_id, team_id)
SELECT a.id, g.away_team_id
FROM articles a
JOIN games g ON g.id = a.game_id
WHERE a.game_id IS NOT NULL
AND g.away_team_id IS NOT NULL
ON CONFLICT (article_id, team_id) DO NOTHING;
