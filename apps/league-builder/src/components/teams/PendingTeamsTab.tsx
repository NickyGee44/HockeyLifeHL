'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@hockey-life/ui';
import { Clock, Users, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamRequestCard } from './TeamRequestCard';
import { TeamApprovalModal } from './TeamApprovalModal';
import { TeamDenialModal } from './TeamDenialModal';
import {
  getTeamRegistrationRequests,
  approveTeamRegistrationRequest,
  denyTeamRegistrationRequest,
  type TeamRegistrationRequestWithDetails,
} from '@/lib/actions/team-registration-requests';
import { getLeagueDivisions } from '@/lib/actions/teams';
import {
  sendTeamRequestApprovedEmail,
  sendTeamRequestDeniedEmail,
} from '@/lib/email/team-request-emails';

interface Division {
  id: string;
  name: string;
}

interface PendingTeamsTabProps {
  leagueId: string;
  leagueName: string;
  initialRequests?: TeamRegistrationRequestWithDetails[];
  initialDivisions?: Division[];
}

export function PendingTeamsTab({
  leagueId,
  leagueName,
  initialRequests = [],
  initialDivisions = [],
}: PendingTeamsTabProps) {
  const [requests, setRequests] = useState<TeamRegistrationRequestWithDetails[]>(initialRequests);
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<TeamRegistrationRequestWithDetails | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDenialModalOpen, setIsDenialModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter only pending requests
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [requestsResult, divisionsResult] = await Promise.all([
        getTeamRegistrationRequests(leagueId),
        getLeagueDivisions(leagueId),
      ]);

      if (requestsResult.success && requestsResult.data) {
        setRequests(requestsResult.data as unknown as TeamRegistrationRequestWithDetails[]);
      } else {
        setError(requestsResult.error || 'Failed to fetch requests');
      }

      if (divisionsResult.success && divisionsResult.data) {
        setDivisions(divisionsResult.data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [leagueId]);

  // Initial fetch if no initial data
  useEffect(() => {
    if (initialRequests.length === 0) {
      fetchRequests();
    }
  }, [initialRequests.length, fetchRequests]);

  // Handle approve
  const handleApprove = (request: TeamRegistrationRequestWithDetails) => {
    setSelectedRequest(request);
    setIsApprovalModalOpen(true);
  };

  const handleApproveConfirm = async (params: {
    requestId: string;
    assignedDivisionId?: string;
    adminNotes?: string;
  }) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await approveTeamRegistrationRequest(params);

      if (result.success && result.data) {
        // Send approval email
        const request = selectedRequest;
        if (request) {
          const requester = request.requester as any;
          const assignedDivision = divisions.find((d) => d.id === params.assignedDivisionId);

          await sendTeamRequestApprovedEmail({
            to: requester?.email || '',
            requesterName: requester?.full_name || 'Team Manager',
            leagueName,
            teamName: request.team_name,
            teamShortName: request.team_short_name,
            assignedDivision: assignedDivision?.name,
            approvedAt: new Date(),
            teamId: result.data.team.id,
          });
        }

        setSuccessMessage(`Team "${selectedRequest?.team_name}" has been approved and created!`);
        setIsApprovalModalOpen(false);
        setSelectedRequest(null);

        // Refresh requests
        await fetchRequests();

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Failed to approve request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deny
  const handleDeny = (request: TeamRegistrationRequestWithDetails) => {
    setSelectedRequest(request);
    setIsDenialModalOpen(true);
  };

  const handleDenyConfirm = async (params: {
    requestId: string;
    denialReason: string;
    adminNotes?: string;
  }) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await denyTeamRegistrationRequest(params);

      if (result.success) {
        // Send denial email
        const request = selectedRequest;
        if (request) {
          const requester = request.requester as any;

          await sendTeamRequestDeniedEmail({
            to: requester?.email || '',
            requesterName: requester?.full_name || 'Team Manager',
            leagueName,
            teamName: request.team_name,
            denialReason: params.denialReason,
            deniedAt: new Date(),
            canReapply: true,
            leagueId,
          });
        }

        setSuccessMessage(`Request for "${selectedRequest?.team_name}" has been denied.`);
        setIsDenialModalOpen(false);
        setSelectedRequest(null);

        // Refresh requests
        await fetchRequests();

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Failed to deny request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Pending Team Requests</h2>
            <p className="text-sm text-neutral-400">
              {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>

        <Button
          onClick={fetchRequests}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !requests.length && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-rink-500/30 border-t-rink-500 rounded-full animate-spin" />
            <p className="text-sm text-neutral-400">Loading requests...</p>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {!isLoading && pendingRequests.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingRequests.map((request) => (
            <TeamRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onDeny={handleDeny}
              isProcessing={isProcessing && selectedRequest?.id === request.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && pendingRequests.length === 0 && (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            There are no team registration requests awaiting review.
            New requests will appear here when teams apply to join the league.
          </p>
        </div>
      )}

      {/* Recently Processed (collapsed by default) */}
      {processedRequests.length > 0 && (
        <div className="mt-8">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400 hover:text-white transition-colors">
              <span>Recently Processed ({processedRequests.length})</span>
              <span className="text-xs text-neutral-500 group-open:hidden">Click to expand</span>
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {processedRequests.slice(0, 6).map((request) => (
                <TeamRequestCard
                  key={request.id}
                  request={request}
                  onApprove={() => {}}
                  onDeny={() => {}}
                />
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Approval Modal */}
      <TeamApprovalModal
        request={selectedRequest}
        divisions={divisions}
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={handleApproveConfirm}
        isProcessing={isProcessing}
      />

      {/* Denial Modal */}
      <TeamDenialModal
        request={selectedRequest}
        isOpen={isDenialModalOpen}
        onClose={() => {
          setIsDenialModalOpen(false);
          setSelectedRequest(null);
        }}
        onDeny={handleDenyConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default PendingTeamsTab;
