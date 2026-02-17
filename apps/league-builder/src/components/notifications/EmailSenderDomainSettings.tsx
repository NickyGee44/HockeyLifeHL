'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import {
  addLeagueEmailDomain,
  verifyLeagueEmailDomain,
  removeLeagueEmailDomain,
} from '@/lib/actions/email-sender-domain';
import type { ResendDomainRecord } from '@/lib/notifications/resend-domains';

interface EmailSenderDomainSettingsProps {
  leagueId: string;
  leagueName: string;
  initialDomain: string | null;
  initialVerified: boolean | null;
  initialFromName: string | null;
  initialRecords: ResendDomainRecord[];
  initialStatus: string | null;
}

export function EmailSenderDomainSettings({
  leagueId,
  leagueName,
  initialDomain,
  initialVerified,
  initialFromName,
  initialRecords,
  initialStatus,
}: EmailSenderDomainSettingsProps) {
  const [domain, setDomain] = useState(initialDomain || '');
  const [fromName, setFromName] = useState(initialFromName || leagueName);
  const [records, setRecords] = useState<ResendDomainRecord[]>(initialRecords);
  const [status, setStatus] = useState(initialStatus);
  const [isVerified, setIsVerified] = useState(initialVerified ?? false);
  const [hasDomain, setHasDomain] = useState(!!initialDomain);

  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setIsSaving(true);
    try {
      const result = await addLeagueEmailDomain(leagueId, domain.trim(), fromName);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Domain registered');
        setRecords(result.records || []);
        setStatus(result.status || 'pending');
        setHasDomain(true);
        setIsVerified(false);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyLeagueEmailDomain(leagueId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setRecords(result.records || []);
        setStatus(result.status || 'pending');
        setIsVerified(result.verified ?? false);
        if (result.verified) {
          toast.success(result.message || 'Domain verified!');
        } else {
          toast.info(result.message || 'DNS records not yet verified');
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove this custom email domain? Emails will revert to the platform default.')) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await removeLeagueEmailDomain(leagueId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Domain removed');
        setDomain('');
        setFromName(leagueName);
        setRecords([]);
        setStatus(null);
        setIsVerified(false);
        setHasDomain(false);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-rink-500" />
                Email Sending Domain
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Send league emails from your own domain instead of beerleaguehockey.ca
              </CardDescription>
            </div>
            {hasDomain && (
              <Badge className={cn(
                isVerified
                  ? 'bg-green-600/20 text-green-400 border-green-500/30'
                  : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'
              )}>
                {isVerified ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Pending</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300">
              Domain Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="barriemenshockey.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={hasDomain}
                className={cn(
                  'flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl',
                  'text-neutral-100 placeholder-neutral-500',
                  'focus:outline-none focus:ring-2 focus:ring-rink-500/50',
                  hasDomain && 'opacity-70 cursor-not-allowed'
                )}
              />
              {!hasDomain ? (
                <Button
                  variant="outline"
                  onClick={handleAddDomain}
                  disabled={!domain.trim() || isSaving}
                  className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                >
                  {isSaving ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Add Domain'
                  )}
                </Button>
              ) : !isVerified ? (
                <Button
                  variant="outline"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="border-rink-500/50 text-rink-500 hover:bg-rink-500/10"
                >
                  {isVerifying ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                  ) : (
                    'Verify Domain'
                  )}
                </Button>
              ) : null}
              {hasDomain && (
                <Button
                  variant="outline"
                  onClick={handleRemove}
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

          {/* From Name Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300">
              From Name
            </label>
            <input
              type="text"
              placeholder={leagueName}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              disabled={hasDomain}
              className={cn(
                'w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl',
                'text-neutral-100 placeholder-neutral-500',
                'focus:outline-none focus:ring-2 focus:ring-rink-500/50',
                hasDomain && 'opacity-70 cursor-not-allowed'
              )}
            />
            <p className="text-xs text-neutral-500">
              Emails will be sent as: {fromName || leagueName} &lt;noreply@{domain || 'yourdomain.com'}&gt;
            </p>
          </div>

          {/* Verification Status Banner */}
          {hasDomain && (
            <div className={cn(
              'border rounded-xl p-4',
              isVerified
                ? 'bg-green-900/20 border-green-500/30'
                : status === 'failed'
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-yellow-900/20 border-yellow-500/30'
            )}>
              <div className="flex items-start gap-3">
                {isVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : status === 'failed' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'font-medium',
                    isVerified ? 'text-green-400' :
                    status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {isVerified ? 'Domain Verified' :
                     status === 'failed' ? 'Verification Failed' : 'Verification Pending'}
                  </p>
                  <p className={cn(
                    'text-sm mt-1',
                    isVerified ? 'text-green-300' :
                    status === 'failed' ? 'text-red-300' : 'text-yellow-300'
                  )}>
                    {isVerified
                      ? `Emails are now sent from ${fromName} <noreply@${domain}>`
                      : status === 'failed'
                      ? 'Some DNS records failed verification. Check below and try again.'
                      : 'Add the DNS records below, then click "Verify Domain".'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Records Table */}
      {hasDomain && records.length > 0 && (
        <Card className="bg-neutral-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-neutral-100 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-rink-500" />
              Required DNS Records
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Add these records to your DNS provider. All records must be verified for email sending to work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {records.map((record, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/50 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-200">
                        {record.record}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {record.type}
                      </Badge>
                    </div>
                    <Badge className={cn(
                      'text-xs',
                      record.status === 'verified'
                        ? 'bg-green-600/20 text-green-400 border-green-500/30'
                        : record.status === 'failed'
                        ? 'bg-red-600/20 text-red-400 border-red-500/30'
                        : 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'
                    )}>
                      {record.status === 'verified' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                      ) : record.status === 'failed' ? (
                        <><AlertCircle className="h-3 w-3 mr-1" /> Failed</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1" /> Pending</>
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Name / Host</span>
                      <button
                        onClick={() => handleCopy(record.name, `name-${idx}`)}
                        className="text-neutral-400 hover:text-rink-500 transition-colors"
                      >
                        {copied === `name-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-neutral-300 bg-black/30 rounded-lg px-3 py-2 break-all">
                      {record.name}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-500">Value</span>
                      <button
                        onClick={() => handleCopy(record.value, `value-${idx}`)}
                        className="text-neutral-400 hover:text-rink-500 transition-colors"
                      >
                        {copied === `value-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-neutral-300 bg-black/30 rounded-lg px-3 py-2 break-all">
                      {record.value}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
                      <span>TTL: {record.ttl}</span>
                      {record.priority !== undefined && <span>Priority: {record.priority}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-neutral-500 mt-4">
              DNS changes can take up to 48 hours to propagate. Click &ldquo;Verify Domain&rdquo; to check status.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-rink-500" />
            Email Domain FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-neutral-200 mb-1">
              Why set up a custom email domain?
            </h4>
            <p className="text-sm text-neutral-400">
              By default, league emails are sent from noreply@beerleaguehockey.ca. With a custom
              domain, emails come from your own address (e.g., noreply@barriemenshockey.com),
              improving deliverability and brand recognition.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-neutral-200 mb-1">
              What DNS records are needed?
            </h4>
            <p className="text-sm text-neutral-400">
              You need to add SPF, DKIM, and DMARC records. These authenticate your domain
              for email sending and prevent your messages from being marked as spam.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-neutral-200 mb-1">
              How long does verification take?
            </h4>
            <p className="text-sm text-neutral-400">
              DNS changes typically propagate within 5-60 minutes, but can take up to 48 hours.
              Click &ldquo;Verify Domain&rdquo; to check the current status of each record.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
