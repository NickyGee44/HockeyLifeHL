'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import {
  UserPlus,
  Check,
  X,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getTeamJoinRequests, approveJoinRequest, rejectJoinRequest } from '@/lib/actions/captain';
import type { TeamJoinRequest } from '@/lib/actions/captain';

interface JoinRequestsManagerProps {
  teamId: string;
}

export default function JoinRequestsManager({ teamId }: JoinRequestsManagerProps) {
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [jerseyNumbers, setJerseyNumbers] = useState<Record<string, number>>({});

  useEffect(() => {
    loadRequests();
  }, [teamId, filter]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    const result = await getTeamJoinRequests(teamId, filter);
    if (result.error) {
      setError(result.error);
    } else {
      setRequests((result.data || []) as unknown as TeamJoinRequest[]);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    setError(null);

    const jerseyNumber = jerseyNumbers[requestId];
    const result = await approveJoinRequest(requestId, jerseyNumber);

    if (result.error) {
      setError(result.error);
    } else {
      // Remove from pending list
      setRequests(requests.filter(r => r.id !== requestId));
      // Clear jersey number input
      const newJerseyNumbers = { ...jerseyNumbers };
      delete newJerseyNumbers[requestId];
      setJerseyNumbers(newJerseyNumbers);
    }

    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    setError(null);

    const result = await rejectJoinRequest(requestId);

    if (result.error) {
      setError(result.error);
    } else {
      // Remove from pending list
      setRequests(requests.filter(r => r.id !== requestId));
    }

    setProcessingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-rink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'pending'
              ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'approved'
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'rejected'
              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
        >
          Rejected
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            No {filter} requests
          </h3>
          <p className="text-neutral-400">
            {filter === 'pending'
              ? 'Join requests will appear here when players want to join your team.'
              : `No ${filter} requests to show.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Player Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {request.player?.full_name || 'Unknown Player'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-400">
                      {request.player?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{request.player.email}</span>
                        </div>
                      )}
                      {request.player?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{request.player.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(request.requested_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-900/50">
                      <MessageSquare className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-neutral-300">{request.message}</p>
                    </div>
                  )}

                  {/* Reviewed Info */}
                  {request.status !== 'pending' && request.reviewed_at && (
                    <div className="text-xs text-neutral-500">
                      {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                      {formatDate(request.reviewed_at)}
                    </div>
                  )}
                </div>

                {/* Actions (only for pending) */}
                {request.status === 'pending' && (
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    {/* Jersey Number Input */}
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">
                        Jersey # (optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        placeholder="00"
                        value={jerseyNumbers[request.id] || ''}
                        onChange={(e) =>
                          setJerseyNumbers({
                            ...jerseyNumbers,
                            [request.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-rink-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
                          processingId === request.id
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20'
                        )}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
                          processingId === request.id
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                        )}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Badge (for approved/rejected) */}
                {request.status !== 'pending' && (
                  <div
                    className={cn(
                      'px-4 py-2 rounded-lg font-semibold text-sm',
                      request.status === 'approved'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    )}
                  >
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
