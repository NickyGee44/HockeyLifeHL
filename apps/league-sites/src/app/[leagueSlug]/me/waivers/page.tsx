'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  FileCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';

/**
 * DOMPurify configuration for waiver content sanitization
 *
 * Security considerations:
 * - Blocks all script execution (inline scripts, event handlers, javascript: URLs)
 * - Blocks dangerous elements (iframe, object, embed, form, input, style)
 * - Allows only safe formatting tags for legal document display
 * - Blocks data: URLs which can be used for XSS
 * - Prevents DOM clobbering attacks
 */
const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'hr', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'id',
    'colspan', 'rowspan', 'align', 'valign',
  ],
  // Block javascript: URLs and data: URLs - only allow safe protocols
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Disable data attributes (potential XSS vector)
  ALLOW_DATA_ATTR: false,
  // Prevent DOM clobbering attacks
  SANITIZE_DOM: true,
};

/**
 * Sanitize HTML content and ensure all links are safe
 * Returns sanitized HTML string safe for dangerouslySetInnerHTML
 */
function sanitizeWaiverContent(content: string | undefined): string {
  if (!content) return '';

  // First sanitize with DOMPurify
  let sanitized = DOMPurify.sanitize(content, DOMPURIFY_CONFIG);

  // Post-process: ensure all anchor tags have secure attributes
  // This adds target="_blank" and rel="noopener noreferrer" to prevent tabnabbing attacks
  sanitized = sanitized.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      // Remove any existing target/rel attributes to avoid duplicates
      const cleanAttrs = attrs
        .replace(/\s*target\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*rel\s*=\s*["'][^"']*["']/gi, '')
        .trim();
      return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer">`;
    }
  );

  return sanitized;
}

interface Waiver {
  id: string;
  name: string;
  content: string;
  is_required: boolean;
  created_at: string;
}

interface WaiverSignature {
  id: string;
  waiver_template_id: string;
  signed_name: string;
  signed_at: string;
}

interface WaiverWithStatus extends Waiver {
  signature?: WaiverSignature;
  isSigned: boolean;
}

interface WaiversPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default function WaiversPage({ params }: WaiversPageProps) {
  const { leagueSlug } = use(params);
  const { profile, isLoading: profileLoading } = usePlayerProfile();
  const [waivers, setWaivers] = useState<WaiverWithStatus[]>([]);
  const [selectedWaiver, setSelectedWaiver] = useState<WaiverWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchWaivers = useCallback(async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const supabase = createClient();

      // Fetch waivers for this league
      // First we need to get the league ID from the slug
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('id')
        .eq('slug', leagueSlug)
        .single();

      if (leagueError) {
        throw new Error('Unable to find league. Please check the URL and try again.');
      }

      if (!league) {
        throw new Error('League not found.');
      }

      // Get waivers (actual table: league_waiver_templates)
      const { data: waiversData, error: waiversError } = await supabase
        .from('league_waiver_templates')
        .select('*')
        .eq('league_id', league.id)
        .order('created_at', { ascending: true });

      if (waiversError) {
        throw new Error('Failed to load waivers. Please try again.');
      }

      // Get player's signatures (actual table: player_waivers)
      const { data: signaturesData, error: signaturesError } = await supabase
        .from('player_waivers')
        .select('*')
        .eq('player_id', profile.id);

      if (signaturesError) {
        throw new Error('Failed to load your waiver signatures. Please try again.');
      }

      // Combine waivers with signature status
      const waiversWithStatus: WaiverWithStatus[] = (waiversData || []).map((waiver: Waiver) => {
        const signature = (signaturesData || []).find(
          (sig: WaiverSignature) => sig.waiver_template_id === waiver.id
        );
        return {
          ...waiver,
          signature,
          isSigned: !!signature,
        };
      });

      setWaivers(waiversWithStatus);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [profile, leagueSlug]);

  useEffect(() => {
    if (!profileLoading) {
      fetchWaivers();
    }
  }, [profileLoading, fetchWaivers]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchWaivers();
  };

  const handleSign = async () => {
    if (!selectedWaiver || !profile || !signedName.trim() || !agreedToTerms) {
      return;
    }

    setIsSigning(true);
    setSignError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.from('player_waivers').insert({
        waiver_template_id: selectedWaiver.id,
        player_id: profile.id,
        signed_name: signedName.trim(),
        signed_at: new Date().toISOString(),
        // Note: IP address, user agent, and waiver_content_hash would be captured server-side
      });

      if (error) {
        throw error;
      }

      // Update local state
      setWaivers((prev) =>
        prev.map((w) =>
          w.id === selectedWaiver.id
            ? {
                ...w,
                isSigned: true,
                signature: {
                  id: 'new',
                  waiver_template_id: selectedWaiver.id,
                  signed_name: signedName.trim(),
                  signed_at: new Date().toISOString(),
                },
              }
            : w
        )
      );

      setSelectedWaiver(null);
      setSignedName('');
      setAgreedToTerms(false);
    } catch (error: any) {
      setSignError(error.message || 'Failed to sign waiver. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const unsignedCount = waivers.filter((w) => !w.isSigned && w.is_required).length;
  const signedCount = waivers.filter((w) => w.isSigned).length;

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading waivers...</p>
        </div>
      </div>
    );
  }

  // Show error state for fetch failures
  if (fetchError && !selectedWaiver) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/${leagueSlug}/me`}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Waivers & Forms</h1>
            <p className="text-[var(--color-text-secondary)]">
              Review and sign required documents
            </p>
          </div>
        </div>
        <ErrorCard
          title="Unable to Load Waivers"
          message={fetchError}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  // Waiver Detail View
  if (selectedWaiver) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => setSelectedWaiver(null)}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Waivers
        </button>

        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--league-primary)]/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[var(--league-primary)]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {selectedWaiver.name}
                  </h1>
                  {selectedWaiver.is_required && (
                    <span className="inline-block mt-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Waiver Content - HTML is sanitized with DOMPurify to prevent XSS */}
            <div className="p-6 max-h-[400px] overflow-y-auto bg-[var(--color-background)]">
              <div className="prose prose-invert prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap text-[var(--color-text-secondary)]"
                  dangerouslySetInnerHTML={{ __html: sanitizeWaiverContent(selectedWaiver.content) }}
                />
              </div>
            </div>

            {/* Signature Section */}
            {selectedWaiver.isSigned ? (
              <div className="p-6 border-t border-[var(--color-border)] bg-green-500/5">
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Signed by {selectedWaiver.signature?.signed_name}</p>
                    <p className="text-sm text-green-400/70">
                      {selectedWaiver.signature?.signed_at
                        ? formatDate(selectedWaiver.signature.signed_at)
                        : 'Date unknown'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 border-t border-[var(--color-border)]">
                <div className="space-y-4">
                  {/* Agreement Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      I have read and agree to the terms and conditions outlined in this waiver.
                      I understand that by signing below, I am legally bound by the terms of this agreement.
                    </span>
                  </label>

                  {/* Signature Input */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Type your full legal name to sign
                    </label>
                    <input
                      type="text"
                      value={signedName}
                      onChange={(e) => setSignedName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
                    />
                  </div>

                  {/* Error Message */}
                  {signError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-400">{signError}</p>
                          <button
                            onClick={() => setSignError(null)}
                            className="text-xs text-red-400/70 hover:text-red-300 mt-1 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sign Button */}
                  <button
                    onClick={handleSign}
                    disabled={!signedName.trim() || !agreedToTerms || isSigning}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--league-primary)] text-[var(--color-background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        Sign Waiver
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/me`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Waivers & Forms</h1>
          <p className="text-[var(--color-text-secondary)]">
            Review and sign required documents
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {unsignedCount > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            You have <strong>{unsignedCount}</strong> required waiver{unsignedCount > 1 ? 's' : ''}{' '}
            to sign before you can participate.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{signedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Signed</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{unsignedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Waivers List */}
      {waivers.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No waivers required for this league.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waivers.map((waiver) => (
            <button
              key={waiver.id}
              onClick={() => setSelectedWaiver(waiver)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    waiver.isSigned
                      ? 'bg-green-500/10'
                      : 'bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {waiver.isSigned ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                      {waiver.name}
                    </h3>
                    {waiver.is_required && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {waiver.isSigned ? (
                      <>
                        Signed on{' '}
                        {waiver.signature?.signed_at
                          ? new Date(waiver.signature.signed_at).toLocaleDateString()
                          : 'Unknown date'}
                      </>
                    ) : (
                      'Click to review and sign'
                    )}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    waiver.isSigned
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {waiver.isSigned ? 'Signed' : 'Pending'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
