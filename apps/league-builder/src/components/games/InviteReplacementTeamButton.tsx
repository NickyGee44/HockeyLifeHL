'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { sendReplacementTeamInvites, type ReplacementInviteSummary } from '@/lib/actions/replacement-team-invites';
import { Loader2, MailPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface InviteReplacementTeamButtonProps {
  locale: string;
  summary: ReplacementInviteSummary;
}

export function InviteReplacementTeamButton({ locale, summary }: InviteReplacementTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(summary.candidates.map((candidate) => candidate.teamId));
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const allSelected = useMemo(
    () => summary.candidates.length > 0 && selectedTeamIds.length === summary.candidates.length,
    [selectedTeamIds.length, summary.candidates.length],
  );

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((value) => value !== teamId)
        : [...current, teamId],
    );
  }

  function toggleAll() {
    setSelectedTeamIds(allSelected ? [] : summary.candidates.map((candidate) => candidate.teamId));
  }

  async function handleSend() {
    setSending(true);

    const result = await sendReplacementTeamInvites({
      gameId: summary.gameId,
      locale,
      teamIds: selectedTeamIds,
      note,
    });

    if (!result.success) {
      toast.error(result.error);
      setSending(false);
      return;
    }

    toast.success(
      result.data.failed.length > 0
        ? `Sent ${result.data.sent} invite(s). Failed: ${result.data.failed.join(', ')}`
        : `Sent ${result.data.sent} replacement team invite(s).`,
    );
    setOpen(false);
    router.refresh();
    setSending(false);
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-rink-500/30 text-rink-400 hover:bg-rink-500/10 hover:text-rink-300"
        onClick={() => setOpen(true)}
      >
        <MailPlus className="mr-2 h-4 w-4" />
        Invite Replacement Teams
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-neutral-900 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite available team captains</DialogTitle>
            <DialogDescription className="text-neutral-400">
              BLH will email captains whose teams are not already scheduled that night.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-neutral-300">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="text-neutral-500">Matchup:</span> {summary.matchupLabel}</p>
                <p><span className="text-neutral-500">Division:</span> {summary.divisionLabel}</p>
                <p><span className="text-neutral-500">Date:</span> {new Date(summary.scheduledAt).toLocaleDateString('en-US', {
                  timeZone: summary.timezone,
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}</p>
                <p><span className="text-neutral-500">Time:</span> {new Date(summary.scheduledAt).toLocaleTimeString('en-US', {
                  timeZone: summary.timezone,
                  hour: 'numeric',
                  minute: '2-digit',
                })} ({summary.timezone})</p>
                <p className="md:col-span-2"><span className="text-neutral-500">Location:</span> {summary.location || 'TBD'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Users className="h-4 w-4 text-rink-500" />
                  Eligible team captains
                </div>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-rink-400 transition-colors hover:text-rink-300"
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-neutral-950/50 p-3">
                {summary.candidates.map((candidate) => {
                  const checked = selectedTeamIds.includes(candidate.teamId);
                  return (
                    <label
                      key={candidate.teamId}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeam(candidate.teamId)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-neutral-900 text-rink-500"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-white">{candidate.teamName}</p>
                        <p className="text-sm text-neutral-400">
                          {candidate.captainName} • {candidate.captainEmail}
                        </p>
                        {candidate.divisionName ? (
                          <p className="text-xs text-neutral-500">{candidate.divisionName}</p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Optional note</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Use this to explain which team slot is open or any extra details captains should know."
                className="min-h-[96px] border-white/10 bg-black/30 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || selectedTeamIds.length === 0}
              className="bg-gradient-to-r from-rink-500 to-arena-500 text-black"
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
              Send invites
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
