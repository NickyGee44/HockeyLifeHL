import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export type OrganizationAccessType =
  | 'org_owner'
  | 'org_admin'
  | 'league_admin'
  | 'org_member'
  | 'platform_admin';

export type OrganizationRecord = {
  id: string;
  owner_user_id: string | null;
  name?: string | null;
  created_at?: string | null;
  stripe_customer_id?: string | null;
  [key: string]: unknown;
};

export type OrganizationWithAccess = OrganizationRecord & {
  access_type: OrganizationAccessType;
  access_priority: number;
};

export type OrganizationAccessResult = {
  authorized: boolean;
  userId?: string;
  organization?: OrganizationRecord;
  accessType?: OrganizationAccessType;
  error?: string;
};

const ACCESS_PRIORITY: Record<OrganizationAccessType, number> = {
  platform_admin: 1000,
  org_owner: 400,
  org_admin: 300,
  league_admin: 250,
  org_member: 100,
};

function resolveOrganizationMemberAccessType(role: string | null | undefined): OrganizationAccessType | null {
  if (role === 'owner') {
    return 'org_owner';
  }

  if (role === 'admin') {
    return 'org_admin';
  }

  if (role === 'member') {
    return 'org_member';
  }

  return null;
}

function applyAccess(
  accessByOrgId: Map<string, { accessType: OrganizationAccessType; accessPriority: number }>,
  organizationId: string | null | undefined,
  accessType: OrganizationAccessType
) {
  if (!organizationId) {
    return;
  }

  const nextPriority = ACCESS_PRIORITY[accessType];
  const existing = accessByOrgId.get(organizationId);

  if (!existing || nextPriority > existing.accessPriority) {
    accessByOrgId.set(organizationId, {
      accessType,
      accessPriority: nextPriority,
    });
  }
}

export function isOrganizationManagerAccess(
  accessType?: OrganizationAccessType | null
): boolean {
  return Boolean(
    accessType && ['org_owner', 'org_admin', 'league_admin', 'platform_admin'].includes(accessType)
  );
}

export async function getUserOrganizationsWithAccess(): Promise<OrganizationWithAccess[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const serviceClient = createServiceRoleClient();
  const accessByOrgId = new Map<string, { accessType: OrganizationAccessType; accessPriority: number }>();
  const organizationById = new Map<string, OrganizationRecord>();

  const { data: ownedOrgs } = await serviceClient
    .from('organizations')
    .select('*')
    .eq('owner_user_id', user.id);

  for (const organization of ownedOrgs || []) {
    organizationById.set(organization.id, organization);
    applyAccess(accessByOrgId, organization.id, 'org_owner');
  }

  const { data: organizationMemberships } = await serviceClient
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active');

  for (const membership of organizationMemberships || []) {
    applyAccess(
      accessByOrgId,
      membership.organization_id,
      resolveOrganizationMemberAccessType(membership.role) || 'org_member'
    );
  }

  const { data: directlyManagedLeagues } = await serviceClient
    .from('leagues')
    .select('organization_id')
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);

  for (const league of directlyManagedLeagues || []) {
    applyAccess(accessByOrgId, league.organization_id, 'league_admin');
  }

  const { data: leagueMemberships } = await (serviceClient as any)
    .from('league_memberships')
    .select('league:leagues(organization_id)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  for (const membership of leagueMemberships || []) {
    applyAccess(accessByOrgId, membership.league?.organization_id, 'league_admin');
  }

  const missingOrganizationIds = [...accessByOrgId.keys()].filter(
    (organizationId) => !organizationById.has(organizationId)
  );

  if (missingOrganizationIds.length > 0) {
    const { data: organizations } = await serviceClient
      .from('organizations')
      .select('*')
      .in('id', missingOrganizationIds);

    for (const organization of organizations || []) {
      organizationById.set(organization.id, organization);
    }
  }

  return [...organizationById.values()]
    .filter((organization) => accessByOrgId.has(organization.id))
    .map((organization) => {
      const access = accessByOrgId.get(organization.id)!;
      const organizationWithAccess: OrganizationWithAccess = {
        ...organization,
        access_type: access.accessType,
        access_priority: access.accessPriority,
      };

      return organizationWithAccess;
    })
    .sort((left, right) => {
      if (right.access_priority !== left.access_priority) {
        return right.access_priority - left.access_priority;
      }

      const leftCreatedAt = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightCreatedAt = right.created_at ? new Date(right.created_at).getTime() : 0;

      if (rightCreatedAt !== leftCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
      }

      return String(left.name || '').localeCompare(String(right.name || ''));
    });
}

export async function getPrimaryManagedOrganization(): Promise<OrganizationWithAccess | null> {
  const organizations = await getUserOrganizationsWithAccess();
  return organizations.find((organization) => isOrganizationManagerAccess(organization.access_type)) || null;
}

export async function verifyOrganizationAccess(
  organizationId: string,
  options?: { requireManagement?: boolean }
): Promise<OrganizationAccessResult> {
  const requireManagement = options?.requireManagement ?? false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: organization, error: organizationError } = await serviceClient
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return { authorized: false, error: 'Organization not found' };
  }

  if (await isUserPlatformAdmin(user.id)) {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: 'platform_admin',
    };
  }

  if (organization.owner_user_id === user.id) {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: 'org_owner',
    };
  }

  const { data: organizationMembership } = await serviceClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const orgMembershipAccessType = resolveOrganizationMemberAccessType(organizationMembership?.role);
  if (orgMembershipAccessType && orgMembershipAccessType !== 'org_member') {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: orgMembershipAccessType,
    };
  }

  const { data: directlyManagedLeague } = await serviceClient
    .from('leagues')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (directlyManagedLeague) {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: 'league_admin',
    };
  }

  const { data: leagueMembership } = await (serviceClient as any)
    .from('league_memberships')
    .select('league_id, leagues!inner(organization_id)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .eq('leagues.organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (leagueMembership) {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: 'league_admin',
    };
  }

  if (orgMembershipAccessType === 'org_member' && !requireManagement) {
    return {
      authorized: true,
      userId: user.id,
      organization,
      accessType: 'org_member',
    };
  }

  return {
    authorized: false,
    error: requireManagement
      ? 'You do not have permission to manage this organization'
      : 'You do not have access to this organization',
  };
}
