'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@hockey-life/ui';
import { cn } from '@hockey-life/ui';
import {
  createLeagueBackupToken,
  exportLeagueBackup,
  revokeLeagueBackupToken,
  type LeagueBackupTokenListItem,
} from '@/lib/actions/league-backup';
import {
  Copy,
  Database,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

type Props = {
  leagueId: string;
  locale: string;
  endpoint: string;
  tokens: LeagueBackupTokenListItem[];
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function MigrationBackupPanel({ leagueId, locale, endpoint, tokens }: Props) {
  const [isPending, startTransition] = useTransition();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [label, setLabel] = useState('Nightly backup');
  const [expiresAt, setExpiresAt] = useState('');
  const [localTokens, setLocalTokens] = useState(tokens);

  const curlExample = useMemo(
    () =>
      `curl -H "Authorization: Bearer ${revealedToken ?? 'YOUR_BACKUP_TOKEN'}" "${endpoint}" -o league-backup.json`,
    [endpoint, revealedToken]
  );

  function copyText(value: string, successMessage: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(successMessage))
      .catch(() => toast.error('Copy failed'));
  }

  function handleCreateToken() {
    startTransition(async () => {
      const result = await createLeagueBackupToken({
        leagueId,
        locale,
        label,
        expiresAt: expiresAt || null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setRevealedToken(result.data.token);
      setLocalTokens((current) => [result.data.record, ...current]);
      toast.success('Backup token created');
    });
  }

  function handleRevokeToken(tokenId: string) {
    startTransition(async () => {
      const result = await revokeLeagueBackupToken({ leagueId, locale, tokenId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setLocalTokens((current) =>
        current.map((token) => (token.id === tokenId ? result.data : token))
      );
      toast.success('Backup token revoked');
    });
  }

  function handleDownloadBackup() {
    startTransition(async () => {
      const result = await exportLeagueBackup(leagueId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const blob = new Blob([JSON.stringify(result.data.payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('League backup downloaded');
    });
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="text-xl font-bold">League-owned backup API</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            This gives league owners a clean export endpoint so they can mirror their BLH data into their own database on a schedule. It is designed for vendor-exit confidence and internal backups.
          </p>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Backup endpoint</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-cyan-100">{endpoint}</code>
              <button
                type="button"
                onClick={() => copyText(endpoint, 'Backup endpoint copied')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/20"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              The export returns normalized JSON for league setup, teams, schedules, registrations, billing, stats, content, and migration history.
            </p>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold">Create a backup token</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Nightly backup"
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-neutral-500"
              />
              <Input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="border-white/10 bg-white/[0.04] text-white"
              />
              <button
                type="button"
                onClick={handleCreateToken}
                disabled={isPending}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-[border-color,background-color,color,transform]',
                  'hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-400/15',
                  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'
                )}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Create token
              </button>
            </div>

            {revealedToken && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">Copy this token now</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                  For safety, the raw token is only shown once. Store it in the league’s password manager or backup system.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-xl bg-black/20 px-3 py-2 text-sm text-emerald-50">{revealedToken}</code>
                  <button
                    type="button"
                    onClick={() => copyText(revealedToken, 'Backup token copied')}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy token
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Database className="h-4 w-4 text-rink-300" />
                <p className="text-sm font-semibold">Manual JSON export</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/20"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download now
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              This downloads the same normalized payload the API returns, which is useful for one-off backups or verifying the structure before wiring a sync job.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white">
              <RefreshCw className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold">Example request</p>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-neutral-950/80 p-4 text-xs leading-6 text-neutral-300">
              {curlExample}
            </pre>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold">Active tokens</p>
            </div>
            <div className="mt-4 space-y-3">
              {localTokens.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
                  No backup tokens created yet.
                </div>
              ) : (
                localTokens.map((token) => (
                  <div key={token.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{token.label}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Created {formatDateTime(token.created_at)}
                        </p>
                      </div>
                      {token.revoked_at ? (
                        <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-[11px] font-semibold text-rose-100">
                          Revoked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeToken(token.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:border-rose-300/35"
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Revoke
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Last used</p>
                        <p className="mt-1 text-sm text-neutral-300">{formatDateTime(token.last_used_at)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Expires</p>
                        <p className="mt-1 text-sm text-neutral-300">{formatDateTime(token.expires_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
