import assert from 'node:assert/strict';
import test from 'node:test';
import { isGatewayVerifiedServiceRole } from '../service-role-auth.ts';

function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.test-signature`;
}

test('accepts only the expected project service-role claims after gateway verification', () => {
  const projectRef = 'ntplczcmhvfkijjxavdl';
  const token = fakeJwt({ iss: 'supabase', ref: projectRef, role: 'service_role' });

  assert.equal(isGatewayVerifiedServiceRole(`Bearer ${token}`, projectRef), true);
});

test('rejects anon, wrong-project, and malformed credentials', () => {
  const projectRef = 'ntplczcmhvfkijjxavdl';
  const anon = fakeJwt({ iss: 'supabase', ref: projectRef, role: 'anon' });
  const otherProject = fakeJwt({ iss: 'supabase', ref: 'other-project', role: 'service_role' });

  assert.equal(isGatewayVerifiedServiceRole(`Bearer ${anon}`, projectRef), false);
  assert.equal(isGatewayVerifiedServiceRole(`Bearer ${otherProject}`, projectRef), false);
  assert.equal(isGatewayVerifiedServiceRole('Bearer malformed', projectRef), false);
  assert.equal(isGatewayVerifiedServiceRole(null, projectRef), false);
});
