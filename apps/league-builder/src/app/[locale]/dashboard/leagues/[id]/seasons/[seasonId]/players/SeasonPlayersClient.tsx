'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  Users,
  Mail,
  DollarSign,
  ArrowRightLeft,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  UserCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markPaymentAsPaid } from '@/lib/payments/payment-actions';

interface SeasonPlayer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  teamId: string | null;
  teamName: string;
  teamShortName: string;
  jerseyNumber: number | null;
  position: string | null;
  rosterStatus: string | null;
  paymentStatus: string;
  amountCents: number;
  amountPaidCents: number;
  paymentMethod: string | null;
  feeName: string;
  paymentId: string | null;
}

interface Team {
  id: string;
  name: string;
  shortName: string | null;
}

interface SeasonPlayersClientProps {
  locale: string;
  leagueId: string;
  seasonId: string;
  leagueName: string;
  seasonName: string;
  players: SeasonPlayer[];
  teams: Team[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  paid: { label: 'Paid', icon: CheckCircle, className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  partial: { label: 'Partial', icon: Clock, className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  overdue: { label: 'Overdue', icon: AlertCircle, className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  waived: { label: 'Waived', icon: XCircle, className: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
  refunded: { label: 'Refunded', icon: XCircle, className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  none: { label: 'No Fee', icon: XCircle, className: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20' },
};

export function SeasonPlayersClient({
  locale,
  leagueId,
  seasonId,
  leagueName,
  seasonName,
  players,
  teams,
}: SeasonPlayersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [markPaidDialog, setMarkPaidDialog] = useState<{ open: boolean; player: SeasonPlayer | null }>({
    open: false,
    player: null,
  });
  const [processing, setProcessing] = useState(false);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesEmail = p.email.toLowerCase().includes(q);
        const matchesTeam = p.teamName.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesTeam) return false;
      }
      // Team filter
      if (teamFilter !== 'all') {
        if (teamFilter === 'unassigned' && p.teamId) return false;
        if (teamFilter !== 'unassigned' && p.teamId !== teamFilter) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && p.paymentStatus !== statusFilter) return false;
      return true;
    });
  }, [players, searchQuery, teamFilter, statusFilter]);

  // Stats
  const totalPlayers = players.length;
  const paidCount = players.filter((p) => p.paymentStatus === 'paid').length;
  const pendingCount = players.filter((p) => ['pending', 'overdue'].includes(p.paymentStatus)).length;
  const unassignedCount = players.filter((p) => !p.teamId).length;

  async function handleMarkAsPaid(player: SeasonPlayer) {
    if (!player.paymentId) {
      toast.error('No payment record exists for this player');
      return;
    }
    setProcessing(true);
    try {
      const result = await markPaymentAsPaid(player.paymentId);
      if (result.success) {
        toast.success(`Payment marked as paid for ${player.fullName}`);
        setMarkPaidDialog({ open: false, player: null });
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to mark payment as paid');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  }

  function handleEmailPlayer(player: SeasonPlayer) {
    if (player.email) {
      window.open(`mailto:${player.email}`, '_blank');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rink-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-rink-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Season Players</h1>
                <p className="text-neutral-400 text-sm">
                  {seasonName} &middot; {leagueName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-rink-400" />
              <span className="text-xs text-neutral-400">Total Players</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalPlayers}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-400">Paid</span>
            </div>
            <p className="text-2xl font-bold text-white">{paidCount}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-neutral-400">Pending / Overdue</span>
            </div>
            <p className="text-2xl font-bold text-white">{pendingCount}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-neutral-400">Unassigned</span>
            </div>
            <p className="text-2xl font-bold text-white">{unassignedCount}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by name, email, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[180px] bg-white/[0.04] border-white/10 text-white text-sm">
                <Filter className="w-3.5 h-3.5 mr-2 text-neutral-400" />
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10">
                <SelectItem value="all" className="text-white">All Teams</SelectItem>
                <SelectItem value="unassigned" className="text-white">Unassigned</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} className="text-white">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white/[0.04] border-white/10 text-white text-sm">
                <DollarSign className="w-3.5 h-3.5 mr-2 text-neutral-400" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10">
                <SelectItem value="all" className="text-white">All Statuses</SelectItem>
                <SelectItem value="paid" className="text-white">Paid</SelectItem>
                <SelectItem value="partial" className="text-white">Partial</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
                <SelectItem value="overdue" className="text-white">Overdue</SelectItem>
                <SelectItem value="waived" className="text-white">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-neutral-500">
          Showing {filteredPlayers.length} of {totalPlayers} players
        </p>

        {/* Players Table */}
        {filteredPlayers.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 font-medium">No players found</p>
            <p className="text-sm text-neutral-500 mt-1">
              {searchQuery || teamFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No players have been registered for this season yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Pos
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPlayers.map((player) => {
                    const statusConfig = PAYMENT_STATUS_CONFIG[player.paymentStatus] ?? PAYMENT_STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const balance = player.amountCents - player.amountPaidCents;
                    return (
                      <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rink-500/10 flex items-center justify-center shrink-0">
                              {player.avatarUrl ? (
                                <img
                                  src={player.avatarUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <UserCircle className="w-5 h-5 text-rink-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{player.fullName}</p>
                              <p className="text-xs text-neutral-500 truncate">{player.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${player.teamId ? 'text-neutral-300' : 'text-amber-400 italic'}`}>
                            {player.teamId ? player.teamName : 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-neutral-400">
                            {player.jerseyNumber ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-neutral-400 uppercase">
                            {player.position ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm text-neutral-300">{player.amountCents ? formatCurrency(player.amountCents) : '—'}</p>
                          <p className="text-xs text-neutral-500">{player.feeName}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm text-neutral-300">{player.amountPaidCents ? formatCurrency(player.amountPaidCents) : '—'}</p>
                          {balance > 0 && player.amountCents > 0 && (
                            <p className="text-xs text-amber-400">
                              {formatCurrency(balance)} owing
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.className}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 w-52">
                              <DropdownMenuItem
                                onClick={() => handleEmailPlayer(player)}
                                className="text-neutral-300 focus:text-white focus:bg-white/10"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Email Player
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              {player.paymentId && player.paymentStatus !== 'paid' && player.paymentStatus !== 'waived' && player.paymentStatus !== 'none' && (
                                <DropdownMenuItem
                                  onClick={() => setMarkPaidDialog({ open: true, player })}
                                  className="text-neutral-300 focus:text-white focus:bg-white/10"
                                >
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  router.push(
                                    `/${locale}/dashboard/leagues/${leagueId}/payments?season=${seasonId}`
                                  );
                                }}
                                className="text-neutral-300 focus:text-white focus:bg-white/10"
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                View Payment Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                disabled
                                className="text-neutral-500"
                              >
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Switch Team (coming soon)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog
        open={markPaidDialog.open}
        onOpenChange={(open) => {
          if (!open) setMarkPaidDialog({ open: false, player: null });
        }}
      >
        <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription className="text-neutral-400">
              This will mark {markPaidDialog.player?.fullName}&apos;s payment as fully paid.
            </DialogDescription>
          </DialogHeader>

          {markPaidDialog.player && (
            <div className="space-y-3">
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Player</p>
                    <p className="text-white font-medium">{markPaidDialog.player.fullName}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Fee</p>
                    <p className="text-white">{markPaidDialog.player.feeName}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Total Amount</p>
                    <p className="text-white">{formatCurrency(markPaidDialog.player.amountCents)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Already Paid</p>
                    <p className="text-white">{formatCurrency(markPaidDialog.player.amountPaidCents)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidDialog({ open: false, player: null })}
              className="border-white/10 text-neutral-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => markPaidDialog.player && handleMarkAsPaid(markPaidDialog.player)}
              disabled={processing}
              className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold"
            >
              {processing ? 'Processing...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
