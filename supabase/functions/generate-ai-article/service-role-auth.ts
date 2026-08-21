interface ServiceRoleClaims {
  iss?: unknown;
  ref?: unknown;
  role?: unknown;
}

function decodeJwtClaims(token: string): ServiceRoleClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as ServiceRoleClaims;
  } catch {
    return null;
  }
}

/**
 * Checks claims only after the Supabase Edge gateway has verified the JWT.
 * The deployed function must keep verify_jwt enabled; this helper does not
 * perform cryptographic signature verification itself.
 */
export function isGatewayVerifiedServiceRole(
  authHeader: string | null,
  expectedProjectRef: string,
): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;

  const claims = decodeJwtClaims(authHeader.slice('Bearer '.length));
  return claims?.iss === 'supabase'
    && claims.ref === expectedProjectRef
    && claims.role === 'service_role';
}
