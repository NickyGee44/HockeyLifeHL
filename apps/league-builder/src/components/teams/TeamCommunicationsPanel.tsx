'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  getLeaguePlayerContactsByTeam,
  sendLeaguePlayerEmailBlast,
  type TeamContactGroup,
} from '@/lib/actions/teams';

interface TeamCommunicationsPanelProps {
  leagueId: string;
  leagueName: string;
  teams: Array<{ id: string; name: string }>;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

type BlastPriority = (typeof PRIORITY_OPTIONS)[number]['value'];

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function buildContactsCsv(groups: TeamContactGroup[]): string {
  const lines = ['Team,Player Name,Email,Phone'];

  for (const group of groups) {
    for (const player of group.players) {
      lines.push([
        csvCell(group.teamName),
        csvCell(player.playerName),
        csvCell(player.email || ''),
        csvCell(player.phone || ''),
      ].join(','));
    }
  }

  return lines.join('\n');
}

function downloadCsvFile(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugifyFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function TeamCommunicationsPanel({
  leagueId,
  leagueName,
  teams,
}: TeamCommunicationsPanelProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBlastDialog, setShowBlastDialog] = useState(false);
  const [exportScope, setExportScope] = useState<string>('all');
  const [blastScope, setBlastScope] = useState<string>('all');
  const [blastSubject, setBlastSubject] = useState('');
  const [blastMessage, setBlastMessage] = useState('');
  const [blastPriority, setBlastPriority] = useState<BlastPriority>('normal');
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingBlast, setIsSendingBlast] = useState(false);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      const result = await getLeaguePlayerContactsByTeam(
        leagueId,
        exportScope === 'all' ? undefined : exportScope
      );

      if (!result.success || !result.groups) {
        toast.error(result.error || 'Failed to export contacts');
        return;
      }

      const totalRows = result.groups.reduce((sum, group) => sum + group.players.length, 0);
      if (totalRows === 0) {
        toast.info('No active roster contacts found for this selection');
        return;
      }

      const csv = buildContactsCsv(result.groups);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const selectedTeam = sortedTeams.find((team) => team.id === exportScope);
      const scopeName = selectedTeam?.name || leagueName;
      const fileName = `${slugifyFilePart(scopeName) || 'contacts'}-${dateStamp}.csv`;

      downloadCsvFile(csv, fileName);
      toast.success(`Exported ${totalRows} contact${totalRows === 1 ? '' : 's'}`);
      setShowExportDialog(false);
    } catch {
      toast.error('Unexpected error exporting contacts');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendBlast = async () => {
    if (!blastSubject.trim() || !blastMessage.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setIsSendingBlast(true);
    try {
      const result = await sendLeaguePlayerEmailBlast({
        leagueId,
        subject: blastSubject.trim(),
        content: blastMessage.trim(),
        scope: blastScope === 'all' ? 'league' : 'team',
        teamId: blastScope === 'all' ? undefined : blastScope,
        priority: blastPriority,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to send email blast');
        return;
      }

      toast.success(
        `Blast sent: ${result.sent} sent${result.failed ? `, ${result.failed} failed` : ''}`
      );

      setBlastSubject('');
      setBlastMessage('');
      setBlastPriority('normal');
      setBlastScope('all');
      setShowBlastDialog(false);
    } catch {
      toast.error('Unexpected error sending email blast');
    } finally {
      setIsSendingBlast(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowExportDialog(true)}
          className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Contacts
        </Button>
        <Button
          type="button"
          onClick={() => setShowBlastDialog(true)}
          className="bg-rink-500 text-black hover:bg-rink-600"
        >
          <Mail className="mr-2 h-4 w-4" />
          Email Blast
        </Button>
      </div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-lg bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Export Team Contacts</DialogTitle>
            <DialogDescription>
              Download player emails and phone numbers grouped by team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-neutral-300">Scope</label>
            <select
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            >
              <option value="all">Full league (all teams)</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExportContacts}
              disabled={isExporting}
              className="bg-rink-500 text-black hover:bg-rink-600"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlastDialog} onOpenChange={setShowBlastDialog}>
        <DialogContent className="sm:max-w-xl bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Send Email Blast</DialogTitle>
            <DialogDescription>
              Send a message to all active players in a team or across the full league.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Audience</label>
                <select
                  value={blastScope}
                  onChange={(event) => setBlastScope(event.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
                >
                  <option value="all">Full league (all teams)</option>
                  {sortedTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Priority</label>
                <select
                  value={blastPriority}
                  onChange={(event) => setBlastPriority(event.target.value as BlastPriority)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-300">Subject</label>
              <input
                value={blastSubject}
                onChange={(event) => setBlastSubject(event.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500"
                placeholder="Upcoming games, schedule update, league announcement..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-300">Message</label>
              <textarea
                value={blastMessage}
                onChange={(event) => setBlastMessage(event.target.value)}
                rows={8}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500"
                placeholder="Write your message to players..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowBlastDialog(false)}
              disabled={isSendingBlast}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendBlast}
              disabled={isSendingBlast}
              className="bg-rink-500 text-black hover:bg-rink-600"
            >
              {isSendingBlast ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Blast
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
