import crypto from 'crypto';

export interface QuickBooksOAuthStatePayload {
  leagueId: string;
  userId: string;
  nonce: string;
  returnTo: string;
  issuedAt: number;
}

const STATE_VERSION = 'qbo-state-v1';
const SECRET_VERSION = 'qbo-secret-v1';
const STATE_MAX_AGE_MS = 15 * 60 * 1000;

function getQuickBooksBaseSecret(): Buffer {
  const raw =
    process.env.QUICKBOOKS_ENCRYPTION_KEY ||
    process.env.QUICKBOOKS_INTEGRATION_SECRET ||
    '';

  if (!raw.trim()) {
    throw new Error('QuickBooks integration is not configured in this environment.');
  }

  const trimmed = raw.trim();

  try {
    const normalizedBase64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalizedBase64, 'base64');
    if (decoded.length >= 32) {
      return decoded.subarray(0, 32);
    }
  } catch {
    // Fall back to the hashed string.
  }

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  return crypto.createHash('sha256').update(trimmed).digest();
}

function derivePurposeKey(purpose: string) {
  return crypto
    .createHmac('sha256', getQuickBooksBaseSecret())
    .update(purpose)
    .digest();
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(`${normalized}${'='.repeat(padLength)}`, 'base64');
}

export function encryptQuickBooksSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivePurposeKey(SECRET_VERSION), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    base64UrlEncode(iv),
    base64UrlEncode(authTag),
    base64UrlEncode(encrypted),
  ].join('.');
}

export function decryptQuickBooksSecret(value: string) {
  const [version, ivRaw, tagRaw, payloadRaw] = value.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error('Invalid encrypted QuickBooks secret format.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    derivePurposeKey(SECRET_VERSION),
    base64UrlDecode(ivRaw)
  );
  decipher.setAuthTag(base64UrlDecode(tagRaw));

  return Buffer.concat([
    decipher.update(base64UrlDecode(payloadRaw)),
    decipher.final(),
  ]).toString('utf8');
}

export function createQuickBooksStateToken(payload: Omit<QuickBooksOAuthStatePayload, 'issuedAt'>) {
  const fullPayload: QuickBooksOAuthStatePayload = {
    ...payload,
    issuedAt: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode(
    crypto
      .createHmac('sha256', derivePurposeKey(STATE_VERSION))
      .update(encodedPayload)
      .digest()
  );

  return `${encodedPayload}.${signature}`;
}

export function verifyQuickBooksStateToken(token: string): QuickBooksOAuthStatePayload | null {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expected = crypto
    .createHmac('sha256', derivePurposeKey(STATE_VERSION))
    .update(encodedPayload)
    .digest();
  const received = base64UrlDecode(encodedSignature);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as QuickBooksOAuthStatePayload;
    if (
      !payload?.leagueId ||
      !payload?.userId ||
      !payload?.nonce ||
      !payload?.returnTo ||
      typeof payload?.issuedAt !== 'number'
    ) {
      return null;
    }

    if (Date.now() - payload.issuedAt > STATE_MAX_AGE_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
