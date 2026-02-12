// @hockey-life/auth — shared auth package
// Currently a placeholder barrel. Add auth utilities here as needed.

export const AUTH_COOKIE_NAME = 'sb-auth-token';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
}
