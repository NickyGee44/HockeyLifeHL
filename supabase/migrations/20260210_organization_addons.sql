-- Organization add-on subscriptions
-- Tracks premium features: advanced_stats, ai_news, platform_subscription

CREATE TABLE IF NOT EXISTS organization_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('advanced_stats', 'ai_news', 'platform_subscription')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'past_due')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, addon_type)
);

-- RLS
ALTER TABLE organization_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_owners_manage_addons" ON organization_addons
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_read_addons" ON organization_addons
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_organization_addons_org_id ON organization_addons(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_addons_type_status ON organization_addons(addon_type, status);
