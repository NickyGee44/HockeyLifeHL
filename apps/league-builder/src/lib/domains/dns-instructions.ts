export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';
export const VERCEL_APEX_IP = '76.76.21.21';
export const VERCEL_FALLBACK_IPS = ['76.76.21.21', '76.76.21.142', '76.76.21.164', '76.223.126.88'];

const COMPOUND_PUBLIC_SUFFIXES = [
  'co.uk',
  'org.uk',
  'gov.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'com.br',
  'com.mx',
  'co.jp',
  'co.za',
];

export type DomainDnsRecord = {
  type: 'A' | 'CNAME';
  host: string;
  value: string;
  ttl: string;
  required: boolean;
  purpose: string;
};

export type DomainDnsInstructions = {
  normalizedDomain: string;
  canonicalHost: string;
  isApexDomain: boolean;
  primaryRecord: DomainDnsRecord;
  additionalRecords: DomainDnsRecord[];
  notes: string[];
};

export function normalizeDomainInput(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function isValidCustomDomainFormat(domain: string): boolean {
  const normalized = normalizeDomainInput(domain);
  const domainRegex = /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(normalized);
}

function endsWithCompoundPublicSuffix(domain: string): boolean {
  return COMPOUND_PUBLIC_SUFFIXES.some((suffix) => domain.endsWith(`.${suffix}`) || domain === suffix);
}

export function isApexDomain(domain: string): boolean {
  const normalized = normalizeDomainInput(domain);
  const labels = normalized.split('.').filter(Boolean);

  if (labels.length <= 2) {
    return true;
  }

  if (labels.length === 3 && endsWithCompoundPublicSuffix(normalized)) {
    return true;
  }

  return false;
}

export function getDnsInstructions(domain: string): DomainDnsInstructions {
  const normalizedDomain = normalizeDomainInput(domain);
  const apexDomain = isApexDomain(normalizedDomain);

  if (apexDomain) {
    return {
      normalizedDomain,
      canonicalHost: normalizedDomain,
      isApexDomain: true,
      primaryRecord: {
        type: 'A',
        host: '@',
        value: VERCEL_APEX_IP,
        ttl: 'Auto / 3600',
        required: true,
        purpose: `Connect the root domain (${normalizedDomain}).`,
      },
      additionalRecords: [
        {
          type: 'CNAME',
          host: 'www',
          value: VERCEL_CNAME_TARGET,
          ttl: 'Auto / 3600',
          required: false,
          purpose: 'Optional: add this if you also want www to resolve and redirect cleanly.',
        },
      ],
      notes: [
        `The canonical host will be ${normalizedDomain} unless you decide to use a separate www redirect strategy.`,
        `If your DNS provider already has A, AAAA, or CNAME records for ${normalizedDomain}, remove conflicting records before verifying.`,
        'If you use Cloudflare, set the DNS record to DNS only while verifying.',
      ],
    };
  }

  const host = normalizedDomain.split('.')[0] ?? normalizedDomain;
  const parentDomain = normalizedDomain.split('.').slice(1).join('.');

  return {
    normalizedDomain,
    canonicalHost: normalizedDomain,
    isApexDomain: false,
    primaryRecord: {
      type: 'CNAME',
      host,
      value: VERCEL_CNAME_TARGET,
      ttl: 'Auto / 3600',
      required: true,
      purpose: `Connect the subdomain ${normalizedDomain}.`,
    },
    additionalRecords: [],
    notes: [
      `${normalizedDomain} is a subdomain. ${parentDomain ? `${parentDomain} is a separate host and does not need to change unless you want it to.` : 'Its root domain is separate and does not need to change unless you want it to.'}`,
      `If you also want www.${normalizedDomain}, add that as a separate CNAME record later.`,
      'Remove any conflicting A, AAAA, or CNAME records for this host before verifying.',
    ],
  };
}
