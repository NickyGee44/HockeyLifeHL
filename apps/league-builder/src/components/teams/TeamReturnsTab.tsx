'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Mail,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getSeasonTeamReturnsOverview,
  sendSeasonTeamReturnCampaign,
  syncSeasonTeamReturns,
  updateSeasonTeamReturnRecord,
  type TeamReturnOverview,
  type TeamReturnOwnerFlag,
} from '@/lib/actions/team-returns';

interface SeasonOption {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
}

interface TeamReturnsTabProps {
  leagueId: string;
  seasons: SeasonOption[];
}

const FLAG_OPTIONS: Array<{ value: TeamReturnOwnerFlag; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'priority_follow_up', label: 'Priority follow-up' },
  { value: 'waitlist_watch', label: 'Watch waitlist' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'ready_to_confirm', label: 'Ready to confirm' },
];

function pickDefaultSeasonId(seasons: SeasonOption[]): string | null {
  if (seasons.length === 0) return null;
  const upcoming = [...seasons]
    .filter((season) => season.status === 'upcoming')
    .sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];

  if (upcoming) return upcoming.id;

  return seasons.find((season) => season.status === 'draft')?.id
    ?? seasons.find((season) => season.status === 'playoffs' || season.status === 'active')?.id
    ?? seasons[0]?.id
    ?? null;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending_outreach':
      return 'Pending outreach';
    case 'contacted':
      return 'Contacted';
    case 'interested':
      return 'Interested';
    case 'follow_up_needed':
      return 'Follow-up needed';
    case 'confirmed':
      return 'Confirmed';
    case 'declined':
      return 'Not returning';
    default:
      return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'declined':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'follow_up_needed':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'interested':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
    default:
      return 'border-white/10 bg-white/5 text-neutral-200';
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function TeamReturnsTab({ leagueId, seasons }: TeamReturnsTabProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(() => pickDefaultSeasonId(seasons));
  const [overview, setOverview] = useState<TeamReturnOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTeamIds, setComposeTeamIds] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<'return_invite' | 'follow_up' | 'status_update'>('return_invite');
  const [isSending, setIsSending] = useState(false);
  const [editorEntry, setEditorEntry] = useState<TeamReturnOverview['entries'][number] | null>(null);
  const [editorStatus, setEditorStatus] = useState<'declined' | null>(null);
  const [editorNotes, setEditorNotes] = useState('');
  const [editorInternalNotes, setEditorInternalNotes] = useState('');
  const [editorDeclinedReason, setEditorDeclinedReason] = useState('');
  const [isSavingEditor, setIsSavingEditor] = useState(false);

  async function loadOverview(seasonId = selectedSeasonId) {
    if (!seasonId) return;
    setIsLoading(true);
    const result = await getSeasonTeamReturnsOverview(leagueId, seasonId);
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setOverview(result.data);
  }

  useEffect(() => {
    if (selectedSeasonId) {
      queueMicrotask(() => {
        void loadOverview(selectedSeasonId);
      });
    }
  }, [selectedSeasonId]);

  function openCompose(teamIds: string[], type: 'return_invite' | 'follow_up' | 'status_update') {
    setComposeTeamIds(teamIds);
    setComposeType(type);

    const seasonName = overview?.targetSeason?.name || 'the upcoming season';
    const sourceName = overview?.sourceSeason?.name || 'last season';
    const defaultSubject =
      type === 'follow_up'
        ? `Quick follow-up: is your team returning for ${seasonName}?`
        : type === 'status_update'
          ? `Update needed for ${seasonName}`
          : `Confirm your team return for ${seasonName}`;
    const defaultBody =
      type === 'follow_up'
        ? `We’re following up on **${seasonName}** and want to know whether your team is returning.\n\nIf you’re planning to come back, please reply so we can hold your spot and keep returning players aligned with your team.`
        : type === 'status_update'
          ? `We’re updating team statuses for **${seasonName}**.\n\nIf anything has changed since **${sourceName}**, please reply so we can keep registrations and roster planning accurate.`
          : `We’re opening registration for **${seasonName}** and want to confirm whether your team is returning.\n\nPlease reply and let us know if your group is back this season so we can keep returning players tied to the right team.`;

    setComposeSubject(defaultSubject);
    setComposeBody(defaultBody);
    setComposeOpen(true);
  }

  function openEditor(
    entry: TeamReturnOverview['entries'][number],
    nextStatus: 'declined' | null = null
  ) {
    setEditorEntry(entry);
    setEditorStatus(nextStatus);
    setEditorNotes(entry.notes || '');
    setEditorInternalNotes(entry.internalNotes || '');
    setEditorDeclinedReason(entry.declinedReason || '');
  }

  function closeEditor() {
    setEditorEntry(null);
    setEditorStatus(null);
    setEditorNotes('');
    setEditorInternalNotes('');
    setEditorDeclinedReason('');
    setIsSavingEditor(false);
  }

  async function handleSync() {
    if (!selectedSeasonId) return;
    setIsSyncing(true);
    const result = await syncSeasonTeamReturns(leagueId, selectedSeasonId);
    setIsSyncing(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`Synced ${result.data.synced} returning team records`);
    await loadOverview(selectedSeasonId);
  }

  async function handleStatusUpdate(teamId: string, status: 'interested' | 'follow_up_needed' | 'confirmed' | 'declined') {
    if (!selectedSeasonId) return;
    setPendingRowId(teamId);
    const result = await updateSeasonTeamReturnRecord({
      leagueId,
      seasonId: selectedSeasonId,
      teamId,
      status,
    });
    setPendingRowId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(status === 'confirmed' ? 'Team confirmed' : status === 'declined' ? 'Team marked as not returning' : 'Team status updated');
    await loadOverview(selectedSeasonId);
  }

  async function handleFlagUpdate(teamId: string, ownerFlag: TeamReturnOwnerFlag) {
    if (!selectedSeasonId) return;
    setPendingRowId(teamId);
    const result = await updateSeasonTeamReturnRecord({
      leagueId,
      seasonId: selectedSeasonId,
      teamId,
      ownerFlag,
    });
    setPendingRowId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    await loadOverview(selectedSeasonId);
  }

  async function handleSaveEditor() {
    if (!selectedSeasonId || !editorEntry) return;
    if (editorStatus === 'declined' && !editorDeclinedReason.trim()) {
      toast.error('Add a decline reason so your staff can follow the return decision.');
      return;
    }

    setIsSavingEditor(true);
    const result = await updateSeasonTeamReturnRecord({
      leagueId,
      seasonId: selectedSeasonId,
      teamId: editorEntry.teamId,
      status: editorStatus ?? undefined,
      notes: editorNotes.trim() || null,
      internalNotes: editorInternalNotes.trim() || null,
      declinedReason:
        editorStatus === 'declined'
          ? editorDeclinedReason.trim() || null
          : editorDeclinedReason.trim() || null,
    });
    setIsSavingEditor(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(
      editorStatus === 'declined'
        ? 'Team marked as not returning'
        : 'Team return notes updated'
    );
    closeEditor();
    await loadOverview(selectedSeasonId);
  }

  async function handleSendCampaign() {
    if (!selectedSeasonId || composeTeamIds.length === 0) return;
    setIsSending(true);
    const result = await sendSeasonTeamReturnCampaign({
      leagueId,
      seasonId: selectedSeasonId,
      teamIds: composeTeamIds,
      subject: composeSubject,
      content: composeBody,
      campaignType: composeType,
    });
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`Sent ${result.data.sent} return campaign email${result.data.sent === 1 ? '' : 's'}`);
    setComposeOpen(false);
    await loadOverview(selectedSeasonId);
  }

  const targetSeasonName = overview?.targetSeason?.name || 'season';
  const actionableTeamIds = overview?.entries
    .filter((entry) => entry.status !== 'confirmed' && entry.status !== 'declined')
    .map((entry) => entry.teamId) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Team Return Campaigns</h2>
              <p className="text-sm text-neutral-400">
                Keep previous teams warm, track who is coming back, and preserve waiting player registrations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedSeasonId || ''}
            onChange={(event) => setSelectedSeasonId(event.target.value)}
            className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} {season.status ? `(${season.status})` : ''}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={handleSync}
            disabled={!selectedSeasonId || isSyncing}
            className="border-white/10 bg-transparent text-neutral-200 hover:bg-white/5"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Return List
          </Button>
          <Button
            type="button"
            onClick={() => openCompose(actionableTeamIds, 'return_invite')}
            disabled={actionableTeamIds.length === 0}
            className="bg-cyan-500 text-black hover:bg-cyan-400"
          >
            <Mail className="mr-2 h-4 w-4" />
            Invite Outstanding Teams
          </Button>
        </div>
      </div>

      {overview?.sourceSeason && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
          Building return targets from <span className="font-semibold text-white">{overview.sourceSeason.name}</span> into{' '}
          <span className="font-semibold text-white">{overview.targetSeason?.name}</span>.
        </div>
      )}

      {!overview?.sourceSeason && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          There is no prior season to seed from yet. Once you have a previous season on record, return campaigns will auto-build a team return list from it.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Tracked Teams', value: overview?.summary.totalTeams ?? 0 },
          { label: 'Confirmed', value: overview?.summary.confirmedTeams ?? 0 },
          { label: 'Pending Outreach', value: overview?.summary.pendingOutreachTeams ?? 0 },
          { label: 'Needs Follow-Up', value: overview?.summary.followUpTeams ?? 0 },
          { label: 'Not Returning', value: overview?.summary.declinedTeams ?? 0 },
          { label: 'Waiting Players', value: overview?.summary.waitingPlayers ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-neutral-500">{stat.label}</div>
            <div className="mt-2 text-2xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-neutral-300">
          Loading return campaign data…
        </div>
      )}

      {!isLoading && overview && overview.entries.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-neutral-500" />
          <h3 className="text-lg font-semibold text-white">No return targets yet</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Sync the return list once the target season exists and there is a prior season to copy from.
          </p>
        </div>
      )}

      {!isLoading && overview && overview.entries.length > 0 && (
        <div className="space-y-4">
          {overview.entries.map((entry) => (
            <div key={entry.recordId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{entry.teamName}</h3>
                    {entry.divisionName && (
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                        {entry.divisionName}
                      </span>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(entry.status)}`}>
                      {statusLabel(entry.status)}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-neutral-300 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-neutral-500">Captain / Contact</div>
                      <div className="font-medium text-white">{entry.captainName || 'Unassigned'}</div>
                      <div>{entry.captainEmail || 'No email on file'}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Waiting Players</div>
                      <div className="font-medium text-white">{entry.waitingPlayerCount}</div>
                      {entry.confirmedPlayerCount > 0 && (
                        <div className="text-xs text-neutral-400">{entry.confirmedPlayerCount} already aligned</div>
                      )}
                    </div>
                    <div>
                      <div className="text-neutral-500">Last Contact</div>
                      <div className="font-medium text-white">{formatDate(entry.lastContactedAt)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Last Response</div>
                      <div className="font-medium text-white">{formatDate(entry.lastResponseAt)}</div>
                    </div>
                  </div>

                  {entry.latestCampaignSubject && (
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-neutral-300">
                      Last campaign: <span className="text-white">{entry.latestCampaignSubject}</span>
                    </div>
                  )}

                  {entry.declinedReason && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      Decline reason: {entry.declinedReason}
                    </div>
                  )}

                  {entry.notes && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                      League note: {entry.notes}
                    </div>
                  )}

                  {entry.captainResponseNote && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      Captain response{entry.captainResponseAt ? ` (${formatDate(entry.captainResponseAt)})` : ''}: {entry.captainResponseNote}
                    </div>
                  )}

                  {entry.internalNotes && (
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-neutral-300">
                      Internal notes: {entry.internalNotes}
                    </div>
                  )}
                </div>

                <div className="flex min-w-[280px] flex-col gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                      Owner Flag
                    </label>
                    <select
                      value={entry.ownerFlag}
                      onChange={(event) => void handleFlagUpdate(entry.teamId, event.target.value as TeamReturnOwnerFlag)}
                      className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
                    >
                      {FLAG_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openCompose([entry.teamId], entry.status === 'follow_up_needed' ? 'follow_up' : 'return_invite')}
                      className="border-white/10 bg-transparent text-neutral-200 hover:bg-white/5"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditor(entry)}
                      className="border-white/10 bg-transparent text-neutral-200 hover:bg-white/5"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Notes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleStatusUpdate(entry.teamId, 'interested')}
                      disabled={pendingRowId === entry.teamId}
                      className="border-cyan-500/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Interested
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleStatusUpdate(entry.teamId, 'follow_up_needed')}
                      disabled={pendingRowId === entry.teamId}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                    >
                      Follow Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleStatusUpdate(entry.teamId, 'confirmed')}
                      disabled={pendingRowId === entry.teamId}
                      className="bg-green-500 text-black hover:bg-green-400"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditor(entry, 'declined')}
                      disabled={pendingRowId === entry.teamId}
                      className="border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Not Returning
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {overview && overview.campaigns.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-300">
              Recent Campaigns
            </h3>
          </div>
          <div className="space-y-3">
            {overview.campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-white">{campaign.subject}</div>
                  <div className="text-xs text-neutral-500">
                    {campaign.team_count} teams • {campaign.sent_count}/{campaign.recipient_count} sent • {formatDate(campaign.created_at)}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-sm text-cyan-300">
                  {campaign.campaign_type.replace(/_/g, ' ')}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Send return campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-neutral-300">
              Sending to {composeTeamIds.length} team{composeTeamIds.length === 1 ? '' : 's'} for{' '}
              <span className="font-semibold text-white">{targetSeasonName}</span>.
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Subject</label>
              <Input
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                className="border-white/10 bg-neutral-900 text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Message</label>
              <Textarea
                rows={8}
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
                className="border-white/10 bg-neutral-900 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setComposeOpen(false)}
              className="border-white/10 bg-transparent text-neutral-200 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendCampaign()}
              disabled={isSending || composeSubject.trim().length === 0 || composeBody.trim().length === 0}
              className="bg-cyan-500 text-black hover:bg-cyan-400"
            >
              {isSending ? 'Sending…' : 'Send campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editorEntry)} onOpenChange={(open) => {
        if (!open) {
          closeEditor();
        }
      }}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editorStatus === 'declined' ? 'Mark team as not returning' : 'Edit return notes'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-neutral-300">
              Updating <span className="font-semibold text-white">{editorEntry?.teamName}</span> for{' '}
              <span className="font-semibold text-white">{targetSeasonName}</span>.
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Shared note</label>
              <Textarea
                value={editorNotes}
                onChange={(event) => setEditorNotes(event.target.value)}
                rows={3}
                placeholder="Visible context for league staff reviewing returning players or captain follow-up."
                className="border-white/10 bg-neutral-900 text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Internal note</label>
              <Textarea
                value={editorInternalNotes}
                onChange={(event) => setEditorInternalNotes(event.target.value)}
                rows={3}
                placeholder="Internal context for owners and admins."
                className="border-white/10 bg-neutral-900 text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">
                Decline reason
              </label>
              <Textarea
                value={editorDeclinedReason}
                onChange={(event) => setEditorDeclinedReason(event.target.value)}
                rows={editorStatus === 'declined' ? 3 : 2}
                placeholder={
                  editorStatus === 'declined'
                    ? 'Why is this team not returning?'
                    : 'Optional. Keep a specific decline reason on file if this team already responded.'
                }
                className="border-white/10 bg-neutral-900 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditor}
              className="border-white/10 bg-transparent text-neutral-200 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveEditor()}
              disabled={isSavingEditor}
              className={editorStatus === 'declined' ? 'bg-red-500 text-black hover:bg-red-400' : 'bg-cyan-500 text-black hover:bg-cyan-400'}
            >
              {isSavingEditor
                ? 'Saving...'
                : editorStatus === 'declined'
                  ? 'Save and mark not returning'
                  : 'Save notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
