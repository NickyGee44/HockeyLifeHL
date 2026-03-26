export interface QuickBooksTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string[];
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface QuickBooksAccountOption {
  id: string;
  name: string;
  fullyQualifiedName: string;
  classification?: string | null;
  active: boolean;
}

export interface QuickBooksCompanyInfo {
  realmId: string;
  companyName: string;
}

type QuickBooksApiError = Error & {
  status?: number;
  payload?: unknown;
};

const QUICKBOOKS_MINOR_VERSION = '75';

function getQuickBooksConfig() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID ?? '';
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET ?? '';
  const redirectUri =
    process.env.QUICKBOOKS_REDIRECT_URI ??
    `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/integrations/quickbooks/callback`;
  const environment = process.env.QUICKBOOKS_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

  return {
    configured: Boolean(clientId && clientSecret && redirectUri),
    clientId,
    clientSecret,
    redirectUri,
    environment,
  };
}

function getAccountingBaseUrl() {
  return getQuickBooksConfig().environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

function getOAuthBaseUrl() {
  return 'https://oauth.platform.intuit.com';
}

function getAuthorizeBaseUrl() {
  return 'https://appcenter.intuit.com';
}

function toBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

function extractQuickBooksErrorMessage(payload: any, fallback: string) {
  const faults = payload?.Fault?.Error;
  if (Array.isArray(faults) && faults.length > 0) {
    const messages = faults
      .map((fault) => [fault?.Message, fault?.Detail].filter(Boolean).join(': '))
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  if (typeof payload?.error_description === 'string' && payload.error_description.trim()) {
    return payload.error_description;
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallback;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function quickBooksRequest(input: string, init: RequestInit, fallbackError: string) {
  const response = await fetch(input, init);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      extractQuickBooksErrorMessage(payload, fallbackError)
    ) as QuickBooksApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function formatTokenResponse(payload: any): QuickBooksTokenResponse {
  const issuedAt = Date.now();
  const accessExpiresInMs = Math.max(0, Number(payload?.expires_in || 0)) * 1000;
  const refreshExpiresInMs = Math.max(
    accessExpiresInMs,
    Number(payload?.x_refresh_token_expires_in || 0) * 1000
  );

  return {
    accessToken: String(payload?.access_token || ''),
    refreshToken: String(payload?.refresh_token || ''),
    tokenType: String(payload?.token_type || 'bearer'),
    scope:
      typeof payload?.scope === 'string'
        ? payload.scope.split(' ').filter(Boolean)
        : [],
    accessTokenExpiresAt: new Date(issuedAt + accessExpiresInMs).toISOString(),
    refreshTokenExpiresAt: new Date(issuedAt + refreshExpiresInMs).toISOString(),
  };
}

function parseQueryResults<T>(payload: any, key: string): T[] {
  const container = payload?.QueryResponse?.[key];
  if (!container) {
    return [];
  }

  return Array.isArray(container) ? container : [container];
}

export function getQuickBooksConfigurationStatus() {
  const config = getQuickBooksConfig();

  return {
    configured: config.configured,
    message: config.configured
      ? null
      : 'QuickBooks Online is not configured in this environment. Add QuickBooks API credentials and the integration encryption key to enable direct sync.',
  };
}

export function getQuickBooksAuthorizationUrl(state: string) {
  const config = getQuickBooksConfig();
  if (!config.configured) {
    throw new Error('QuickBooks Online is not configured in this environment.');
  }

  const url = new URL('/connect/oauth2', getAuthorizeBaseUrl());
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeQuickBooksAuthorizationCode(code: string) {
  const config = getQuickBooksConfig();
  if (!config.configured) {
    throw new Error('QuickBooks Online is not configured in this environment.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  const payload = await quickBooksRequest(
    `${getOAuthBaseUrl()}/oauth2/v1/tokens/bearer`,
    {
      method: 'POST',
      headers: {
        Authorization: toBasicAuthHeader(config.clientId, config.clientSecret),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
    'Failed to exchange the QuickBooks authorization code.'
  );

  return formatTokenResponse(payload);
}

export async function refreshQuickBooksTokens(refreshToken: string) {
  const config = getQuickBooksConfig();
  if (!config.configured) {
    throw new Error('QuickBooks Online is not configured in this environment.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const payload = await quickBooksRequest(
    `${getOAuthBaseUrl()}/oauth2/v1/tokens/bearer`,
    {
      method: 'POST',
      headers: {
        Authorization: toBasicAuthHeader(config.clientId, config.clientSecret),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
    'Failed to refresh the QuickBooks access token.'
  );

  return formatTokenResponse(payload);
}

export async function revokeQuickBooksToken(token: string) {
  const config = getQuickBooksConfig();
  if (!config.configured) {
    return;
  }

  const body = new URLSearchParams({ token });

  await quickBooksRequest(
    'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    {
      method: 'POST',
      headers: {
        Authorization: toBasicAuthHeader(config.clientId, config.clientSecret),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
    'Failed to revoke the QuickBooks token.'
  );
}

export async function fetchQuickBooksCompanyInfo(
  realmId: string,
  accessToken: string
): Promise<QuickBooksCompanyInfo> {
  const payload = await quickBooksRequest(
    `${getAccountingBaseUrl()}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=${QUICKBOOKS_MINOR_VERSION}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
    'Failed to fetch the QuickBooks company info.'
  );

  const companyInfo = payload?.CompanyInfo;
  return {
    realmId,
    companyName:
      companyInfo?.CompanyName ||
      companyInfo?.LegalName ||
      `QuickBooks company ${realmId}`,
  };
}

async function queryQuickBooksEntities<T>(
  realmId: string,
  accessToken: string,
  query: string,
  key: string,
  fallbackError: string
) {
  const url = new URL(`/v3/company/${realmId}/query`, getAccountingBaseUrl());
  url.searchParams.set('query', query);
  url.searchParams.set('minorversion', QUICKBOOKS_MINOR_VERSION);

  const payload = await quickBooksRequest(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
    fallbackError
  );

  return parseQueryResults<T>(payload, key);
}

export async function fetchQuickBooksAccounts(
  realmId: string,
  accessToken: string
): Promise<QuickBooksAccountOption[]> {
  const accounts = await queryQuickBooksEntities<any>(
    realmId,
    accessToken,
    'select Id, Name, FullyQualifiedName, Classification, Active from Account maxresults 1000',
    'Account',
    'Failed to fetch the QuickBooks chart of accounts.'
  );

  return accounts.map((account) => ({
    id: String(account.Id),
    name: String(account.Name || account.FullyQualifiedName || account.Id),
    fullyQualifiedName: String(account.FullyQualifiedName || account.Name || account.Id),
    classification: account.Classification ?? null,
    active: account.Active !== false,
  }));
}

export async function fetchQuickBooksClasses(
  realmId: string,
  accessToken: string
): Promise<QuickBooksAccountOption[]> {
  const items = await queryQuickBooksEntities<any>(
    realmId,
    accessToken,
    'select Id, Name, FullyQualifiedName, Active from Class maxresults 1000',
    'Class',
    'Failed to fetch QuickBooks classes.'
  );

  return items.map((item) => ({
    id: String(item.Id),
    name: String(item.Name || item.FullyQualifiedName || item.Id),
    fullyQualifiedName: String(item.FullyQualifiedName || item.Name || item.Id),
    active: item.Active !== false,
  }));
}

export async function fetchQuickBooksLocations(
  realmId: string,
  accessToken: string
): Promise<QuickBooksAccountOption[]> {
  const items = await queryQuickBooksEntities<any>(
    realmId,
    accessToken,
    'select Id, Name, FullyQualifiedName, Active from Department maxresults 1000',
    'Department',
    'Failed to fetch QuickBooks locations.'
  );

  return items.map((item) => ({
    id: String(item.Id),
    name: String(item.Name || item.FullyQualifiedName || item.Id),
    fullyQualifiedName: String(item.FullyQualifiedName || item.Name || item.Id),
    active: item.Active !== false,
  }));
}

export async function createQuickBooksJournalEntry(
  realmId: string,
  accessToken: string,
  payload: Record<string, unknown>
) {
  const response = await quickBooksRequest(
    `${getAccountingBaseUrl()}/v3/company/${realmId}/journalentry?minorversion=${QUICKBOOKS_MINOR_VERSION}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Failed to create the QuickBooks journal entry.'
  );

  return {
    id: String(response?.JournalEntry?.Id || ''),
    payload: response,
  };
}
