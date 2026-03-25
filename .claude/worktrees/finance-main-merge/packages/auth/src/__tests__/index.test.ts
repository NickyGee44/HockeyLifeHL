import {
  AUTH_COOKIE_NAME,
  hasRequiredRole,
  isAuthenticated,
  type AuthUser,
} from '../index';

describe('@hockey-life/auth helpers', () => {
  it('exports the shared auth cookie name', () => {
    expect(AUTH_COOKIE_NAME).toBe('sb-auth-token');
  });

  it('checks authenticated user shape', () => {
    const validUser: AuthUser = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'viewer',
    };

    expect(isAuthenticated(validUser)).toBe(true);
    expect(isAuthenticated(null)).toBe(false);
    expect(isAuthenticated({ id: '', email: '' })).toBe(false);
  });

  it('enforces role hierarchy for auth utilities', () => {
    expect(hasRequiredRole('owner', 'admin')).toBe(true);
    expect(hasRequiredRole('admin', 'editor')).toBe(true);
    expect(hasRequiredRole('viewer', 'admin')).toBe(false);
    expect(hasRequiredRole(undefined, 'viewer')).toBe(false);
  });
});

