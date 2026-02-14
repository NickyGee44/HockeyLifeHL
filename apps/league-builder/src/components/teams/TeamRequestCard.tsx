'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@hockey-life/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  Mail,
  Phone,
  Clock,
  MessageSquare,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TeamRegistrationRequestWithDetails } from '@/lib/actions/team-registration-requests';

interface TeamRequestCardProps {
  request: TeamRegistrationRequestWithDetails;
  onApprove: (request: TeamRegistrationRequestWithDetails) => void;
  onDeny: (request: TeamRegistrationRequestWithDetails) => void;
  isProcessing?: boolean;
}

export function TeamRequestCard({
  request,
  onApprove,
  onDeny,
  isProcessing = false }: TeamRequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    approved: 'bg-green-500/10 text-green-500 border-green-500/30',
    denied: 'bg-red-500/10 text-red-500 border-red-500/30' };

  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    denied: 'Denied' };

  const requester = request.requester as { id: string; full_name: string; email: string; avatar_url: string | null } | undefined;
  const requestedDivision = request.requested_division as { id: string; name: string } | null | undefined;

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl overflow-hidden hover:border-white/20 transition-colors">
      {/* Team Color Bar */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(to right, ${request.team_primary_color || '#22D3EE'}, ${request.team_secondary_color || '#070A0F'})` }}
      />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Team Logo/Avatar */}
            {request.team_logo_url ? (
              <Image
                src={request.team_logo_url}
                alt={request.team_name}
                className="w-12 h-12 rounded-xl object-cover"
                width={48}
                height={48}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: request.team_primary_color || '#22D3EE' }}
              >
                {request.team_short_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">
                {request.team_name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">{request.team_short_name}</span>
                {requestedDivision && (
                  <>
                    <span className="text-neutral-600">-</span>
                    <span className="text-xs text-rink-500">{requestedDivision.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                'border',
                statusColors[request.status] || statusColors.pending
              )}
            >
              {statusLabels[request.status] || 'Unknown'}
            </Badge>
          </div>
        </div>

        {/* Requester Info */}
        <div className="flex items-center gap-2 mb-4 text-sm text-neutral-400">
          <User className="w-4 h-4" />
          <span>Requested by</span>
          <span className="text-white font-medium">{requester?.full_name || 'Unknown'}</span>
          <span className="text-neutral-500">-</span>
          <a
            href={`mailto:${requester?.email}`}
            className="text-rink-500 hover:text-rink-400 transition-colors"
          >
            {requester?.email}
          </a>
        </div>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {request.team_contact_email && (
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Mail className="w-4 h-4" />
              <a
                href={`mailto:${request.team_contact_email}`}
                className="hover:text-white transition-colors"
              >
                {request.team_contact_email}
              </a>
            </div>
          )}
          {request.team_contact_phone && (
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Phone className="w-4 h-4" />
              <span>{request.team_contact_phone}</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Submitted {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
          </span>
        </div>

        {/* Message Preview / Expandable */}
        {(request.message || request.preferred_division_notes) && (
          <div className="mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message from requester</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-3">
                {request.message && (
                  <div className="bg-neutral-900/50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">Message</p>
                    <p className="text-sm text-neutral-300 italic">&quot;{request.message}&quot;</p>
                  </div>
                )}
                {request.preferred_division_notes && (
                  <div className="bg-neutral-900/50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">Division Preference Notes</p>
                    <p className="text-sm text-neutral-300">{request.preferred_division_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {request.status === 'pending' && (
          <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
            <Button
              onClick={() => onApprove(request)}
              disabled={isProcessing}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2',
                'bg-green-500/10 text-green-500 border border-green-500/30',
                'hover:bg-green-500/20 transition-colors'
              )}
            >
              <Check className="w-4 h-4" />
              Approve
            </Button>
            <Button
              onClick={() => onDeny(request)}
              disabled={isProcessing}
              variant="outline"
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2',
                'bg-red-500/10 text-red-500 border border-red-500/30',
                'hover:bg-red-500/20 transition-colors'
              )}
            >
              <X className="w-4 h-4" />
              Deny
            </Button>
          </div>
        )}

        {/* Show denial reason if denied */}
        {request.status === 'denied' && request.denial_reason && (
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <p className="text-xs text-red-400 mb-1">Denial Reason</p>
              <p className="text-sm text-neutral-300">{request.denial_reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamRequestCard;
