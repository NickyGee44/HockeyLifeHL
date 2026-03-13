-- Move legacy organization-level website domains onto leagues where the mapping
-- is unambiguous. Keep ambiguous multi-league orgs intact and flag them for
-- manual review instead of guessing.

CREATE TABLE IF NOT EXISTS public.league_domain_migration_manual_reviews (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  custom_domain text NOT NULL,
  custom_domain_verified boolean NOT NULL DEFAULT false,
  active_league_count integer NOT NULL,
  noted_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.league_domain_migration_manual_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'league_domain_migration_manual_reviews'
      AND policyname = 'service_role_can_manage_domain_migration_reviews'
  ) THEN
    CREATE POLICY service_role_can_manage_domain_migration_reviews
      ON public.league_domain_migration_manual_reviews
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

WITH organization_domain_counts AS (
  SELECT
    o.id AS organization_id,
    o.custom_domain,
    COALESCE(o.custom_domain_verified, false) AS custom_domain_verified,
    COUNT(l.id) FILTER (
      WHERE l.id IS NOT NULL
        AND (l.status IS NULL OR l.status <> 'archived')
    ) AS active_league_count,
    (
      ARRAY_AGG(l.id ORDER BY l.created_at NULLS LAST, l.id) FILTER (
        WHERE l.id IS NOT NULL
          AND (l.status IS NULL OR l.status <> 'archived')
      )
    )[1] AS sole_league_id
  FROM public.organizations o
  LEFT JOIN public.leagues l
    ON l.organization_id = o.id
  WHERE o.custom_domain IS NOT NULL
  GROUP BY o.id, o.custom_domain, o.custom_domain_verified
),
single_league_backfill AS (
  UPDATE public.leagues l
  SET
    custom_domain = odc.custom_domain,
    custom_domain_verified = odc.custom_domain_verified,
    updated_at = timezone('utc', now())
  FROM organization_domain_counts odc
  WHERE odc.active_league_count = 1
    AND odc.sole_league_id = l.id
    AND l.custom_domain IS NULL
  RETURNING l.id
)
INSERT INTO public.league_domain_migration_manual_reviews (
  organization_id,
  custom_domain,
  custom_domain_verified,
  active_league_count
)
SELECT
  odc.organization_id,
  odc.custom_domain,
  odc.custom_domain_verified,
  odc.active_league_count
FROM organization_domain_counts odc
WHERE odc.active_league_count > 1
ON CONFLICT (organization_id) DO UPDATE
SET
  custom_domain = EXCLUDED.custom_domain,
  custom_domain_verified = EXCLUDED.custom_domain_verified,
  active_league_count = EXCLUDED.active_league_count,
  noted_at = timezone('utc', now());
