-- Activate AI News addon for all existing organizations
-- This gives every current league free access to AI-generated game recaps and weekly wraps.

INSERT INTO organization_addons (organization_id, addon_type, status, created_at, updated_at)
SELECT o.id, 'ai_news', 'active', NOW(), NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_addons oa
  WHERE oa.organization_id = o.id AND oa.addon_type = 'ai_news'
)
ON CONFLICT DO NOTHING;
