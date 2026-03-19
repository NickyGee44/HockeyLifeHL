// @hockey-life/auth — shared auth package
// Currently a placeholder barrel. Add auth utilities here as needed.

export const AUTH_COOKIE_NAME = 'sb-auth-token';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
}

const ROLE_WEIGHT: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function isAuthenticated(user: AuthUser | null | undefined): user is AuthUser {
  return Boolean(user?.id && user?.email);
}

export function hasRequiredRole(
  userRole: UserRole | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false;
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[requiredRole];
}
