'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Globe,
  HelpCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import {
  removeLeagueCustomDomain,
  setLeagueCustomDomain,
  verifyLeagueCustomDomain,
} from '@/lib/actions/domain';
import { getDnsInstructions } from '@/lib/domains/dns-instructions';
import { DomainPurchase } from './domain-purchase';

interface DomainPurchaseCapability {
  searchEnabled: boolean;
  purchaseEnabled: boolean;
  vercelProjectConfigured: boolean;
  message: string | null;
}

interface DomainState {
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  leagueSubdomain: string | null;
  effectiveCustomDomain: string | null;
  effectiveCustomDomainVerified: boolean;
  domainSource: 'league' | 'legacy_organization' | null;
  requiresManualReview: boolean;
  hasCustomDomainAccess: boolean;
  legacyOrganizationDomain: string | null;
}

interface DomainSettingsContentProps {
  organizationName: string;
  purchaseCapability: DomainPurchaseCapability;
  domainState: DomainState;
}

function StatusBadge({
  verificationStatus,
}: {
  verificationStatus: 'pending' | 'verified' | 'failed' | null;
}) {
  if (verificationStatus === 'verified') {
    return (
      <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Verified
      </Badge>
    );
  }

  if (verificationStatus === 'failed') {
    return (
      <Badge className="bg-red-600/20 text-red-400 border-red-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Attention
      </Badge>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  }

  return null;
}

export function DomainSettingsContent({
  organizationName,
  purchaseCapability,
  domainState,
}: DomainSettingsContentProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState(domainState.effectiveCustomDomain || '');
  const [savedDomain, setSavedDomain] = useState(domainState.effectiveCustomDomain || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(
    domainState.effectiveCustomDomainVerified
      ? 'verified'
      : domainState.effectiveCustomDomain
        ? 'pending'
        : null
  );
  const [domainSource, setDomainSource] = useState<'league' | 'legacy_organization' | null>(domainState.domainSource);

  const leagueSubdomain = domainState.leagueSubdomain || domainState.leagueSlug;
  const subdomainUrl = `${leagueSubdomain}.beerleaguehockey.ca`;
  const dnsInstructions = useMemo(
    () => (customDomain ? getDnsInstructions(customDomain) : null),
    [customDomain]
  );

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const refreshAfterMutation = () => {
    router.refresh();
  };

  const handleSetDomain = async () => {
    if (!customDomain.trim()) {
      toast.error('Enter a domain to continue.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await setLeagueCustomDomain(domainState.leagueId, customDomain);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSavedDomain(customDomain.trim().toLowerCase());
      setVerificationStatus('pending');
      setDomainSource('league');
      toast.success(result.message || 'Domain saved.');
      refreshAfterMutation();
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain.trim()) {
      toast.error('Set a domain before verifying it.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyLeagueCustomDomain(domainState.leagueId);
      if (result.error) {
        setVerificationStatus(result.status === 'pending' ? 'pending' : 'failed');
        toast.error(result.message || result.error);
        refreshAfterMutation();
        return;
      }

      setVerificationStatus('verified');
      setDomainSource('league');
      toast.success(result.message || 'Domain verified.');
      refreshAfterMutation();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm(`Remove ${customDomain || 'this custom domain'} from ${domainState.leagueName}?`)) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await removeLeagueCustomDomain(domainState.leagueId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCustomDomain('');
      setSavedDomain('');
      setVerificationStatus(null);
      setDomainSource(null);
      toast.success('Custom domain removed. Your BLH subdomain stays active.');
      refreshAfterMutation();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-neutral-100 flex items-center gap-2">
                <Globe className="h-5 w-5 text-rink-500" />
                Website Domain
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Managing website domains for {domainState.leagueName} in {organizationName}.
              </CardDescription>
            </div>
            <StatusBadge verificationStatus={verificationStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Default BLH Subdomain</p>
                <p className="font-mono text-rink-500 text-base">{subdomainUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(`https://${subdomainUrl}`, 'subdomain')}
                  className="p-2 rounded-lg text-neutral-400 hover:text-rink-500 hover:bg-neutral-700 transition-colors"
                  title="Copy subdomain"
                >
                  {copied === 'subdomain' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={`https://${subdomainUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-neutral-400 hover:text-rink-500 hover:bg-neutral-700 transition-colors"
                  title="Open subdomain"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mt-3">
              This free BLH address always stays available, even if you add or remove a custom domain.
            </p>
          </div>

          {domainState.requiresManualReview && domainState.legacyOrganizationDomain && !domainState.effectiveCustomDomain && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-300 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-200">Legacy organization-level domain needs review</p>
                  <p className="text-sm text-yellow-100/80 mt-1">
                    {domainState.legacyOrganizationDomain} is still attached at the organization level. Because this organization has more than one league, BLH will not auto-assign it. Connect the correct domain directly on the league you want to publish.
                  </p>
                </div>
              </div>
            </div>
          )}

          {domainSource === 'legacy_organization' && customDomain && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-300 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-200">Legacy organization-level domain detected</p>
                  <p className="text-sm text-blue-100/80 mt-1">
                    {customDomain} is currently being read from an older organization-level setting. Any new save or verification here moves management onto {domainState.leagueName} directly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-neutral-100 flex items-center gap-2">
                <Crown className="h-5 w-5 text-rink-500" />
                Custom Domain
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Bring your own domain or buy one through BLH when the purchase integration is available.
              </CardDescription>
            </div>
            {domainState.hasCustomDomainAccess ? (
              <Badge className="bg-green-600/20 text-green-400 border-green-500/30">Included</Badge>
            ) : (
              <Badge variant="outline" className="border-neutral-600 text-neutral-400">
                Requires Subscription
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!domainState.hasCustomDomainAccess ? (
            <div className="rounded-xl border border-rink-500/30 bg-rink-500/10 p-5">
              <p className="text-sm text-neutral-200">
                Custom website domains are available with an active platform subscription. Once unlocked, leagues can either connect a domain they already own or buy one through BLH when the registrar integration is available.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-neutral-100">1. Connect a domain you already own</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                      Save the exact hostname you want to use, update DNS at your registrar, then verify it from here.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(event) => setCustomDomain(event.target.value)}
                    placeholder="yourleague.com or www.yourleague.com"
                    className={cn(
                      'flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl',
                      'text-neutral-100 placeholder-neutral-500',
                      'focus:outline-none focus:ring-2 focus:ring-rink-500/50'
                    )}
                  />
                  <div className="flex gap-2">
                    {!savedDomain || normalizeWhitespace(savedDomain) !== normalizeWhitespace(customDomain) ? (
                      <Button
                        variant="outline"
                        onClick={handleSetDomain}
                        disabled={!customDomain || isSaving}
                        className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                      >
                        {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Save Domain
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleVerifyDomain}
                        disabled={!customDomain || isVerifying}
                        className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                      >
                        {isVerifying ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Verify Domain
                      </Button>
                    )}
                    {domainState.effectiveCustomDomain && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveDomain}
                        disabled={isRemoving}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        {isRemoving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {verificationStatus && customDomain && (
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      verificationStatus === 'verified'
                        ? 'bg-green-900/20 border-green-500/30'
                        : verificationStatus === 'failed'
                          ? 'bg-red-900/20 border-red-500/30'
                          : 'bg-yellow-900/20 border-yellow-500/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {verificationStatus === 'verified' ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                      ) : verificationStatus === 'failed' ? (
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-300 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-100">
                          {verificationStatus === 'verified'
                            ? `${customDomain} is connected`
                            : verificationStatus === 'failed'
                              ? 'Verification needs attention'
                              : 'Waiting for DNS or BLH verification'}
                        </p>
                        <p className="text-sm text-neutral-300 mt-1">
                          {verificationStatus === 'verified'
                            ? 'The live league site should now resolve on this host.'
                            : verificationStatus === 'failed'
                              ? 'Double-check the DNS records below, remove conflicting records, and try verify again.'
                              : 'Save the domain, add the DNS record below, and then click Verify Domain.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {dnsInstructions && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold text-neutral-100 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-rink-500" />
                        DNS records for {dnsInstructions.canonicalHost}
                      </h4>
                      <p className="text-sm text-neutral-400 mt-1">
                        Use the exact record below. Root domains and subdomains are configured differently.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-neutral-500 border-b border-neutral-800">
                            <th className="py-2 pr-3">Type</th>
                            <th className="py-2 pr-3">Host / Name</th>
                            <th className="py-2 pr-3">Value / Points To</th>
                            <th className="py-2 pr-3">TTL</th>
                            <th className="py-2">Why</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[dnsInstructions.primaryRecord, ...dnsInstructions.additionalRecords].map((record, index) => (
                            <tr key={`${record.type}-${record.host}-${index}`} className="border-b border-neutral-900 align-top">
                              <td className="py-3 pr-3 font-mono text-neutral-200">{record.type}</td>
                              <td className="py-3 pr-3 font-mono text-rink-400">{record.host}</td>
                              <td className="py-3 pr-3 font-mono text-neutral-200">{record.value}</td>
                              <td className="py-3 pr-3 text-neutral-300">{record.ttl}</td>
                              <td className="py-3 text-neutral-400">{record.purpose}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2 text-sm text-neutral-400">
                      {dnsInstructions.notes.map((note) => (
                        <p key={note}>• {note}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-neutral-100">2. Search and buy a domain through BLH</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                      This path is Vercel-backed. BLH will only promise automatic setup when the registrar connection is healthy in the current environment.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPurchaseFlow((current) => !current)}
                    disabled={!purchaseCapability.purchaseEnabled}
                    className="text-rink-500 hover:text-rink-400 hover:bg-rink-500/10"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {showPurchaseFlow ? 'Hide Search' : 'Search Domains'}
                  </Button>
                </div>

                {purchaseCapability.message && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100/80">
                    {purchaseCapability.message}
                  </div>
                )}

                {purchaseCapability.purchaseEnabled && showPurchaseFlow ? (
                  <DomainPurchase
                    leagueId={domainState.leagueId}
                    capability={purchaseCapability}
                    onPurchase={(domain, verified) => {
                      setCustomDomain(domain);
                      setSavedDomain(domain);
                      setVerificationStatus(verified ? 'verified' : 'pending');
                      setDomainSource('league');
                      setShowPurchaseFlow(false);
                      refreshAfterMutation();
                    }}
                  />
                ) : (
                  <p className="text-sm text-neutral-400">
                    If you do not see the search flow here, connect a domain you already own. The BYOD path remains fully supported.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-rink-500" />
            Domain FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-400">
          <div>
            <h4 className="font-medium text-neutral-200 mb-1">Can we use a domain we already own?</h4>
            <p>
              Yes. Save the host you want to use, update DNS at your registrar, and then verify it here. BLH will tell you the exact record type to use.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-neutral-200 mb-1">Can we buy a domain through BLH?</h4>
            <p>
              Yes, when the Vercel registrar integration is configured in the current environment. If it is unavailable, BLH keeps bring-your-own-domain available instead of showing a broken purchase flow.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-neutral-200 mb-1">What about www?</h4>
            <p>
              Root domains and www are separate DNS records. If you connect a root domain, BLH will show the optional www record separately so you can decide which host should be canonical.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-neutral-200 mb-1">Will removing a custom domain break the league site?</h4>
            <p>
              No. Removing a custom domain only disconnects that host. The free BLH subdomain stays live.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}
