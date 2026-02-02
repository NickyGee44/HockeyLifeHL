// Shared auth utilities
// Will be populated with auth functions

export const AUTH_COOKIE_NAME = 'sb-auth-token';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
}

// Placeholder functions - will be implemented
export async function getCurrentUser(): Promise<AuthUser | null> {
  return null;
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
  return { user: null, error: new Error('Not implemented') };
}

export async function signOut(): Promise<void> {
  // Implementation
}
