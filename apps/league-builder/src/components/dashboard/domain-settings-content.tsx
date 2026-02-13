'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Crown,
  Mail,
  RefreshCw,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import { setCustomDomain, verifyCustomDomain, removeCustomDomain } from '@/lib/actions/domain';

interface Organization {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
  subscription_tier?: string;
}

interface DomainSettingsContentProps {
  organization: Organization;
}

export function DomainSettingsContent({ organization }: DomainSettingsContentProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [customDomain, setCustomDomainValue] = useState(organization.custom_domain || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(
    organization.custom_domain_verified ? 'verified' : organization.custom_domain ? 'pending' : null
  );

  // Custom domains are a paid add-on - check if organization has it enabled
  const hasCustomDomainAccess = !!organization.custom_domain || organization.subscription_tier === 'custom_domain';

  // Subdomain URL
  const subdomainUrl = `${organization.slug}.beerleaguehockey.ca`;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  const handleSetDomain = async () => {
    if (!customDomain) {
      toast.error('Please enter a domain');
      return;
    }

    setIsSaving(true);
    try {
      const result = await setCustomDomain(organization.id, customDomain);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Domain set successfully');
        setVerificationStatus('pending');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) return;
    setIsVerifying(true);
    try {
      const result = await verifyCustomDomain(organization.id);
      if (result.error) {
        toast.error(result.error);
        setVerificationStatus('failed');
      } else if (result.verified) {
        toast.success(result.message || 'Domain verified successfully!');
        setVerificationStatus('verified');
      }
    } catch {
      toast.error('An unexpected error occurred');
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm('Are you sure you want to remove this custom domain?')) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await removeCustomDomain(organization.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Custom domain removed');
        setCustomDomainValue('');
        setVerificationStatus(null);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subdomain Section */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-100 flex items-center gap-2">
                <Globe className="h-5 w-5 text-rink-500" />
                Your League Subdomain
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Your league is accessible at this free subdomain
              </CardDescription>
            </div>
            <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-neutral-400" />
                <span className="font-mono text-rink-500">{subdomainUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(`https://${subdomainUrl}`, 'subdomain')}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'text-neutral-400 hover:text-rink-500 hover:bg-neutral-700'
                  )}
                  title="Copy URL"
                >
                  {copied === 'subdomain' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={`https://${subdomainUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'text-neutral-400 hover:text-rink-500 hover:bg-neutral-700'
                  )}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="text-sm text-neutral-400">
            Your subdomain is automatically generated based on your organization slug.
            To change it, update your organization slug in the Profile settings.
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain Section */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-100 flex items-center gap-2">
                <Crown className="h-5 w-5 text-rink-500" />
                Custom Domain
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Use your own domain name for your league website
              </CardDescription>
            </div>
            {!hasCustomDomainAccess && (
              <Badge variant="outline" className="border-rink-500/50 text-rink-500">
                Paid Add-on
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCustomDomainAccess ? (
            // User has access to custom domains
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  Domain Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="yourdomain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomainValue(e.target.value)}
                    className={cn(
                      'flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl',
                      'text-neutral-100 placeholder-neutral-500',
                      'focus:outline-none focus:ring-2 focus:ring-rink-500/50'
                    )}
                  />
                  {!organization.custom_domain || customDomain !== organization.custom_domain ? (
                    <Button
                      variant="outline"
                      onClick={handleSetDomain}
                      disabled={!customDomain || isSaving}
                      className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Set Domain'
                      )}
                    </Button>
                  ) : verificationStatus !== 'verified' ? (
                    <Button
                      variant="outline"
                      onClick={handleVerifyDomain}
                      disabled={isVerifying}
                      className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Domain'
                      )}
                    </Button>
                  ) : null}
                  {organization.custom_domain && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveDomain}
                      disabled={isRemoving}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      {isRemoving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Current Custom Domain Status */}
              {(organization.custom_domain || verificationStatus) && (
                <div className={cn(
                  'border rounded-xl p-4',
                  verificationStatus === 'verified'
                    ? 'bg-green-900/20 border-green-500/30'
                    : verificationStatus === 'failed'
                    ? 'bg-red-900/20 border-red-500/30'
                    : 'bg-yellow-900/20 border-yellow-500/30'
                )}>
                  <div className="flex items-start gap-3">
                    {verificationStatus === 'verified' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : verificationStatus === 'failed' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={cn(
                        'font-medium',
                        verificationStatus === 'verified' ? 'text-green-400' :
                        verificationStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'
                      )}>
                        {verificationStatus === 'verified' ? 'Domain Verified' :
                         verificationStatus === 'failed' ? 'Verification Failed' : 'Verification Pending'}
                      </p>
                      <p className={cn(
                        'text-sm mt-1',
                        verificationStatus === 'verified' ? 'text-green-300' :
                        verificationStatus === 'failed' ? 'text-red-300' : 'text-yellow-300'
                      )}>
                        {verificationStatus === 'verified'
                          ? `Your league is accessible at ${customDomain}`
                          : verificationStatus === 'failed'
                          ? 'Please check your DNS settings and try again'
                          : 'Please configure your DNS settings and click "Verify Domain"'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* DNS Instructions */}
              <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-4">
                <h4 className="font-semibold text-neutral-100 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-rink-500" />
                  DNS Configuration
                </h4>
                <div className="space-y-3 text-sm">
                  <p className="text-neutral-400">
                    Add one of the following DNS records to your domain:
                  </p>
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
                    <div className="grid grid-cols-4 gap-2 text-neutral-500 border-b border-neutral-700 pb-2 mb-2">
                      <span>Type</span>
                      <span>Name</span>
                      <span>Value</span>
                      <span>TTL</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-neutral-300">
                      <span>CNAME</span>
                      <span>@ or www</span>
                      <span>cname.vercel-dns.com</span>
                      <span>3600</span>
                    </div>
                  </div>
                  <p className="text-neutral-500 text-xs">
                    DNS changes can take up to 48 hours to propagate globally.
                  </p>
                </div>
              </div>
            </>
          ) : (
            // User needs to purchase custom domain add-on
            <div className="bg-gradient-to-br from-rink-500/10 to-rink-600/5 border border-rink-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rink-500/20">
                  <Crown className="h-6 w-6 text-rink-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-100 mb-2">
                    Custom Domain Add-on
                  </h4>
                  <p className="text-sm text-neutral-400 mb-4">
                    Custom domains allow you to use your own domain name (e.g., yourleague.com)
                    instead of the default subdomain. Contact us for custom pricing.
                  </p>
                  <ul className="text-sm text-neutral-400 space-y-2 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-rink-500" />
                      Use your own branded domain
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-rink-500" />
                      Automatic SSL certificate included
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-rink-500" />
                      DNS verification and setup assistance
                    </li>
                  </ul>
                  <Button
                    className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold"
                    asChild
                  >
                    <a href="mailto:support@beerleaguehockey.ca?subject=Custom Domain Setup">
                      <Mail className="h-4 w-4 mr-2" />
                      Get a Quote
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Help Section */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-rink-500" />
            Domain FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-200 mb-1">
                What is a subdomain?
              </h4>
              <p className="text-sm text-neutral-400">
                A subdomain is a free address for your league in the format
                <code className="mx-1 px-2 py-0.5 bg-neutral-900 rounded text-rink-500">yourleague.beerleaguehockey.ca</code>.
                All organizations get a free subdomain automatically.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-200 mb-1">
                What is a custom domain?
              </h4>
              <p className="text-sm text-neutral-400">
                A custom domain is your own domain name (like
                <code className="mx-1 px-2 py-0.5 bg-neutral-900 rounded text-rink-500">yourleague.com</code>)
                that you purchase separately. You can then point it to your league website for
                professional branding.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-200 mb-1">
                How long does DNS verification take?
              </h4>
              <p className="text-sm text-neutral-400">
                DNS changes typically propagate within 5-60 minutes, but can take up to 48 hours
                in some cases. We&apos;ll automatically check the status and notify you when verification
                is complete.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-200 mb-1">
                Is SSL included?
              </h4>
              <p className="text-sm text-neutral-400">
                Yes! SSL certificates are automatically provisioned for both subdomains and custom
                domains. Your league website will always be secure with HTTPS.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
