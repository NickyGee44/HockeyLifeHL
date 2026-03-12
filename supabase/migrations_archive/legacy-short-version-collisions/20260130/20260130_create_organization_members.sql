-- Organization Members Table
-- Allows organizations to have multiple team members with different roles

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, user_id),

  CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT organization_members_status_check CHECK (status IN ('pending', 'active', 'inactive'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organization owners and admins can view all members
CREATE POLICY "Organization owners and admins can view members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'owner')
        AND om.status = 'active'
    )
  );

-- Users can view their own membership
CREATE POLICY "Users can view their own membership"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Organization owners and admins can invite members
CREATE POLICY "Organization owners and admins can invite members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'owner')
        AND om.status = 'active'
    )
  );

-- Organization owners and admins can update members
CREATE POLICY "Organization owners and admins can update members"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'owner')
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    -- Prevent changing the organization owner
    NOT (
      EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_members.organization_id
          AND o.owner_user_id = organization_members.user_id
      )
      AND role != 'owner'
    )
  );

-- Organization owners can delete members
CREATE POLICY "Organization owners can delete members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_user_id = auth.uid()
    )
  );

-- Users can delete their own pending invitations
CREATE POLICY "Users can delete their own pending invitations"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  );

-- Function to automatically add organization owner as a member
CREATE OR REPLACE FUNCTION add_owner_to_organization_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    NEW.id,
    NEW.owner_user_id,
    'owner',
    'active',
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger to add owner when organization is created
DROP TRIGGER IF EXISTS trigger_add_owner_to_org_members ON organizations;
CREATE TRIGGER trigger_add_owner_to_org_members
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_organization_members();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trigger_update_organization_members_updated_at ON organization_members;
CREATE TRIGGER trigger_update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_members_updated_at();
