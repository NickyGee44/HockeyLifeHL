'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Users,
  Mail,
  User,
  Shield,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  UserPlus,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  updatePlayerJerseyNumber,
  updatePlayerPosition,
  removePlayerFromRoster,
  approveJoinRequest,
  rejectJoinRequest,
  type RosterPlayer,
  type JoinRequest,
} from '@/lib/actions/captain-roster';
import { updatePlayerType } from '@/lib/actions/sub-invitations';

const POSITIONS = ['Forward', 'Defense', 'Goalie'] as const;

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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
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
                #
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Role
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
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
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
  const [editingField, setEditingField] = useState<'jersey' | 'position' | 'player_type' | null>(null);
  const [jerseyValue, setJerseyValue] = useState(
    player.jersey_number?.toString() ?? ''
  );
  const [positionValue, setPositionValue] = useState(player.position ?? '');
  const [playerTypeValue, setPlayerTypeValue] = useState<'regular' | 'sub' | 'part_time'>(player.player_type ?? 'regular');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
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

  const handleSavePlayerType = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlayerType(
        teamId,
        player.id,
        playerTypeValue as 'regular' | 'sub' | 'part_time'
      );
      if (result.success) {
        setEditingField(null);
        onUpdate();
      } else {
        setError(result.error || 'Failed to update');
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
    setPlayerTypeValue(player.player_type ?? 'regular');
    setError(null);
  };

  return (
    <>
      <tr className="hover:bg-[var(--color-surface-hover)] transition-colors">
        {/* Player name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src={player.profile?.avatar_url || '/blank_player.png'}
              alt={name}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <span className="font-medium text-[var(--color-text-primary)]">{name}</span>
          </div>
        </td>

        {/* Jersey number */}
        <td className="px-4 py-3 text-center">
          {editingField === 'jersey' ? (
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                min="0"
                max="99"
                value={jerseyValue}
                onChange={(e) => setJerseyValue(e.target.value)}
                className="w-14 px-2 py-1 text-center text-sm bg-[var(--color-surface-hover)] border border-[var(--league-primary)] rounded text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveJersey();
                  if (e.key === 'Escape') cancelEdit();
                }}
                disabled={isPending}
              />
              <button
                onClick={handleSaveJersey}
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
              onClick={() => setEditingField('jersey')}
              className="group inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Edit jersey number"
            >
              <span className="font-mono font-bold text-[var(--color-text-primary)]">
                {player.jersey_number ?? '-'}
              </span>
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
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
                {player.position || '-'}
              </span>
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </td>

        {/* Player Type */}
        <td className="px-4 py-3 text-center">
          {editingField === 'player_type' ? (
            <div className="flex items-center justify-center gap-1">
              <select
                value={playerTypeValue}
                onChange={(e) => setPlayerTypeValue(e.target.value as 'regular' | 'sub' | 'part_time')}
                className="px-2 py-1 text-sm bg-[var(--color-surface-hover)] border border-[var(--league-primary)] rounded text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
                disabled={isPending}
              >
                <option value="regular">Regular</option>
                <option value="sub">Sub</option>
                <option value="part_time">Part Time</option>
              </select>
              <button
                onClick={handleSavePlayerType}
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
              onClick={() => setEditingField('player_type')}
              className="group inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Edit player type"
            >
              <PlayerTypeBadge type={player.player_type} />
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </td>

        {/* Email */}
        <td className="px-4 py-3">
          {player.profile?.email ? (
            <a
              href={`mailto:${player.profile.email}`}
              className="text-[var(--league-primary)] hover:underline flex items-center gap-1 text-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              {player.profile.email}
            </a>
          ) : (
            <span className="text-[var(--color-text-muted)]">-</span>
          )}
        </td>

        {/* Role */}
        <td className="px-4 py-3 text-center">
          {player.leadership_role === 'captain' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
              <Shield className="w-3 h-3" />
              Captain
            </span>
          ) : player.leadership_role === 'alternate_captain' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400/80 rounded text-xs font-medium">
              <Shield className="w-3 h-3" />
              Alternate
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">Player</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-center">
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
          )}
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={7} className="px-4 py-2">
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

function PlayerTypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'sub':
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
          Sub
        </span>
      );
    case 'part_time':
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
          Part Time
        </span>
      );
    default:
      return (
        <span className="text-[var(--color-text-muted)] text-xs">
          Regular
        </span>
      );
  }
}
