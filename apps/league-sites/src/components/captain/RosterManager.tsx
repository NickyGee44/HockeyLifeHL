'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { resolvePlayerPhotoUrl } from '@/lib/player-photo';
import {
  Users,
  Mail,
  User,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  UserPlus,
  Clock,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import {
  updatePlayerJerseyNumber,
  updatePlayerPosition,
  updateRosterPlayerDetails,
  removePlayerFromRoster,
  approveJoinRequest,
  rejectJoinRequest,
  type RosterPlayer,
  type JoinRequest,
} from '@/lib/actions/captain-roster';

const POSITIONS = ['Forward', 'Defense', 'Goalie'] as const;

function shortPosition(position: string | null | undefined) {
  const normalized = (position || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized.startsWith('g')) return 'G';
  if (normalized.startsWith('d')) return 'D';
  if (normalized.startsWith('f')) return 'F';
  return normalized.charAt(0).toUpperCase();
}

interface RosterManagerProps {
  teamId: string;
  roster: RosterPlayer[];
  joinRequests: JoinRequest[];
  onRosterUpdate: () => void;
}

export function RosterManager({
  teamId,
  roster,
  joinRequests,
  onRosterUpdate,
}: RosterManagerProps) {
  return (
    <div className="space-y-6">
      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <JoinRequestsSection
          teamId={teamId}
          requests={joinRequests}
          onUpdate={onRosterUpdate}
        />
      )}

      {/* Editable Roster Table */}
      <RosterTable
        teamId={teamId}
        roster={roster}
        onUpdate={onRosterUpdate}
      />
    </div>
  );
}

// --- Join Requests Section ---

function JoinRequestsSection({
  teamId,
  requests,
  onUpdate,
}: {
  teamId: string;
  requests: JoinRequest[];
  onUpdate: () => void;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-amber-500/30 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] bg-amber-500/5">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-400" />
          Join Requests
          <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
            {requests.length}
          </span>
        </h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {requests.map((request) => (
          <JoinRequestRow
            key={request.id}
            teamId={teamId}
            request={request}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function JoinRequestRow({
  teamId,
  request,
  onUpdate,
}: {
  teamId: string;
  request: JoinRequest;
  onUpdate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [jerseyInput, setJerseyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const jerseyNumber = jerseyInput ? parseInt(jerseyInput, 10) : undefined;
      const result = await approveJoinRequest(teamId, request.id, jerseyNumber);
      if (result.success) {
        onUpdate();
      } else {
        setError(result.error || 'Failed to approve');
      }
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectJoinRequest(teamId, request.id);
      if (result.success) {
        onUpdate();
      } else {
        setError(result.error || 'Failed to reject');
      }
    });
  };

  const requestDate = new Date(request.requested_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <User className="w-5 h-5 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text-primary)]">
            {request.player?.full_name || 'Unknown Player'}
          </p>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
            {request.player?.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {request.player.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {requestDate}
            </span>
          </div>
          {request.message && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)] italic">
              &quot;{request.message}&quot;
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="99"
            placeholder="#"
            value={jerseyInput}
            onChange={(e) => setJerseyInput(e.target.value)}
            className="w-14 px-2 py-1.5 text-center text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            disabled={isPending}
          />

          <button
            onClick={handleApprove}
            disabled={isPending}
            className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
            title="Approve"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleReject}
            disabled={isPending}
            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Reject"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// --- Editable Roster Table ---

function RosterTable({
  teamId,
  roster,
  onUpdate,
}: {
  teamId: string;
  roster: RosterPlayer[];
  onUpdate: () => void;
}) {
  return (
    <div className="glass-card-strong rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--league-primary)]" />
          Team Roster
        </h2>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {roster.length} players
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-hover)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {roster.map((player) => (
              <EditableRosterRow
                key={player.id}
                teamId={teamId}
                player={player}
                onUpdate={onUpdate}
              />
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  No players on the roster yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableRosterRow({
  teamId,
  player,
  onUpdate,
}: {
  teamId: string;
  player: RosterPlayer;
  onUpdate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingField, setEditingField] = useState<'jersey' | 'position' | 'details' | null>(null);
  const [jerseyValue, setJerseyValue] = useState(
    player.jersey_number?.toString() ?? ''
  );
  const [positionValue, setPositionValue] = useState(player.position ?? '');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [detailName, setDetailName] = useState(player.profile?.full_name ?? '');
  const [detailEmail, setDetailEmail] = useState(player.profile?.email ?? '');
  const [detailPhone, setDetailPhone] = useState(player.profile?.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const name = player.profile?.full_name || 'Unknown Player';
  const hasLeadershipRole = !!player.leadership_role;

  const handleSaveJersey = () => {
    setError(null);
    startTransition(async () => {
      const num = jerseyValue ? parseInt(jerseyValue, 10) : null;
      const result = await updatePlayerJerseyNumber(teamId, player.id, num);
      if (result.success) {
        setEditingField(null);
        onUpdate();
      } else {
        setError(result.error || 'Failed to update');
      }
    });
  };

  const handleSavePosition = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayerPosition(
        teamId,
        player.id,
        positionValue || null
      );
      if (result.success) {
        setEditingField(null);
        onUpdate();
      } else {
        setError(result.error || 'Failed to update');
      }
    });
  };

  const handleSaveDetails = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateRosterPlayerDetails(teamId, player.id, {
        full_name: detailName,
        email: detailEmail || null,
        phone: detailPhone || null,
      });
      if (result.success) {
        setEditingField(null);
        onUpdate();
      } else {
        setError(result.error || 'Failed to update details');
      }
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removePlayerFromRoster(teamId, player.id);
      if (result.success) {
        onUpdate();
      } else {
        setError(result.error || 'Failed to remove');
        setShowRemoveConfirm(false);
      }
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setJerseyValue(player.jersey_number?.toString() ?? '');
    setPositionValue(player.position ?? '');
    setDetailName(player.profile?.full_name ?? '');
    setDetailEmail(player.profile?.email ?? '');
    setDetailPhone(player.profile?.phone ?? '');
    setError(null);
  };

  return (
    <>
      <tr className="hover:bg-[var(--color-surface-hover)] transition-colors">
        {/* Player name */}
        <td className="px-4 py-3">
          {editingField === 'details' ? (
            <div className="space-y-2">
              <input
                value={detailName}
                onChange={(e) => setDetailName(e.target.value)}
                className="w-full rounded-lg border border-[var(--league-primary)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
                placeholder="Full name"
                autoFocus
                disabled={isPending}
              />
              <input
                value={detailEmail}
                onChange={(e) => setDetailEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--league-primary)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
                placeholder="Email"
                disabled={isPending}
              />
              <input
                value={detailPhone}
                onChange={(e) => setDetailPhone(e.target.value)}
                className="w-full rounded-lg border border-[var(--league-primary)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
                placeholder="Phone"
                disabled={isPending}
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveDetails}
                  disabled={isPending}
                  className="p-1 text-green-400 hover:bg-green-500/10 rounded"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0">
                <Image
                  src={resolvePlayerPhotoUrl(player.profile) || '/blank_player.png'}
                  alt={name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <button
                  onClick={() => setEditingField('jersey')}
                  className="absolute -bottom-1 -right-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[var(--league-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent-text)] shadow"
                  title="Edit jersey number"
                >
                  {player.jersey_number ?? '-'}
                </button>
              </div>
              <div className="min-w-0">
                <span className="font-medium text-[var(--color-text-primary)]">{name}</span>
                {player.leadership_role === 'captain' ? (
                  <span className="ml-2 inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                    C
                  </span>
                ) : player.leadership_role === 'alternate_captain' ? (
                  <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300/90">
                    A
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </td>

        {/* Position */}
        <td className="px-4 py-3 text-center">
          {editingField === 'position' ? (
            <div className="flex items-center justify-center gap-1">
              <select
                value={positionValue}
                onChange={(e) => setPositionValue(e.target.value)}
                className="px-2 py-1 text-sm bg-[var(--color-surface-hover)] border border-[var(--league-primary)] rounded text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
                disabled={isPending}
              >
                <option value="">None</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSavePosition}
                disabled={isPending}
                className="p-1 text-green-400 hover:bg-green-500/10 rounded"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingField('position')}
              className="group inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Edit position"
            >
              <span className="text-[var(--color-text-secondary)]">
                {shortPosition(player.position)}
              </span>
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
            </button>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          {showRemoveConfirm ? (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                {player.profile?.email ? (
                  <a
                    href={`mailto:${player.profile.email}`}
                    className="inline-flex items-center gap-1 text-sm hover:text-[var(--league-primary)]"
                    title={`Email ${name}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{player.profile.email}</span>
                  </a>
                ) : null}
                {player.profile?.phone ? (
                  <a
                    href={`tel:${player.profile.phone}`}
                    className="inline-flex items-center gap-1 text-sm hover:text-[var(--league-primary)]"
                    title={`Call ${name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{player.profile.phone}</span>
                  </a>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingField('details')}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                  title="Edit player details"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={hasLeadershipRole}
                  className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={
                    hasLeadershipRole
                      ? 'Cannot remove captains or alternates'
                      : 'Remove from roster'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={3} className="px-4 py-2">
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
